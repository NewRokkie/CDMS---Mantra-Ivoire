import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Loader,
  Copy,
  Download
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { ediConversionService, EDIValidationResponse } from '../../services/edi/ediConversionService';

interface EDIValidatorProps {
  onValidationComplete?: (result: EDIValidationResponse) => void;
}

export const EDIValidator: React.FC<EDIValidatorProps> = ({ onValidationComplete }) => {
  const [ediContent, setEdiContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<EDIValidationResponse | null>(null);
  const toast = useToast();

  const handleValidate = async () => {
    if (!ediContent.trim()) {
      toast.error('Please enter EDI content to validate');
      return;
    }

    setIsValidating(true);
    try {
      const result = await ediConversionService.validateEDI(ediContent);
      setValidationResult(result);
      onValidationComplete?.(result);
      
      if (result.is_valid) {
        toast.success('EDI validation passed');
      } else {
        toast.warning('EDI validation failed - see details below');
      }
    } catch (error) {
      toast.error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    setEdiContent('');
    setValidationResult(null);
  };

  const handleCopyResult = () => {
    if (validationResult) {
      const resultText = JSON.stringify(validationResult, null, 2);
      navigator.clipboard.writeText(resultText);
      toast.success('Validation result copied to clipboard');
    }
  };

  const handleDownloadResult = () => {
    if (validationResult) {
      const resultText = JSON.stringify(validationResult, null, 2);
      const blob = new Blob([resultText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edi_validation_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Validation result downloaded');
    }
  };

  const loadSampleEDI = () => {
    const sampleEDI = `UNB+UNOC:3+CIABJ31+419101+240101+1200+20240101120000'
UNH+1+CODECO:D:96A:UN:EANCOM'
BGM+393+PCIU9507070+9'
DTM+137:20240101120000:204'
NAD+TO+419101'
NAD+FR+PROPRE MOYEN++PROPRE MOYEN'
NAD+SH+0001052069'
LOC+87+419101'
COD+PCIU9507070+40+01'
UNT+11+1'
UNZ+1+20240101120000'`;
    
    setEdiContent(sampleEDI);
    setValidationResult(null);
    toast.success('Sample EDI content loaded');
  };

  const getStatusIcon = () => {
    if (!validationResult) return null;
    
    if (validationResult.is_valid) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!validationResult) return 'border-gray-200';
    
    return validationResult.is_valid 
      ? 'border-green-200 bg-green-50' 
      : 'border-red-200 bg-red-50';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">EDI Validator</h3>
          <div className="flex space-x-2">
            <button
              onClick={loadSampleEDI}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Load Sample
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* EDI Content Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            EDI CODECO Content
          </label>
          <textarea
            value={ediContent}
            onChange={(e) => setEdiContent(e.target.value)}
            placeholder="Paste your EDI CODECO content here..."
            className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter EDIFACT CODECO message content for validation
          </p>
        </div>

        {/* Validate Button */}
        <div className="flex justify-center">
          <button
            onClick={handleValidate}
            disabled={isValidating || !ediContent.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span>{isValidating ? 'Validating...' : 'Validate EDI'}</span>
          </button>
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <h4 className="font-medium text-gray-900">
                  Validation Results
                </h4>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyResult}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy results"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDownloadResult}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Download results"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${validationResult.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                  {validationResult.is_valid ? 'VALID' : 'INVALID'}
                </div>
                <div className="text-sm text-gray-600">Format Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResult.validation_errors.length}
                </div>
                <div className="text-sm text-gray-600">Validation Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {validationResult.parsing_errors.length}
                </div>
                <div className="text-sm text-gray-600">Parsing Errors</div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationResult.validation_errors.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-red-700 mb-2 flex items-center">
                  <XCircle className="h-4 w-4 mr-1" />
                  Validation Errors
                </h5>
                <ul className="space-y-1">
                  {validationResult.validation_errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Parsing Errors */}
            {validationResult.parsing_errors.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-orange-700 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Parsing Errors
                </h5>
                <ul className="space-y-1">
                  {validationResult.parsing_errors.map((error, index) => (
                    <li key={index} className="text-sm text-orange-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Parsed Data Preview */}
            {validationResult.parsed_data && (
              <div>
                <h5 className="font-medium text-green-700 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  Parsed Data Preview
                </h5>
                
                {/* Container Details */}
                {validationResult.parsed_data.container_details && (
                  <div className="bg-white rounded p-3 mb-3">
                    <h6 className="font-medium text-gray-700 mb-2">Container Details</h6>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Number:</span>
                        <span className="ml-2 font-mono">
                          {validationResult.parsed_data.container_details.container_number || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-2 font-mono">
                          {validationResult.parsed_data.container_details.container_size || 'N/A'}ft
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className="ml-2 font-mono">
                          {validationResult.parsed_data.container_details.container_status || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Info */}
                {validationResult.parsed_data.message_info && (
                  <div className="bg-white rounded p-3 mb-3">
                    <h6 className="font-medium text-gray-700 mb-2">Message Info</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Sender:</span>
                        <span className="ml-2 font-mono">
                          {validationResult.parsed_data.message_info.sender || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Receiver:</span>
                        <span className="ml-2 font-mono">
                          {validationResult.parsed_data.message_info.receiver || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Parties */}
                {validationResult.parsed_data.parties && validationResult.parsed_data.parties.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <h6 className="font-medium text-gray-700 mb-2">Parties</h6>
                    <div className="space-y-1 text-sm">
                      {validationResult.parsed_data.parties.map((party: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-gray-500 w-8">{party.party_qualifier}:</span>
                          <span className="font-mono">{party.party_identification}</span>
                          {party.name_and_address && (
                            <span className="text-gray-600">({party.name_and_address})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};