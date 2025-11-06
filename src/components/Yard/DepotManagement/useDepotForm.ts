import { useState, useEffect } from 'react';
import { Yard } from '../../../types';

export interface DepotFormData {
  name: string;
  code: string;
  description: string;
  location: string;
  layout: 'tantarelli' | 'yirima';
  isActive: boolean;
  contactManager: string;
  contactPhone: string;
  contactEmail: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  addressCountry: string;
}

export interface DepotFormErrors {
  [key: string]: string;
}

export const useDepotForm = (selectedDepot: Yard | null, isOpen: boolean) => {
  const [formData, setFormData] = useState<DepotFormData>({
    name: '',
    code: '',
    description: '',
    location: '',
    layout: 'yirima',
    isActive: true,
    contactManager: '',
    contactPhone: '',
    contactEmail: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZipCode: '',
    addressCountry: 'Côte d\'Ivoire'
  });

  const [errors, setErrors] = useState<DepotFormErrors>({});

  useEffect(() => {
    if (selectedDepot) {
      setFormData({
        name: selectedDepot.name,
        code: selectedDepot.code,
        description: selectedDepot.description,
        location: selectedDepot.location,
        layout: selectedDepot.layout || 'yirima',
        isActive: selectedDepot.isActive,
        contactManager: selectedDepot.contactInfo?.manager || '',
        contactPhone: selectedDepot.contactInfo?.phone || '',
        contactEmail: selectedDepot.contactInfo?.email || '',
        addressStreet: selectedDepot.address?.street || '',
        addressCity: selectedDepot.address?.city || '',
        addressState: selectedDepot.address?.state || '',
        addressZipCode: selectedDepot.address?.zipCode || '',
        addressCountry: selectedDepot.address?.country || 'Côte d\'Ivoire'
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        location: '',
        layout: 'yirima',
        isActive: true,
        contactManager: '',
        contactPhone: '',
        contactEmail: '',
        addressStreet: '',
        addressCity: '',
        addressState: '',
        addressZipCode: '',
        addressCountry: 'Côte d\'Ivoire'
      });
    }
    setErrors({});
  }, [selectedDepot, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: DepotFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Depot name is required';
    }
    if (!formData.code.trim()) {
      newErrors.code = 'Depot code is required';
    } else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only uppercase letters, numbers, and hyphens';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }
    if (formData.contactPhone && !/^\+?[0-9\s\-\(\)]+$/.test(formData.contactPhone)) {
      newErrors.contactPhone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.name && !!formData.code && !!formData.location;
      case 2:
        return true; // Contact info is optional
      default:
        return true;
    }
  };

  const handleInputChange = (field: keyof DepotFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getFormDataForSubmission = () => {
    return {
      name: formData.name,
      code: formData.code,
      description: formData.description,
      location: formData.location,
      layout: formData.layout,
      isActive: formData.isActive,
      contactInfo: {
        manager: formData.contactManager,
        phone: formData.contactPhone,
        email: formData.contactEmail
      },
      address: {
        street: formData.addressStreet,
        city: formData.addressCity,
        state: formData.addressState,
        zipCode: formData.addressZipCode,
        country: formData.addressCountry
      }
    };
  };

  return {
    formData,
    errors,
    validateForm,
    validateStep,
    handleInputChange,
    getFormDataForSubmission
  };
};
