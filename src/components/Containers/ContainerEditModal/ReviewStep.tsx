import React from 'react';
import { Package, MapPin, Building, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Container } from '../../../types';
import { ContainerFormData } from '../ContainerEditModal';

interface ReviewStepProps {
  formData: ContainerFormData;
  container: Container;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ formData, container }) => {
  const hasChanges = (field: keyof Container, newValue: any) => {
    return container[field] !== newValue;
  };

  const ChangeIndicator = ({ changed }: { changed: boolean }) => (
    changed ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        Modified
      </span>
    ) : null
  );

  const ComparisonRow = ({ label, oldValue, newValue, changed }: { 
    label: string; 
    oldValue: any; 
    newValue: any; 
    changed: boolean;
  }) => (
    <div className={`p-3 rounded-lg ${changed ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
      <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
      {changed ? (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500 line-through">{oldValue || 'N/A'}</span>
          <ArrowRight className="h-3 w-3 text-yellow-600" />
          <span className="font-medium text-gray-900">{newValue || 'N/A'}</span>
        </div>
      ) : (
        <div className="text-sm text-gray-900">{newValue || 'N/A'}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
            Review Changes
          </h3>
          <span className="text-sm text-gray-600">
            Container: <span className="font-mono font-medium">{formData.number}</span>
          </span>
        </div>
        <p className="text-sm text-gray-700">
          Please review all changes before saving. Modified fields are highlighted in yellow.
        </p>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Package className="h-5 w-5 mr-2 text-blue-600" />
          Basic Information
          {(hasChanges('number', formData.number) || 
            hasChanges('type', formData.type) || 
            hasChanges('size', formData.size) || 
            hasChanges('status', formData.status)) && (
            <ChangeIndicator changed={true} />
          )}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ComparisonRow
            label="Container Number"
            oldValue={container.number}
            newValue={formData.number}
            changed={hasChanges('number', formData.number)}
          />
          <ComparisonRow
            label="Type"
            oldValue={container.type}
            newValue={formData.type}
            changed={hasChanges('type', formData.type)}
          />
          <ComparisonRow
            label="Size"
            oldValue={container.size}
            newValue={formData.size}
            changed={hasChanges('size', formData.size)}
          />
          <ComparisonRow
            label="Status"
            oldValue={container.status}
            newValue={formData.status}
            changed={hasChanges('status', formData.status)}
          />
        </div>
      </div>

      {/* Location Information */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-green-600" />
          Location Assignment
          {hasChanges('location', formData.location) && <ChangeIndicator changed={true} />}
        </h4>
        <div className="grid grid-cols-1 gap-3">
          <ComparisonRow
            label="Current Location"
            oldValue={container.location}
            newValue={formData.location}
            changed={hasChanges('location', formData.location)}
          />
          {formData.locationId && (
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="text-xs font-medium text-gray-600 mb-1">Location ID</div>
              <div className="text-sm text-gray-900 font-mono">{formData.locationId}</div>
            </div>
          )}
        </div>
      </div>

      {/* Client Information */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2 text-purple-600" />
          Client Assignment
          {(hasChanges('clientName', formData.client) || 
            hasChanges('clientCode', formData.clientCode)) && (
            <ChangeIndicator changed={true} />
          )}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ComparisonRow
            label="Client Name"
            oldValue={container.clientName}
            newValue={formData.client}
            changed={hasChanges('clientName', formData.client)}
          />
          <ComparisonRow
            label="Client Code"
            oldValue={container.clientCode}
            newValue={formData.clientCode}
            changed={hasChanges('clientCode', formData.clientCode)}
          />
        </div>
      </div>

      {/* Damage Assessment */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
          Damage Assessment
          {((container.damage?.length || 0) !== formData.damage.length) && (
            <ChangeIndicator changed={true} />
          )}
        </h4>

        {formData.damageAssessment?.hasDamage ? (
          <div className="space-y-4">
            {/* Damage List */}
            {formData.damage.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Damage Descriptions</div>
                <div className="space-y-2">
                  {formData.damage.map((damage, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 rounded border border-red-200">
                      <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      <span className="text-sm text-gray-900">{damage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment Details */}
            <div className="grid grid-cols-2 gap-3">
              {formData.damageAssessment.severity && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs font-medium text-gray-600 mb-1">Severity</div>
                  <div className="text-sm text-gray-900 capitalize">{formData.damageAssessment.severity}</div>
                </div>
              )}
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-xs font-medium text-gray-600 mb-1">Repair Required</div>
                <div className="text-sm text-gray-900">
                  {formData.damageAssessment.repairRequired ? 'Yes' : 'No'}
                </div>
              </div>
              {formData.damageAssessment.inspectorName && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs font-medium text-gray-600 mb-1">Inspector</div>
                  <div className="text-sm text-gray-900">{formData.damageAssessment.inspectorName}</div>
                </div>
              )}
              {formData.damageAssessment.inspectionDate && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs font-medium text-gray-600 mb-1">Inspection Date</div>
                  <div className="text-sm text-gray-900">
                    {new Date(formData.damageAssessment.inspectionDate).toLocaleDateString()}
                  </div>
                </div>
              )}
              {formData.damageAssessment.repairRequired && formData.damageAssessment.estimatedCost && (
                <div className="p-3 rounded-lg bg-gray-50 col-span-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">Estimated Repair Cost</div>
                  <div className="text-sm text-gray-900 font-medium">
                    ${formData.damageAssessment.estimatedCost.toFixed(2)} USD
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900">No Damage Reported</p>
            <p className="text-xs text-green-700 mt-1">Container is in good condition</p>
          </div>
        )}
      </div>

      {/* Action Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h5 className="text-sm font-medium text-blue-900 mb-1">Ready to Save</h5>
            <p className="text-xs text-blue-700">
              Click "Save Changes" to update the container information. All changes will be logged 
              in the audit trail for compliance and tracking purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
