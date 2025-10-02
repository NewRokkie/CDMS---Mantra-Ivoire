import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';

interface DesktopOnlyMessageProps {
  moduleName: string;
  reason?: string;
}

export const DesktopOnlyMessage: React.FC<DesktopOnlyMessageProps> = ({
  moduleName,
  reason = "This module requires a larger screen for optimal performance and usability."
}) => {
  return (
    <>
      {/* Mobile View - Show Message */}
      <div className="lg:hidden min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6 border border-slate-200">
            {/* Icon */}
            <div className="flex justify-center space-x-4">
              <div className="p-4 bg-slate-100 rounded-2xl">
                <Smartphone className="h-12 w-12 text-slate-400" />
              </div>
              <div className="flex items-center">
                <div className="h-0.5 w-8 bg-slate-300"></div>
              </div>
              <div className="p-4 bg-blue-100 rounded-2xl">
                <Monitor className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Desktop Only
              </h2>
              <p className="text-lg font-semibold text-slate-700">
                {moduleName}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                {reason}
              </p>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Please access this module from a desktop or laptop computer for the best experience.
                </p>
              </div>
            </div>

            {/* Decorative Element */}
            <div className="flex items-center justify-center space-x-2 pt-4">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-blue-200"></div>
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Minimum screen width: 1024px (lg breakpoint)
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View - Hidden on mobile but rendered on desktop */}
      <div className="hidden lg:block">
        {/* This will be the actual module content */}
      </div>
    </>
  );
};
