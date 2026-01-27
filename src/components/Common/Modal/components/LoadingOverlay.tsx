import React from 'react';
import { Loader } from 'lucide-react';
import { LoadingStateProps } from '../types';
import { 
  SkeletonStandardModal, 
  SkeletonFormModal, 
  SkeletonDataDisplayModal,
  SkeletonFormSection 
} from './SkeletonComponents';

interface LoadingOverlayProps extends LoadingStateProps {
  skeletonType?: 'standard' | 'form' | 'data' | 'section';
  skeletonProps?: any;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  skeleton = false,
  overlay = true,
  skeletonType = 'standard',
  skeletonProps = {}
}) => {
  if (!isLoading) return null;

  if (skeleton) {
    return <SkeletonLoader type={skeletonType} {...skeletonProps} />;
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
        <div className="flex flex-col items-center space-y-3">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600 font-medium">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-3">
        <Loader className="h-5 w-5 animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">{message}</span>
      </div>
    </div>
  );
};

// Enhanced skeleton loader component
interface SkeletonLoaderProps {
  type?: 'standard' | 'form' | 'data' | 'section';
  [key: string]: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'standard', 
  ...props 
}) => {
  switch (type) {
    case 'form':
      return <SkeletonFormModal {...props} />;
    case 'data':
      return <SkeletonDataDisplayModal {...props} />;
    case 'section':
      return <SkeletonFormSection {...props} />;
    case 'standard':
    default:
      return <SkeletonStandardModal {...props} />;
  }
};