import React, { useState, useCallback } from 'react';
import { DataDisplayModalProps, NotificationState } from './types';
import { StandardModal } from './StandardModal';
import { ModalFooter } from './components/ModalFooter';
import { NotificationArea } from './components/NotificationArea';

export const DataDisplayModal: React.FC<DataDisplayModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  data,
  actions = [],
  sections = [],
  size = 'lg',
  showCloseButton = true,
  preventBackdropClose = false,
  className = ''
}) => {
  const [notification, setNotification] = useState<NotificationState>({
    type: 'info',
    message: '',
    show: false,
    autoHide: true,
    duration: 1500
  });

  const showNotification = useCallback((
    type: NotificationState['type'],
    message: string,
    options?: { autoHide?: boolean; duration?: number }
  ) => {
    setNotification({
      type,
      message,
      show: true,
      autoHide: options?.autoHide ?? (type === 'success'),
      duration: options?.duration ?? 1500
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  const handleActionClick = async (action: any) => {
    if (action.loading) return;

    try {
      await action.onClick();
      if (action.variant === 'danger') {
        showNotification('success', 'Action completed successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showNotification('error', `Action failed: ${errorMessage}`, { autoHide: false });
    }
  };

  const renderDataSection = (section: any) => {
    const { id, title, icon: SectionIcon, data: sectionData, layout = 'grid' } = section;

    return (
      <div key={id} className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
          {SectionIcon && <SectionIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600 flex-shrink-0" />}
          <span className="truncate">{title}</span>
        </h4>
        
        {layout === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {Object.entries(sectionData).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <dt className="text-xs sm:text-sm font-medium text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </dt>
                <dd className="text-sm sm:text-sm text-gray-900 break-words">
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
                <dt className="text-xs sm:text-sm font-medium text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </dt>
                <dd className="text-sm text-gray-900 font-medium break-words">
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
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 break-words">
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
      hideDefaultFooter={true}
    >
      {/* Notification Area */}
      <NotificationArea
        notification={notification}
        onDismiss={hideNotification}
      />

      {/* Data Content */}
      <div className="space-y-6">
        {/* Render predefined sections */}
        {sections.map(renderDataSection)}

        {/* Render custom children */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              data,
              showNotification,
              hideNotification
            } as any);
          }
          return child;
        })}
      </div>

      {/* Actions Footer */}
      {actions.length > 0 && (
        <ModalFooter justify="end">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary mobile-button order-last sm:order-first"
            >
              Close
            </button>
            {actions.map((action, index) => {
              const buttonClass = {
                primary: 'btn-primary',
                secondary: 'btn-secondary',
                danger: 'btn-danger',
                success: 'btn-success'
              }[action.variant || 'primary'];

              const IconComponent = action.icon;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled || action.loading}
                  className={`${buttonClass} mobile-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {action.loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Loading...</span>
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
        </ModalFooter>
      )}
    </StandardModal>
  );
};