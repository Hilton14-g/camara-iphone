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

      // Check supported MIME types for video recording
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
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
