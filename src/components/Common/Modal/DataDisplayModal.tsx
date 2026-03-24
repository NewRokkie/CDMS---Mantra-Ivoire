import React from 'react';
import { DataDisplayModalProps } from './types';
import { StandardModal } from './StandardModal';
import { useToast } from '../../../hooks/useToast';

export const DataDisplayModal: React.FC<DataDisplayModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions = [],
  sections = [],
  size = 'lg',
  showCloseButton = true,
  preventBackdropClose = false,
  className = ''
}) => {
  const { success, error } = useToast();

  const handleActionClick = async (action: any) => {
    if (action.loading) return;

    try {
      await action.onClick();
      if (action.variant !== 'danger') {
        success('Action completed successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      error(`Action failed: ${errorMessage}`);
    }
  };

  const renderDataSection = (section: any) => {
    const { id, title, icon: SectionIcon, data: sectionData, layout = 'grid' } = section;

    return (
      <div key={id} className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200">
        <h4 className="h4 text-gray-900 mb-3 sm:mb-4 flex items-center">
          {SectionIcon && <SectionIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600 flex-shrink-0" />}
          <span className="truncate">{title}</span>
        </h4>

        {layout === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {Object.entries(sectionData).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <dt className="label text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </dt>
                <dd className="body-sm text-gray-900 break-words">
                  {value as string || '-'}
                </dd>
              </div>
            ))}
          </div>
        )}

        {layout === 'list' && (
          <div className="space-y-2 sm:space-y-3">
            {Object.entries(sectionData).map(([key, value]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-100 last:border-b-0 space-y-1 sm:space-y-0">
                <dt className="label text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </dt>
                <dd className="body-sm text-gray-900 font-medium break-words">
                  {value as string || '-'}
                </dd>
              </div>
            ))}
          </div>
        )}

        {layout === 'table' && (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                {Object.entries(sectionData).map(([key, value]) => (
                  <tr key={key}>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 label text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 body-sm text-gray-900 break-words">
                      {value as string || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      size={size}
      showCloseButton={showCloseButton}
      preventBackdropClose={preventBackdropClose}
      className={className}
      customFooter={actions.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors font-inter antialiased order-last sm:order-first"
          >
            Fermer
          </button>
          {actions.map((action, index) => {
            const variantClasses = {
              primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20',
              secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
              danger: 'bg-red-600 text-white hover:bg-red-500 shadow-red-500/20',
              success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
            }[action.variant || 'primary'];

            const IconComponent = action.icon;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleActionClick(action)}
                disabled={action.disabled || action.loading}
                className={`
                  relative px-7 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 font-inter antialiased
                  ${variantClasses}
                  ${(action.disabled || action.loading) ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                `}
              >
                {action.loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Chargement...</span>
                  </>
                ) : (
                  <>
                    {IconComponent && <IconComponent className="h-4 w-4" />}
                    <span>{action.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      ) : undefined}
    >
      {/* Data Content */}
      <div className="space-y-6">
        {/* Render predefined sections */}
        {sections.map(renderDataSection)}

        {/* Render custom children */}
        {children}
      </div>
    </StandardModal>
  );
};
