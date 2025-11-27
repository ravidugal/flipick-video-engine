// backend/src/config/gcp-storage.js
// Simple placeholder for GCP Storage (we'll implement this later)

const BUCKETS = {
  videos: process.env.BUCKET_VIDEOS || 'flipick-videos-gen',
  audio: process.env.BUCKET_AUDIO || 'flipick-audio-gen',
  temp: process.env.BUCKET_TEMP || 'flipick-temp-gen'
};

async function uploadVideo(projectId, videoBuffer, format = 'html') {
  console.log('📤 Uploading video (placeholder):', projectId);
  // TODO: Implement GCP Storage upload
  return `https://storage.googleapis.com/${BUCKETS.videos}/placeholder.html`;
}

async function uploadAudio(projectId, sceneId, audioBuffer) {
  console.log('📤 Uploading audio (placeholder):', sceneId);
  // TODO: Implement GCP Storage upload
  return `https://storage.googleapis.com/${BUCKETS.audio}/placeholder.mp3`;
}

async function testConnection() {
  console.log('✅ GCP Storage (placeholder mode)');
  return true;
}

module.exports = {
  BUCKETS,
  uploadVideo,
  uploadAudio,
  testConnection
};
