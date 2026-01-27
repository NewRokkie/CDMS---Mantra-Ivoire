import { initializeEventListeners } from './eventListeners';
import { logger } from '../utils/logger';

/**
 * Initialize all services and event listeners
 * Call this once at app startup
 */
export function initializeServices() {
  logger.info('Initializing application services...', 'Services');

  // Initialize event listeners for automatic inter-module linking
  initializeEventListeners();

  logger.info('All services initialized', 'Services');
}
