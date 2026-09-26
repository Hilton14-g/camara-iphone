/**
 * IndexedDB storage for iPhone Camera Captures & Live Photos
 * Stores high-res images, video clips, thumbnails, and camera EXIF metadata.
 */

const DB_NAME = 'iPhoneCameraDB';
const DB_VERSION = 1;
const STORE_NAME = 'captures';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Saves a photo or live photo to IndexedDB
 * @param {Object} capture
 * @returns {Promise<string>} id
 */
export async function saveCapture(capture) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const item = {
      id: capture.id || 'IMG_' + Date.now(),
      timestamp: capture.timestamp || Date.now(),
      type: capture.type || 'photo', // 'photo' | 'live' | 'portrait'
      imageBlob: capture.imageBlob,
      thumbnailBlob: capture.thumbnailBlob || capture.imageBlob,
      videoBlob: capture.videoBlob || null, // For Live Photos
      duration: capture.duration || 0,
      metadata: capture.metadata || {
        aspectRatio: '4:3',
        style: 'standard',
        filter: 'none',
        exposure: 0,
        lens: '24mm f/1.78',
        smartHDR: true,
        width: 1920,
        height: 1440
      },
      liveEffect: capture.liveEffect || 'live' // 'live', 'loop', 'bounce'
    };

    const req = store.put(item);
    req.onsuccess = () => resolve(item.id);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all captures sorted from newest to oldest
 * @returns {Promise<Array>}
 */
export async function getAllCaptures() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // newest first
    const results = [];

    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single capture by ID
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getCaptureById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes a capture by ID
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteCapture(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Updates a capture (e.g. live photo effect)
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateCapture(id, updates) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const data = getReq.result;
      if (!data) return reject(new Error('Not found'));
      const updated = { ...data, ...updates };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Downloads a Blob as a file with a given filename
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}
