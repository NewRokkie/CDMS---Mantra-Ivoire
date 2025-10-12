import { initializeEventListeners } from './eventListeners';

/**
 * Initialize all services and event listeners
 * Call this once at app startup
 */
export function initializeServices() {
  console.log('[Services] Initializing application services...');

  // Initialize event listeners for automatic inter-module linking
  initializeEventListeners();

  console.log('[Services] ✓ All services initialized');
}
