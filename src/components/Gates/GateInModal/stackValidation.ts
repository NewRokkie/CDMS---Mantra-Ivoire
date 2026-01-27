import { YardStack } from '../../../types/yard';

export interface StackValidationResult {
  isValid: boolean;
  message: string;
  code: string;
}

export interface StackAvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  alternativeSuggestions?: string[];
}

/**
 * Validates stack format using S##R#H# pattern
 */
export const validateStackFormat = (stackId: string): StackValidationResult => {
  // Pattern: S followed by 2 digits, R followed by 1+ digits, H followed by 1+ digits
  const stackPattern = /^S(\d{2})R(\d+)H(\d+)$/;
  const match = stackId.match(stackPattern);
  
  if (!match) {
    return {
      isValid: false,
      message: 'Stack ID must follow format S##R#H# (e.g., S01R1H1)',
      code: 'INVALID_FORMAT'
    };
  }
  
  const [, stackNum, row, height] = match;
  const stackNumber = parseInt(stackNum);
  const rowNumber = parseInt(row);
  const heightNumber = parseInt(height);
  
  // Validate stack number range (01-99)
  if (stackNumber < 1 || stackNumber > 99) {
    return {
      isValid: false,
      message: 'Stack number must be between 01 and 99',
      code: 'INVALID_STACK_NUMBER'
    };
  }
  
  // Validate row number (1-6 typically)
  if (rowNumber < 1 || rowNumber > 6) {
    return {
      isValid: false,
      message: 'Row number must be between 1 and 6',
      code: 'INVALID_ROW_NUMBER'
    };
  }
  
  // Validate height number (1-4 typically)
  if (heightNumber < 1 || heightNumber > 4) {
    return {
      isValid: false,
      message: 'Height number must be between 1 and 4',
      code: 'INVALID_HEIGHT_NUMBER'
    };
  }
  
  return {
    isValid: true,
    message: 'Valid stack format',
    code: 'VALID'
  };
};

/**
 * Parses stack ID into components
 */
export const parseStackId = (stackId: string): { stackNumber: number; row: number; height: number } | null => {
  const validation = validateStackFormat(stackId);
  if (!validation.isValid) {
    return null;
  }
  
  const match = stackId.match(/^S(\d{2})R(\d+)H(\d+)$/);
  if (!match) return null;
  
  return {
    stackNumber: parseInt(match[1]),
    row: parseInt(match[2]),
    height: parseInt(match[3])
  };
};

/**
 * Formats stack components into S##R#H# format
 */
export const formatStackId = (stackNumber: number, row: number, height: number): string => {
  return `S${String(stackNumber).padStart(2, '0')}R${row}H${height}`;
};

/**
 * Checks if a stack position is available for assignment
 */
export const checkStackAvailability = (
  stack: YardStack,
  row: number,
  height: number,
  containerSize: '20ft' | '40ft',
  containerQuantity: 1 | 2
): StackAvailabilityCheck => {
  // Check if stack exists and is active
  if (!stack.isActive) {
    return {
      isAvailable: false,
      reason: 'Stack is not active'
    };
  }
  
  // Check container size compatibility
  const stackSize = stack.containerSize === '20ft' ? '20ft' : '40ft';
  if (containerSize === '40ft' && stackSize === '20ft') {
    return {
      isAvailable: false,
      reason: '40ft containers cannot be placed on 20ft stacks'
    };
  }
  
  // Check if row and height are within stack limits
  if (row > stack.rows) {
    return {
      isAvailable: false,
      reason: `Row ${row} exceeds stack capacity (max: ${stack.rows})`
    };
  }
  
  if (height > stack.maxTiers) {
    return {
      isAvailable: false,
      reason: `Height ${height} exceeds stack capacity (max: ${stack.maxTiers})`
    };
  }
  
  // Check overall stack capacity
  if (stack.currentOccupancy >= stack.capacity) {
    return {
      isAvailable: false,
      reason: 'Stack is at full capacity'
    };
  }
  
  // For double containers (quantity = 2), check if adjacent position is available
  if (containerQuantity === 2 && containerSize === '20ft') {
    // This would require more complex logic to check adjacent positions
    // For now, we'll assume it's available if the stack has capacity
    const requiredCapacity = containerQuantity;
    if (stack.capacity - stack.currentOccupancy < requiredCapacity) {
      return {
        isAvailable: false,
        reason: 'Insufficient capacity for double container placement'
      };
    }
  }
  
  // Check for special stack restrictions
  if (stack.isSpecialStack && containerSize === '40ft') {
    return {
      isAvailable: false,
      reason: 'Special stacks cannot accommodate 40ft containers'
    };
  }
  
  // Check client assignment restrictions
  if (stack.assignedClientCode) {
    // This would need client context to validate
    // For now, we'll allow it but could add client validation later
  }
  
  return {
    isAvailable: true
  };
};

/**
 * Filters stacks based on container requirements
 */
export const filterCompatibleStacks = (
  stacks: YardStack[],
  containerSize: '20ft' | '40ft',
  containerQuantity: 1 | 2,
  clientCode?: string
): YardStack[] => {
  return stacks.filter(stack => {
    // Basic availability check
    if (!stack.isActive || stack.currentOccupancy >= stack.capacity) {
      return false;
    }
    
    // Size compatibility
    const stackSize = stack.containerSize === '20ft' ? '20ft' : '40ft';
    if (containerSize === '40ft' && stackSize === '20ft') {
      return false;
    }
    
    // Special stack restrictions
    if (stack.isSpecialStack && containerSize === '40ft') {
      return false;
    }
    
    // Client assignment check
    if (stack.assignedClientCode && clientCode && stack.assignedClientCode !== clientCode) {
      return false;
    }
    
    // Capacity check for multiple containers
    if (containerQuantity > 1) {
      const availableCapacity = stack.capacity - stack.currentOccupancy;
      if (availableCapacity < containerQuantity) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Suggests alternative stacks when primary choice is unavailable
 */
export const suggestAlternativeStacks = (
  stacks: YardStack[],
  containerSize: '20ft' | '40ft',
  containerQuantity: 1 | 2,
  preferredSection?: string
): string[] => {
  const compatibleStacks = filterCompatibleStacks(stacks, containerSize, containerQuantity);
  
  // Sort by preference: same section first, then by available capacity
  const sortedStacks = compatibleStacks.sort((a, b) => {
    // Prefer same section
    if (preferredSection) {
      const aInSection = a.sectionName === preferredSection;
      const bInSection = b.sectionName === preferredSection;
      if (aInSection && !bInSection) return -1;
      if (!aInSection && bInSection) return 1;
    }
    
    // Then by available capacity (more available = better)
    const aAvailable = a.capacity - a.currentOccupancy;
    const bAvailable = b.capacity - b.currentOccupancy;
    return bAvailable - aAvailable;
  });
  
  // Return top 5 suggestions as formatted stack IDs
  return sortedStacks
    .slice(0, 5)
    .map(stack => formatStackId(stack.stackNumber, 1, 1)); // Default to R1H1 for suggestions
};

/**
 * Validates stack assignment before final submission
 */
export const validateStackAssignment = (
  stackId: string,
  stack: YardStack,
  containerSize: '20ft' | '40ft',
  containerQuantity: 1 | 2
): StackValidationResult => {
  // Format validation
  const formatValidation = validateStackFormat(stackId);
  if (!formatValidation.isValid) {
    return formatValidation;
  }
  
  // Parse stack components
  const parsed = parseStackId(stackId);
  if (!parsed) {
    return {
      isValid: false,
      message: 'Failed to parse stack ID',
      code: 'PARSE_ERROR'
    };
  }
  
  // Availability validation
  const availability = checkStackAvailability(
    stack,
    parsed.row,
    parsed.height,
    containerSize,
    containerQuantity
  );
  
  if (!availability.isAvailable) {
    return {
      isValid: false,
      message: availability.reason || 'Stack position is not available',
      code: 'UNAVAILABLE'
    };
  }
  
  return {
    isValid: true,
    message: 'Stack assignment is valid',
    code: 'VALID'
  };
};