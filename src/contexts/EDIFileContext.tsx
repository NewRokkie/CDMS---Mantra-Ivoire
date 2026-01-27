import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProcessedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  result?: {
    containersProcessed: number;
    transmissionsSent: number;
    errors: string[];
    conversionType?: string;
    xmlContent?: string;
    xmlFile?: string;
    containerNumber?: string;
    containerSize?: string;
    containerStatus?: string;
  };
  errorMessage?: string;
  uploadedAt: Date;
  file?: File;
}

interface EDIFileContextType {
  files: ProcessedFile[];
  addFiles: (files: ProcessedFile[]) => void;
  updateFile: (id: string, updates: Partial<ProcessedFile>) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

const EDIFileContext = createContext<EDIFileContextType | undefined>(undefined);

export const EDIFileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);

  const addFiles = (newFiles: ProcessedFile[]) => {
    console.log('EDIFileContext - Adding files:', newFiles.length);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const updateFile = (id: string, updates: Partial<ProcessedFile>) => {
    console.log('EDIFileContext - Updating file:', id);
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFile = (id: string) => {
    console.log('EDIFileContext - Removing file:', id);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearFiles = () => {
    console.log('EDIFileContext - Clearing all files');
    setFiles([]);
  };

  return (
    <EDIFileContext.Provider value={{ files, addFiles, updateFile, removeFile, clearFiles }}>
      {children}
    </EDIFileContext.Provider>
  );
};

export const useEDIFiles = () => {
  const context = useContext(EDIFileContext);
  if (context === undefined) {
    throw new Error('useEDIFiles must be used within an EDIFileProvider');
  }
  return context;
};

export type { ProcessedFile };