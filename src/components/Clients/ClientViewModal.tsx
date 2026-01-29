import React from 'react';
import { X, Building, Mail, Phone, CreditCard, Calendar, FileText } from 'lucide-react';
import { Client } from '../../types';
import { ContactDisplay } from '../Common/ContactDisplay';
import { AddressDisplay } from '../Common/AddressDisplay';

interface ClientViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
}

export const ClientViewModal: React.FC<ClientViewModalProps> = ({
  isOpen,
  onClose,
  client
}) => {
  if (!isOpen) return null;

  const formatCurrency = (amount: number, currency: string) => {
    // Map common non-ISO currency codes to valid ones or handle them specially
    const currencyMap: { [key: string]: string } = {
      'FCFA': 'XOF', // West African CFA franc
    };

    let validCurrency = currency || 'USD';
    
    // Check if it's a mapped currency
    if (currencyMap[currency]) {
      validCurrency = currencyMap[currency];
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: validCurrency
      }).format(amount);
    } catch (error) {
      // Fallback for invalid currency codes
      const currencySymbols: { [key: string]: string } = {
        'FCFA': 'FCFA',
        'USD': '$',
        'EUR': '€',
      };
      
      const symbol = currencySymbols[currency] || currency || '$';
      return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{client.name}</h2>
              <p className="text-sm text-gray-500">Client Code: {client.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">Company Name</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.code}</p>
                      <p className="text-sm text-gray-500">Client Code</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.email}</p>
                      <p className="text-sm text-gray-500">Primary Email</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.phone}</p>
                      <p className="text-sm text-gray-500">Primary Phone</p>
                    </div>
                  </div>

                  {client.taxId && (
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.taxId}</p>
                        <p className="text-sm text-gray-500">Tax ID</p>
                      </div>
                    </div>
                  )}

                  <AddressDisplay
                    address={client.address}
                    label="Company Address"
                  />
                </div>
              </div>

              {/* Contact Person */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Person</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ContactDisplay
                    contactPerson={client.contactPerson}
                    fallbackEmail={client.email}
                    fallbackPhone={client.phone}
                    compact={false}
                  />
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-6">
              {/* Billing Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(client.creditLimit, client.currency)}
                      </p>
                      <p className="text-sm text-gray-500">Credit Limit</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.paymentTerms} days</p>
                      <p className="text-sm text-gray-500">Payment Terms</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.freeDaysAllowed} days</p>
                      <p className="text-sm text-gray-500">Free Storage Days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(client.dailyStorageRate, client.currency)}/day
                      </p>
                      <p className="text-sm text-gray-500">Daily Storage Rate</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Address (if different) */}
              {client.billingAddress && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <AddressDisplay
                      address={client.billingAddress}
                      label="Billing Address"
                    />
                  </div>
                </div>
              )}

              {/* System Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      client.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Auto EDI</span>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        client.autoEDI
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.autoEDI ? 'Activé' : 'Désactivé'}
                      </span>
                      {client.autoEDI && (
                        <span className="text-xs text-indigo-600 font-medium">CODECO</span>
                      )}
                    </div>
                  </div>

                  {/* EDI Details when enabled */}
                  {client.autoEDI && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="text-xs text-indigo-700 space-y-1">
                        <div className="font-medium text-indigo-800 mb-2">Transmission EDI Automatique:</div>
                        <div>• Messages CODECO envoyés automatiquement</div>
                        <div>• Notifications Gate In/Gate Out en temps réel</div>
                        <div>• Intégration avec les systèmes du client</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Created</span>
                    <span className="text-sm text-gray-900">{formatDate(client.createdAt)}</span>
                  </div>
                  
                  {client.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Last Updated</span>
                      <span className="text-sm text-gray-900">{formatDate(client.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};