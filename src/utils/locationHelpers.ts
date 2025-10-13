/**
 * Location ID Helpers
 * Formats: S{stack}-R{row}-H{height}
 * Examples: S01-R1-H1, S13-R3-H2, S47-R6-H4
 */

interface LocationParts {
  stackNumber: number;
  row: number;
  height: number;
}

/**
 * Format location ID from components
 * @param stackNumber Stack number (e.g., 1, 13, 47)
 * @param row Row number (1-6)
 * @param height Height/tier number (1-4)
 * @returns Formatted location ID (e.g., "S01-R1-H1")
 */
export const formatLocationId = (stackNumber: number, row: number, height: number): string => {
  const stack = String(stackNumber).padStart(2, '0');
  return `S${stack}-R${row}-H${height}`;
};

/**
 * Parse location ID into components
 * @param locationId Location ID string (e.g., "S01-R1-H1")
 * @returns Object with stackNumber, row, height or null if invalid
 */
export const parseLocationId = (locationId: string): LocationParts | null => {
  if (!locationId) return null;

  const match = locationId.match(/^S(\d+)-R(\d+)-H(\d+)$/);
  if (!match) return null;

  return {
    stackNumber: parseInt(match[1], 10),
    row: parseInt(match[2], 10),
    height: parseInt(match[3], 10)
  };
};

/**
 * Validate location ID format
 * @param locationId Location ID string
 * @returns true if valid format
 */
export const isValidLocationId = (locationId: string): boolean => {
  return parseLocationId(locationId) !== null;
};

/**
 * Generate all possible location IDs for a stack
 * @param stackNumber Stack number
 * @param rows Number of rows (default 6)
 * @param maxTiers Maximum height (default 4)
 * @returns Array of all location IDs
 */
export const generateStackLocations = (
  stackNumber: number,
  rows: number = 6,
  maxTiers: number = 4
): string[] => {
  const locations: string[] = [];

  for (let row = 1; row <= rows; row++) {
    for (let height = 1; height <= maxTiers; height++) {
      locations.push(formatLocationId(stackNumber, row, height));
    }
  }

  return locations;
};

/**
 * Get stack number from location ID
 * @param locationId Location ID string (e.g., "S01-R1-H1")
 * @returns Stack number or null
 */
export const getStackNumberFromLocationId = (locationId: string): number | null => {
  const parts = parseLocationId(locationId);
  return parts ? parts.stackNumber : null;
};
