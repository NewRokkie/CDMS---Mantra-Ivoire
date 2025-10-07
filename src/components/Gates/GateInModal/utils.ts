// Helper function to get container number validation status
export const getContainerValidationStatus = (containerNumber: string) => {
  if (!containerNumber) return { isValid: false, message: '' };

  if (containerNumber.length !== 11) {
    return {
      isValid: false,
      message: `${containerNumber.length}/11 characters`
    };
  }

  const letters = containerNumber.substring(0, 4);
  const numbers = containerNumber.substring(4, 11);

  if (!/^[A-Z]{4}$/.test(letters)) {
    return { isValid: false, message: 'First 4 must be letters' };
  }

  if (!/^[0-9]{7}$/.test(numbers)) {
    return { isValid: false, message: 'Last 7 must be numbers' };
  }

  return { isValid: true, message: 'Valid format' };
};

// Helper function to format container number for display
export const formatContainerForDisplay = (containerNumber: string): string => {
  if (containerNumber.length === 11) {
    const letters = containerNumber.substring(0, 4);
    const numbers1 = containerNumber.substring(4, 10);
    const numbers2 = containerNumber.substring(10, 11);
    return `${letters}-${numbers1}-${numbers2}`;
  }
  return containerNumber;
};
