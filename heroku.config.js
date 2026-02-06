// Heroku configuration
// This file contains configuration specific to Heroku deployment

const herokuConfig = {
  // Port configuration - Heroku sets PORT environment variable
  port: process.env.PORT || 3000,
  
  // Environment
  isHeroku: process.env.IS_HEROKU === 'true',
  
  // API configuration
  api: {
    // For Heroku deployment, we use internal services instead of external API
    useExternalAPI: false,
    fallbackToInternal: true,
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true,
  },
  
  // Feature flags
  features: {
    enableEDI: true,
    enableAdvancedEDI: true,
  }
};

module.exports = herokuConfig;