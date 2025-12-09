// Frontend Environment Configuration - Production
// This file contains only frontend-safe configuration
// All sensitive data (API keys, DB credentials) must stay in backend

export const environment = {
  production: true,
  apiUrl: 'https://api.flipick.com', // Your production backend API URL - UPDATE THIS
  appName: 'Flipick AI Video Studio',
  version: '1.0.0',
  
  // Frontend-only settings
  maxUploadSizeMB: 100,
  supportedVideoFormats: ['mp4', 'webm', 'mov'],
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
  maxScenesPerVideo: 50,
  
  // Feature flags (if needed)
  features: {
    enableScenarioTraining: true,
    enableMCQAssessment: true,
    enablePDFUpload: true,
  },
  
  // UI Configuration
  ui: {
    primaryColor: '#444ce7',
    secondaryColor: '#849bff',
    defaultVideoAspectRatio: '16:9',
  }
};