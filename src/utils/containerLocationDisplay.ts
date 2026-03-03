import { Container } from '../types';

/**
 * Get the display text for a container's location based on its status
 * @param container - The container object
 * @param language - The current language ('en' or 'fr')
 * @returns The location display text
 */
export const getContainerLocationDisplay = (
  container: Container,
  language: 'en' | 'fr' = 'en'
): string => {
  // If container has a location, return it
  if (container.location && container.location !== 'Pending Assignment') {
    return container.location;
  }

  // If container is out of depot (gate_out or out_depot), show "Out of Depot"
  if (container.status === 'out_depot' || container.status === 'gate_out') {
    return language === 'fr' ? 'Hors dépôt' : 'Out of Depot';
  }

  // Otherwise, show "Pending Assignment"
  return language === 'fr' ? 'En attente' : 'Pending Assignment';
};

/**
 * Get the CSS class for location display based on container status
 * @param container - The container object
 * @returns The CSS class string
 */
export const getContainerLocationClass = (container: Container): string => {
  // If container has a location, return bold style
  if (container.location && container.location !== 'Pending Assignment') {
    return 'font-bold text-gray-900';
  }

  // If container is out of depot, return gray italic style
  if (container.status === 'out_depot' || container.status === 'gate_out') {
    return 'text-gray-500 italic';
  }

  // Otherwise, return light gray italic style (pending)
  return 'text-gray-400 italic';
};
