import { Storage } from '@google-cloud/storage';
import { config } from './env';

// Initialize Google Cloud Storage
export const storage = new Storage({
  projectId: config.gcpProjectId,
  keyFilename: config.gcpServiceKeyPath,
});

// Get bucket references
export const videoBucket = storage.bucket(config.storage.bucketVideos);
export const audioBucket = storage.bucket(config.storage.bucketAudio);
export const tempBucket = storage.bucket(config.storage.bucketTemp);

console.log('✅ Cloud Storage initialized');

export default storage;
