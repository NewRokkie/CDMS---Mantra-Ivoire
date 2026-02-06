// Environment configuration for the application
// Handles both local development and Heroku deployment

const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Environment detection
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isHeroku: Boolean(process.env.IS_HEROKU || process.env.HEROKU_APP_NAME),
  
  // API configuration - use internal services
  api: {
    useExternalEdiApi: false, // Always use internal implementation
    internalEdiEnabled: true,
    ediTimeout: parseInt(process.env.EDI_TIMEOUT || '30000', 10), // 30 seconds
  },
  
  // Database configuration (using environment variables)
  database: {
    url: process.env.DATABASE_URL,
  },
  
  // Feature flags
  features: {
    enableEDI: true,
    enableAdvancedEDI: true,
    enableSFTPTransfer: process.env.ENABLE_SFTP === 'true', // Can be enabled via env var
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  // CORS settings for production
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  }
};

export default config;