import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { MultiStepModal } from '../Common/Modal/MultiStepModal';
import { BasicInformationStep } from './ContainerEditModal/BasicInformationStep';
import { LocationAssignmentStep } from './ContainerEditModal/LocationAssignmentStep';
import { ClientInformationStep } from './ContainerEditModal/ClientInformationStep';
import { DamageAssessmentStep } from './ContainerEditModal/DamageAssessmentStep';
import { ReviewStep } from './ContainerEditModal/ReviewStep';

interface ContainerEditModalProps {
  isOpen: boolean;
  container: Container;
  onClose: () => void;
  onSave: (container: Container) => void;
}

export interface ContainerFormData {
  number: string;
  type: Container['type'];
  size: Container['size'];
  status: Container['status'];
  location: string;
  locationId?: string;
  yardId?: string;
  client: string;
  clientCode: string;
  clientId?: string;
  damage: string[];
  damageAssessment?: {
    hasDamage: boolean;
    severity?: 'minor' | 'moderate' | 'severe';
    inspectionDate?: Date;
    inspectorName?: string;
    repairRequired?: boolean;
    estimatedCost?: number;
  };
}

export const ContainerEditModal: React.FC<ContainerEditModalProps> = ({
  isOpen,
  container,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canEditContainers = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'operator';
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<ContainerFormData>({
    number: container.number,
    type: container.type,
    size: container.size,
    status: container.status,
    location: container.location,
    locationId: container.yardPosition?.id,
    yardId: container.yardId,
    client: container.clientName,
    clientCode: container.clientCode || '',
    clientId: container.clientId,
    damage: container.damage || [],
    damageAssessment: {
      hasDamage: (container.damage && container.damage.length > 0) || false,
      severity: undefined,
      inspectionDate: new Date(),
      inspectorName: user?.name || '',
      repairRequired: false,
      estimatedCost: 0
    }
  });

  const updateFormData = (updates: Partial<ContainerFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    if (!canEditContainers) {
      throw new Error(t('containers.edit.noPermission'));
    }

    try {
      // Import container service
      const { containerService } = await import('../../services/api');
      
      // Update container in database
      const updatedContainer = await containerService.update(container.id, {
        number: formData.number,
        type: formData.type,
        size: formData.size,
        status: formData.status,
        location: formData.location,
        yardId: formData.yardId,
        clientCode: formData.clientCode,
        clientId: formData.clientId,
        damage: formData.damage.length > 0 ? formData.damage : [],
        updatedBy: user?.name || 'System',
      });

      onSave(updatedContainer);
    } catch (error) {
      console.error('Failed to update container:', error);
      throw error;
    }
  };

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const stepValidations = [
    () => {
      const errors: string[] = [];
      if (!formData.number || formData.number.length !== 11) {
        errors.push('Container number must be exactly 11 characters');
      }
      const letters = formData.number.substring(0, 4);
      const numbers = formData.number.substring(4, 11);
      if (!/^[A-Z]{4}$/.test(letters)) {
        errors.push('First 4 characters must be uppercase letters');
      }
      if (!/^[0-9]{7}$/.test(numbers)) {
        errors.push('Last 7 characters must be numbers');
      }
      if (!formData.type) errors.push('Container type is required');
      if (!formData.size) errors.push('Container size is required');
      if (!formData.status) errors.push('Status is required');
      return errors;
    },
    async () => {
      const errors: string[] = [];
      if (!formData.location) {
        errors.push('Location is required');
        return errors;
      }
      
      // If location hasn't changed from the original, skip validation
      // This allows editing other fields without location validation issues
      if (formData.location === container.location) {
        return errors; // No errors, location is unchanged
      }
      
      // Validate that the selected location is actually available (only if location changed)
      try {
        const { locationManagementService, yardsService, containerService } = await import('../../services/api');
        
        // Check if this is a virtual location (even stack number like S04, S08, S12, etc.)
        const stackNumberMatch = formData.location.match(/S(\d+)/);
        const stackNumber = stackNumberMatch ? parseInt(stackNumberMatch[1]) : 0;
        const isVirtualLocation = stackNumber % 2 === 0;
        
        if (isVirtualLocation) {
          // For virtual locations, validate against yard configuration and container occupancy
          // instead of database records (since virtual locations may not be in DB yet)
          
          // Get yard configuration
          const yard = yardsService.getYardById(formData.yardId || container.yardId);
          if (!yard) {
            errors.push('Yard not found');
            return errors;
          }
          
          // Find the virtual stack in yard configuration
          const allStacks = yard.sections.flatMap(section => section.stacks);
          const virtualStack = allStacks.find(s => s.stackNumber === stackNumber && s.isVirtual);
          
          if (!virtualStack) {
            errors.push(`Virtual stack S${String(stackNumber).padStart(2, '0')} does not exist in yard configuration`);
            return errors;
          }
          
          // Validate the location format matches stack configuration
          const locationMatch = formData.location.match(/S(\d+)R(\d+)H(\d+)/);
          if (!locationMatch) {
            errors.push('Invalid location format');
            return errors;
          }
          
          const row = parseInt(locationMatch[2]);
          const tier = parseInt(locationMatch[3]);
          
          // Check if row is valid
          if (row < 1 || row > virtualStack.rows) {
            errors.push(`Invalid row number. Stack has ${virtualStack.rows} rows`);
            return errors;
          }
          
          // Check if tier is valid (considering custom tier config)
          let maxTiersForRow = virtualStack.maxTiers;
          if (virtualStack.rowTierConfig && virtualStack.rowTierConfig.length > 0) {
            const rowConfig = virtualStack.rowTierConfig.find(config => config.row === row);
            if (rowConfig) {
              maxTiersForRow = rowConfig.maxTiers;
            }
          }
          
          if (tier < 1 || tier > maxTiersForRow) {
            errors.push(`Invalid tier number. Row ${row} has maximum ${maxTiersForRow} tiers`);
            return errors;
          }
          
          // Check if location is already occupied by another container
          const allContainers = await containerService.getAll();
          const occupyingContainer = allContainers.find(c => 
            c.location === formData.location && c.id !== container.id
          );
          
          if (occupyingContainer) {
            errors.push(`Location ${formData.location} is already occupied by container ${occupyingContainer.number}`);
          }
        } else {
          // For physical locations, validate against database
          const location = await locationManagementService.getByLocationId(formData.location);
          
          if (!location) {
            errors.push('Selected location does not exist');
          } else {
            // Check if location is occupied by a DIFFERENT container
            const isOccupiedByOther = location.containerId && location.containerId !== container.id;
            
            if (isOccupiedByOther) {
              errors.push(`Location ${formData.location} is already occupied by container ${location.containerNumber || 'another container'}`);
            } else if (location.isOccupied && !location.containerId) {
              // Location is marked as occupied but no container ID (data inconsistency)
              errors.push(`Location ${formData.location} is marked as occupied`);
            } else if (location.available === false && location.containerId !== container.id) {
              // Location is explicitly marked as not available and not occupied by this container
              errors.push(`Location ${formData.location} is not available`);
            }
          }
        }
      } catch (error) {
        console.error('Error validating location:', error);
        errors.push('Could not validate location availability');
      }
      
      return errors;
    },
    () => {
      const errors: string[] = [];
      if (!formData.client) errors.push('Client is required');
      return errors;
    },
    () => {
      const errors: string[] = [];
      if (formData.damageAssessment?.hasDamage && formData.damage.length === 0) {
        errors.push('Please add at least one damage description');
      }
      return errors;
    },
    () => []
  ];

  // Validate current step
  useEffect(() => {
    const validateStep = async () => {
      setIsValidating(true);
      const validator = stepValidations[currentStep - 1];
      const errors = await validator();
      setValidationErrors(errors);
      setIsValidating(false);
    };
    
    validateStep();
  }, [currentStep, formData]);

  const isStepValid = validationErrors.length === 0 && !isValidating;

  const stepLabels = [
    t('containers.edit.steps.basic'),
    t('containers.edit.steps.location'),
    t('containers.edit.steps.client'),
    t('containers.edit.steps.damage'),
    t('containers.edit.steps.review')
  ];

  const handleNextStep = () => {
    if (currentStep === 5) {
      handleSubmit();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BasicInformationStep formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <LocationAssignmentStep formData={formData} updateFormData={updateFormData} containerStatus={container.status} />;
      case 3:
        return <ClientInformationStep formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <DamageAssessmentStep formData={formData} updateFormData={updateFormData} />;
      case 5:
        return <ReviewStep formData={formData} container={container} />;
      default:
        return null;
    }
  };

  return (
    <MultiStepModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('containers.edit.title')}
      icon={Package}
      currentStep={currentStep}
      totalSteps={5}
      stepLabels={stepLabels}
      onNextStep={handleNextStep}
      onPrevStep={handlePrevStep}
      isStepValid={isStepValid}
      showProgressBar={true}
    >
      {renderStepContent()}
      
      {/* Show validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-semibold text-red-900 mb-2">{t('containers.edit.validationErrors')}</h4>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Show validating indicator */}
      {isValidating && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{t('containers.edit.validating')}</p>
        </div>
      )}
    </MultiStepModal>
  );
};
