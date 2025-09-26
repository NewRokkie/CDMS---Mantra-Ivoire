export interface Stack {
  id: string;
  stackNumber: number;
  yardId: string;
  sectionId: string;
  rows: number;
  maxTiers: number;
  capacity: number;
  currentOccupancy: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    width: number;
    length: number;
  };
  containerSize: '20ft' | '40ft' | 'both';
  isSpecialStack: boolean;
  isActive: boolean;
  assignedClientCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface StackFormData {
  stackNumber: number;
  sectionId: string;
  rows: number;
  maxTiers: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  width: number;
  length: number;
  containerSize: '20ft' | '40ft' | 'both';
  isSpecialStack: boolean;
  assignedClientCode?: string;
  notes?: string;
}

export interface StackValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}