import React from 'react';
import { MapPin } from 'lucide-react';

interface AddressDisplayProps {
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  } | string; // Handle case where it might be stored as JSON string
  label?: string;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  label = 'Address',
  className = ''
}) => {
  // Parse address if it's a JSON string
  let parsedAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  } | undefined;

  if (typeof address === 'string') {
    try {
      parsedAddress = JSON.parse(address);
    } catch (error) {
      // If parsing fails, treat it as just the street address
      parsedAddress = {
        street: address,
        city: '',
        state: '',
        zipCode: '',
        country: ''
      };
    }
  } else if (typeof address === 'object' && address !== null) {
    parsedAddress = address;
  }

  if (!parsedAddress) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <MapPin className="h-4 w-4 text-gray-400" />
        <div>
          <p className="text-sm text-gray-500 italic">No address information</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        {parsedAddress.street && (
          <p className="text-sm font-medium text-gray-900 break-words">
            {parsedAddress.street}
          </p>
        )}
        {(parsedAddress.city || parsedAddress.state || parsedAddress.zipCode) && (
          <p className="text-sm text-gray-500">
            {[
              parsedAddress.city,
              parsedAddress.state,
              parsedAddress.zipCode
            ].filter(Boolean).join(', ')}
          </p>
        )}
        {parsedAddress.country && (
          <p className="text-sm text-gray-500">{parsedAddress.country}</p>
        )}
        {!parsedAddress.street && !parsedAddress.city && (
          <p className="text-sm text-gray-500 italic">No address information</p>
        )}
      </div>
    </div>
  );
};