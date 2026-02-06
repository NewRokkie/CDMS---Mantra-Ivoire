import React from 'react';
import { Mail, Phone, User } from 'lucide-react';

interface ContactDisplayProps {
  contactPerson?: {
    name: string;
    email: string;
    phone: string;
    position?: string;
  } | string; // Handle case where it might be stored as JSON string
  fallbackEmail?: string;
  fallbackPhone?: string;
  compact?: boolean;
  className?: string;
}

export const ContactDisplay: React.FC<ContactDisplayProps> = ({
  contactPerson,
  fallbackEmail,
  fallbackPhone,
  compact = false,
  className = ''
}) => {
  // Parse contact person if it's a JSON string
  let parsedContactPerson: {
    name: string;
    email: string;
    phone: string;
    position?: string;
  } | undefined;

  if (typeof contactPerson === 'string') {
    try {
      parsedContactPerson = JSON.parse(contactPerson);
    } catch (error) {
      // If parsing fails, treat it as just the name
      parsedContactPerson = {
        name: contactPerson,
        email: '',
        phone: '',
        position: ''
      };
    }
  } else if (typeof contactPerson === 'object' && contactPerson !== null) {
    parsedContactPerson = contactPerson;
  }

  const email = parsedContactPerson?.email || fallbackEmail;
  const phone = parsedContactPerson?.phone || fallbackPhone;
  const name = parsedContactPerson?.name;
  const position = parsedContactPerson?.position;

  if (compact) {
    return (
      <div className={`space-y-1 ${className}`}>
        {email && (
          <div className="flex items-center text-sm text-gray-900">
            <Mail className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center text-sm text-gray-500">
            <Phone className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
            <span>{phone}</span>
          </div>
        )}
        {name && (
          <div className="text-xs text-gray-500 truncate">
            Contact: {name}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {name && (
        <div className="flex items-center space-x-3">
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            {position && <p className="text-sm text-gray-500 truncate">{position}</p>}
          </div>
        </div>
      )}
      
      {email && (
        <div className="flex items-center space-x-3">
          <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
            <p className="text-sm text-gray-500">Email</p>
          </div>
        </div>
      )}
      
      {phone && (
        <div className="flex items-center space-x-3">
          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{phone}</p>
            <p className="text-sm text-gray-500">Phone</p>
          </div>
        </div>
      )}

      {!name && !email && !phone && (
        <div className="text-sm text-gray-500 italic">No contact information</div>
      )}
    </div>
  );
};