// Runtime environment detection
// This module provides environment information at runtime in the browser

export const runtimeConfig = {
  // Detect if we're running in a production environment
  isProduction: process.env.NODE_ENV === 'production',
  
  // Detect if we're running on Heroku or similar cloud platform
  isCloudEnvironment: typeof window !== 'undefined' 
    ? window.location.hostname.includes('herokuapp.com') || 
      window.location.hostname.includes('railway.app') ||
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('netlify.app') ||
      process.env.VITE_IS_CLOUD === 'true'
    : process.env.IS_CLOUD === 'true',
  
  // API configuration - always use internal implementation in browser
  api: {
    // In the browser, we always use internal EDI processing
    // The previous external API calls have been replaced with internal implementation
    useExternalEdiApi: false,
    internalEdiEnabled: true,
  },
  
  // Feature flags
  features: {
    enableEDI: true,
    enableAdvancedEDI: true,
  },
  
  // Get base API URL based on environment
  getBaseApiUrl: (): string => {
    // Since we're using internal implementation, we don't need an external API URL
    // But if needed for other services, we could determine it based on environment
    if (typeof window !== 'undefined') {
      // Browser environment - return current origin or a configured API URL
      return process.env.VITE_API_URL || window.location.origin;
    }
    // Server environment - return configured URL or default
    return process.env.API_URL || 'http://localhost:3000';
  }
};

export default runtimeConfig;