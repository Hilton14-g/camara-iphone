/**
 * Ultra-Resilient Live Photo Video Recorder
 * Compatible with iOS Safari, Chrome Android, Samsung Browser, and desktop.
 */

export class LivePhotoRecorder {
  constructor(stream) {
    this.stream = stream;
    this.isRecording = false;
  }

  updateStream(newStream) {
    this.stream = newStream;
  }

  /**
   * Captures a 1.5s video clip with bulletproof multi-codec fallback
   * @param {number} durationMs - 1500ms
   * @returns {Promise<Blob>}
   */
  captureLiveClip(durationMs = 1500) {
    return new Promise((resolve, reject) => {
      if (!this.stream || !this.stream.active) {
        return reject(new Error('No active video stream'));
      }

      // Candidate MIME types in priority order
      const candidateTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=h264',
        'video/webm'
      ];

      let recorder = null;

      // 1. Try candidates with full stream (audio + video)
      for (const mime of candidateTypes) {
        try {
          if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mime)) {
            recorder = new MediaRecorder(this.stream, {
              mimeType: mime,
              videoBitsPerSecond: 3000000
            });
            break;
          }
        } catch (e) {
          // Continue to next candidate
        }
      }

      // 2. If candidates failed, try browser default without explicit mimeType
      if (!recorder) {
        try {
          recorder = new MediaRecorder(this.stream);
        } catch (e) {
          console.warn('Default MediaRecorder with audio failed, falling back to video-only track', e);
        }
      }

      // 3. If stream with audio fails (common on some Android/Chrome builds with MP4), use video-only stream
      if (!recorder) {
        try {
          const videoTracks = this.stream.getVideoTracks();
          if (videoTracks.length > 0) {
            const videoOnlyStream = new MediaStream([videoTracks[0]]);
            recorder = new MediaRecorder(videoOnlyStream);
          }
        } catch (e) {
          console.error('Video-only MediaRecorder also failed', e);
        }
      }

      if (!recorder) {
        return reject(new Error('MediaRecorder could not be initialized on this browser'));
      }

      const chunks = [];
      this.isRecording = true;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        this.isRecording = false;
        const mime = recorder.mimeType || 'video/mp4';
        const videoBlob = new Blob(chunks, { type: mime });
        resolve(videoBlob);
      };

      recorder.onerror = (e) => {
        this.isRecording = false;
        reject(e.error || new Error('MediaRecorder runtime error'));
      };

      try {
        recorder.start(100);
      } catch (err) {
        this.isRecording = false;
        return reject(err);
      }

      setTimeout(() => {
        if (recorder.state === 'recording') {
          try {
            recorder.stop();
          } catch (e) {
            console.warn('Error stopping recorder', e);
          }
        }
      }, durationMs);
    });
  }
}
