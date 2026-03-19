import React from 'react';
import { Package, MapPin, Building2, AlertTriangle, CheckCircle, ArrowRight, Container, FileCheck, Shield } from 'lucide-react';
import { Container as ContainerType } from '../../../types';
import { ContainerFormData } from '../ContainerEditModal';

interface ReviewStepProps {
  formData: ContainerFormData;
  container: ContainerType;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ formData, container }) => {
  const hasChanges = (field: keyof ContainerType, newValue: any) => {
    return container[field] !== newValue;
  };

  const ChangeIndicator = ({ changed }: { changed: boolean }) => (
    changed ? (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        Modified
      </span>
    ) : null
  );

  const ComparisonRow = ({ label, oldValue, newValue, changed, icon: Icon }: {
    label: string;
    oldValue: any;
    newValue: any;
    changed: boolean;
    icon?: React.ElementType;
  }) => (
    <div className={`p-4 rounded-xl transition-all ${changed ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700'}`}>
      <div className="flex items-center space-x-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </div>
      {changed ? (
        <div className="flex items-center space-x-3 text-sm">
          <span className="text-gray-400 line-through">{oldValue || '-'}</span>
          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{newValue || '-'}</span>
        </div>
      ) : (
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{newValue || '-'}</div>
      )}
    </div>
  );

  const SectionCard = ({ title, icon: Icon, color, children, hasModification }: {
    title: string;
    icon: React.ElementType;
    color: string;
    children: React.ReactNode;
    hasModification?: boolean;
  }) => {
    const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-800' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-800' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-800' },
    };

    const colors = colorClasses[color] || colorClasses.blue;

    return (
      <div className="depot-section overflow-hidden">
        <div className={`flex items-center justify-between mb-5 pb-4 border-b ${colors.border}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${colors.icon}`} />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{title}</h4>
          </div>
          {hasModification && <ChangeIndicator changed={true} />}
        </div>
        {children}
      </div>
    );
  };

  return (
    <div className="depot-step-spacing">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Review Changes</h3>
              <p className="text-blue-100 text-sm">Please verify all changes before saving</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Container</div>
            <div className="font-mono text-lg font-semibold">{formData.number}</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
          <p className="text-sm text-blue-50">
            Modified fields are highlighted in <span className="font-semibold text-amber-300">amber</span>. Review carefully before confirming.
          </p>
        </div>
      </div>

      {/* Basic Information */}
      <SectionCard
        title="Basic Information"
        icon={Container}
        color="blue"
        hasModification={hasChanges('number', formData.number) ||
          hasChanges('type', formData.type) ||
          hasChanges('size', formData.size) ||
          hasChanges('status', formData.status)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ComparisonRow
            label="Container Number"
            oldValue={container.number}
            newValue={formData.number}
            changed={hasChanges('number', formData.number)}
            icon={Package}
          />
          <ComparisonRow
            label="Container Type"
            oldValue={container.type}
            newValue={formData.type}
            changed={hasChanges('type', formData.type)}
          />
          <ComparisonRow
            label="Container Size"
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
      </SectionCard>

      {/* Location Information */}
      <SectionCard
        title="Location Assignment"
        icon={MapPin}
        color="green"
        hasModification={hasChanges('location', formData.location)}
      >
        <div className="space-y-4">
          <ComparisonRow
            label="Current Location"
            oldValue={container.location}
            newValue={formData.location}
            changed={hasChanges('location', formData.location)}
            icon={MapPin}
          />
          {formData.locationId && (
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
              <div className="flex items-center space-x-2 text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                <Package className="h-3.5 w-3.5" />
                <span>Location ID</span>
              </div>
              <div className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{formData.locationId}</div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Client Information */}
      <SectionCard
        title="Client Assignment"
        icon={Building2}
        color="purple"
        hasModification={hasChanges('clientName', formData.client) || hasChanges('clientCode', formData.clientCode)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ComparisonRow
            label="Client Name"
            oldValue={container.clientName}
            newValue={formData.client}
            changed={hasChanges('clientName', formData.client)}
            icon={Building2}
          />
          <ComparisonRow
            label="Client Code"
            oldValue={container.clientCode}
            newValue={formData.clientCode}
            changed={hasChanges('clientCode', formData.clientCode)}
            icon={Package}
          />
        </div>
      </SectionCard>

      {/* Damage Assessment */}
      <SectionCard
        title="Damage Assessment"
        icon={Shield}
        color="red"
        hasModification={((container.damage?.length || 0) !== formData.damage.length)}
      >
        {formData.damageAssessment?.hasDamage ? (
          <div className="space-y-5">
            {/* Damage List */}
            {formData.damage.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Damage Descriptions ({formData.damage.length})</span>
                </div>
                <div className="space-y-2">
                  {formData.damage.map((damage, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">{index + 1}</span>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{damage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {formData.damageAssessment.severity && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Severity</div>
                  <div className={`text-sm font-semibold capitalize ${
                    formData.damageAssessment.severity === 'minor' ? 'text-yellow-600' :
                    formData.damageAssessment.severity === 'moderate' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {formData.damageAssessment.severity}
                  </div>
                </div>
              )}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Repair Required</div>
                <div className={`text-sm font-semibold ${formData.damageAssessment.repairRequired ? 'text-red-600' : 'text-green-600'}`}>
                  {formData.damageAssessment.repairRequired ? 'Yes' : 'No'}
                </div>
              </div>
              {formData.damageAssessment.inspectorName && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inspector</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formData.damageAssessment.inspectorName}</div>
                </div>
              )}
              {formData.damageAssessment.inspectionDate && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inspection Date</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(formData.damageAssessment.inspectionDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-base font-semibold text-green-900 dark:text-green-100">No Damage Reported</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">Container is in good condition</p>
          </div>
        )}
      </SectionCard>

      {/* Action Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-2">Ready to Save</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Click "Finish" to update the container information. All changes will be logged
              in the audit trail for compliance and tracking purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
