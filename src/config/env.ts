import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',

  // GCP
  gcpProjectId: process.env.GCP_PROJECT_ID!,
  gcpServiceKeyPath: process.env.GCP_SERVICE_KEY_PATH!,

  // Database
  database: {
    connectionName: process.env.DB_CONNECTION_NAME!,
    name: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    host: process.env.DB_HOST!,
  },

  // Storage
  storage: {
    bucketVideos: process.env.BUCKET_VIDEOS!,
    bucketAudio: process.env.BUCKET_AUDIO!,
    bucketTemp: process.env.BUCKET_TEMP!,
  },

  // API Keys
  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY!,
    elevenlabs: process.env.ELEVENLABS_API_KEY!,
    unsplash: process.env.UNSPLASH_ACCESS_KEY,
    storyblocks: {
      userId: process.env.STORYBLOCKS_USER_ID!,
      apiUrl: process.env.STORYBLOCKS_API_URL!,
      apiKey: process.env.STORYBLOCKS_API_KEY!,
      privateKey: process.env.STORYBLOCKS_PRIVATE_KEY!,
      hmacKey: process.env.STORYBLOCKS_HMAC_KEY!,
    },
  },
};