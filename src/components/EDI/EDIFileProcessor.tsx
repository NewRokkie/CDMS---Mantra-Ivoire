import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Loader,
  Download
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { ediConversionService } from '../../services/edi/ediConversionService';
import { useEDIFiles, ProcessedFile } from '../../contexts/EDIFileContext';
import { CodecoGenerator, parseSAPXML } from '../../services/edi/codecoGenerator';

interface EDIFileProcessorProps {
  onProcessComplete?: (result: any) => void;
}

export const EDIFileProcessor: React.FC<EDIFileProcessorProps> = ({ onProcessComplete }) => {
  const { files, addFiles, updateFile, removeFile, clearFiles } = useEDIFiles();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFiles = (fileList: File[]) => {
    const validFiles = fileList.filter(file => {
      const isValidType = file.type === 'text/plain' || 
                         file.type === 'application/xml' || 
                         file.type === 'text/xml' ||
                         file.name.toLowerCase().endsWith('.txt') ||
                         file.name.toLowerCase().endsWith('.xml') ||
                         file.name.toLowerCase().endsWith('.edi');
      
      if (!isValidType) {
        toast.error(`Invalid file type: ${file.name}. Only TXT, XML, and EDI files are supported.`);
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        return false;
      }
      
      return true;
    });

    const newFiles: ProcessedFile[] = validFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'text/plain',
      status: 'pending',
      progress: 0,
      uploadedAt: new Date(),
      file: file // Store the original File object
    }));

    addFiles(newFiles);
    
    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} file(s) added for processing`);
      // Auto-process files directly with the file data
      newFiles.forEach(processedFile => {
        processFileWithData(processedFile);
      });
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const processFileWithData = async (fileData: ProcessedFile) => {
    const fileId = fileData.id;
    
    updateFile(fileId, { status: 'processing', progress: 0 });

    try {
      if (!fileData.file) {
        throw new Error('File object not available');
      }

      // Determine processing type based on file extension
      const isEdiFile = fileData.name.toLowerCase().endsWith('.edi');
      const isXmlFile = fileData.name.toLowerCase().endsWith('.xml');

      // Progress update function
      const updateProgress = (progress: number) => {
        updateFile(fileId, { progress });
      };

      if (isEdiFile) {
        // Process EDI to XML conversion
        await processEdiToXml(fileId, fileData.file, updateProgress);
      } else if (isXmlFile) {
        // Process XML to EDI conversion (existing functionality)
        await processXmlToEdi(fileId, fileData.file, updateProgress);
      } else {
        // Generic processing for TXT files
        await processGenericFile(fileId, updateProgress);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateFile(fileId, { status: 'error', progress: 100, errorMessage });
      toast.error(`Processing failed: ${errorMessage}`);
    }
  };

  const processEdiToXml = async (fileId: string, file: File, updateProgress?: (progress: number) => void) => {
    try {
      updateProgress?.(10);

      // First check if API is available
      try {
        await ediConversionService.checkHealth();
        updateProgress?.(20);
      } catch (healthError) {
        console.warn('Internal EDI service health check failed:', healthError);
        updateProgress?.(20);
      }

      updateProgress?.(30);

      // Use the EDI conversion service
      const result = await ediConversionService.convertEDIFileToXML(file);
      updateProgress?.(70);

      // Extract container information
      const containerInfo = result.parsed_edi_data?.container_details;
      const containerNumber = containerInfo?.container_number || 'Unknown';

      updateProgress?.(100);

      const processResult = {
        containersProcessed: 1,
        transmissionsSent: 1,
        errors: [],
        conversionType: 'EDI → XML',
        xmlContent: result.xml_content,
        xmlFile: result.xml_file,
        containerNumber,
        containerSize: containerInfo?.container_size,
        containerStatus: containerInfo?.container_status
      };

      updateFile(fileId, { status: 'success', progress: 100, result: processResult });

      toast.success(`EDI file successfully converted to XML (Container: ${containerNumber})`);
      onProcessComplete?.(processResult);

    } catch (error) {
      console.error('EDI to XML conversion error:', error);
      throw error;
    }
  };

  const processXmlToEdi = async (fileId: string, file: File, updateProgress?: (progress: number) => void) => {
    try {
      updateProgress?.(10);

      // Read XML file content
      const xmlContent = await ediConversionService.readFileContent(file);
      updateProgress?.(30);

      // Parse XML to extract container data
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid XML format');
      }

      updateProgress?.(40);

      // Parse SAP XML using the new CODECO generator
      const messageData = parseSAPXML(xmlContent);
      updateProgress?.(50);

      // Generate complete CODECO message
      const generator = new CodecoGenerator();
      const ediContent = generator.generateFromSAPData(messageData);
      updateProgress?.(80);

      // Generate filename
      const timestamp = new Date();
      const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = timestamp.toTimeString().slice(0, 8).replace(/:/g, '');
      const ediFileName = `CODECO_${messageData.containerNumber}_${dateStr}_${timeStr}.edi`;

      updateProgress?.(100);

      const result = {
        containersProcessed: 1,
        transmissionsSent: 1,
        errors: [],
        conversionType: 'XML → EDI (CODECO UN/EDIFACT D.95B)',
        containerNumber: messageData.containerNumber,
        containerSize: messageData.containerSize,
        xmlContent: ediContent,
        xmlFile: ediFileName,
        details: {
          vehicleNumber: messageData.vehicleNumber,
          customer: messageData.customer
        }
      };

      updateFile(fileId, { status: 'success', progress: 100, result });

      toast.success(`XML successfully converted to CODECO EDI (Container: ${messageData.containerNumber})`);
      onProcessComplete?.(result);

    } catch (error) {
      console.error('XML to EDI conversion error:', error);
      throw error;
    }
  };

  const processGenericFile = async (fileId: string, updateProgress?: (progress: number) => void) => {
    try {
      // Simulate generic file processing
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 300));
        updateProgress?.(progress);
      }

      const result = {
        containersProcessed: 1,
        transmissionsSent: 1,
        errors: [],
        conversionType: 'Generic Processing'
      };

      updateFile(fileId, { status: 'success', progress: 100, result });

      toast.success('File processed successfully');
      onProcessComplete?.(result);
    } catch (error) {
      throw error;
    }
  };

  const handleRemoveFile = (fileId: string) => {
    removeFile(fileId);
  };

  const clearAllFiles = () => {
    clearFiles();
  };

  const downloadSample = () => {
    // Create sample EDI file content with proper segment counts and reference matching
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 12);
    const dateOnly = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sampleContent = `UNB+UNOC:3+SENDER:ZZ+RECEIVER:ZZ+${timestamp}+REF001++CODECO'
UNH+1+CODECO:D:95B:UN:ITG12'
BGM+34+EDI001+9'
DTM+137:${dateOnly}:102'
NAD+CA+MAERSK:172:20'
EQD+CN+PCIU9507070+22G1:102:5++2+5'
LOC+147+DEPOT001:139:6'
DTM+7:${dateOnly}:102'
UNT+8+1'
UNZ+1+REF001'`;

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_codeco.edi';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Sample EDI file downloaded');
  };

  const downloadConvertedFile = (content: string, filename: string) => {
    try {
      // Determine file type based on extension
      const isXml = filename.toLowerCase().endsWith('.xml');
      const mimeType = isXml ? 'application/xml' : 'text/plain';
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`File downloaded: ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: ProcessedFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-5 w-5 text-gray-500" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">EDI File Processor</h3>
          <div className="flex space-x-3">
            <button
              onClick={downloadSample}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Sample</span>
            </button>
            {files.length > 0 && (
              <button
                onClick={clearAllFiles}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Drop EDI files here
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              or click to select files
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Select Files</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.xml,.edi"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-3">
              Supported: TXT, XML, EDI (Max 10MB)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              • EDI files → Convert to XML
              • XML files → Convert to EDI
              • TXT files → Process as EDI data
            </p>
          </div>

          {/* File List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Files ({files.length})</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((file) => (
                <div key={file.id} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(file.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {file.uploadedAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  {file.status === 'processing' && (
                    <div className="mb-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Processing... {file.progress}%</p>
                    </div>
                  )}

                  {/* Results */}
                  {file.status === 'success' && file.result && (
                    <div className="bg-green-50 p-2 rounded text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-green-800">
                          {file.result.containersProcessed} containers processed
                        </div>
                        {file.result.xmlContent && (
                          <button
                            onClick={() => downloadConvertedFile(file.result!.xmlContent!, file.result!.xmlFile || 'converted.xml')}
                            className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                      {file.result.conversionType && (
                        <div className="text-green-700 font-medium">
                          ✓ {file.result.conversionType}
                        </div>
                      )}
                      {file.result.containerNumber && (
                        <div className="text-green-600">
                          📦 Container: {file.result.containerNumber}
                          {file.result.containerSize && ` (${file.result.containerSize}ft)`}
                        </div>
                      )}
                      {file.result.xmlFile && (
                        <div className="text-green-600">
                          📄 {file.result.xmlFile}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {file.status === 'error' && file.errorMessage && (
                    <div className="bg-red-50 p-2 rounded text-xs">
                      <span className="text-red-800">{file.errorMessage}</span>
                    </div>
                  )}
                </div>
              ))}
              {files.length === 0 && (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No files uploaded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};