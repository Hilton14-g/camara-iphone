/**
 * Live Photo Capture Engine
 * Synchronizes high-resolution still capture with a short video clip (1.5-2.0s)
 * mimicking Apple's iOS Live Photos behavior.
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
   * Captures a 1.5s video clip alongside audio if available
   * @param {number} durationMs - typically 1600ms
   * @returns {Promise<Blob>}
   */
  captureLiveClip(durationMs = 1600) {
    return new Promise((resolve, reject) => {
      if (!this.stream || !this.stream.active) {
        return reject(new Error('No active video stream'));
      }

      // Prioritize video/mp4 for universal iOS Safari and Android mobile support
      const candidateTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];

      let mimeType = '';
      for (const t of candidateTypes) {
        if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t)) {
          mimeType = t;
          break;
        }
      }

      try {
        const recorder = new MediaRecorder(this.stream, {
          mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
          videoBitsPerSecond: 4000000 // 4Mbps high quality
        });

        const chunks = [];
        this.isRecording = true;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          this.isRecording = false;
          const finalMime = recorder.mimeType || 'video/webm';
          const videoBlob = new Blob(chunks, { type: finalMime });
          resolve(videoBlob);
        };

        recorder.onerror = (e) => {
          this.isRecording = false;
          reject(e.error || new Error('MediaRecorder error'));
        };

        // Start recording
        recorder.start(100);

        // Stop after durationMs
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, durationMs);

      } catch (err) {
        this.isRecording = false;
        reject(err);
      }
    });
  }
}
