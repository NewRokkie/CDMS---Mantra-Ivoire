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

interface EDISegment {
  tag: string;
  elements: string[];
  description?: string;
}

interface FormattedEDI {
  segments: EDISegment[];
  raw: string;
}

interface EDIValidatorProps {
  onValidationComplete?: (result: EDIValidationResponse) => void;
}

const EDIValidatorComponent: React.FC<EDIValidatorProps> = ({ onValidationComplete }) => {
  const [ediContent, setEdiContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<EDIValidationResponse | null>(null);
  const [formattedEDI, setFormattedEDI] = useState<FormattedEDI | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const toast = useToast();

  // Segment descriptions for better readability
  const segmentDescriptions: Record<string, string> = {
    'UNB': 'Interchange Header',
    'UNH': 'Message Header',
    'BGM': 'Beginning of Message',
    'DTM': 'Date/Time/Period',
    'NAD': 'Name and Address',
    'COD': 'Container Details',
    'EQD': 'Equipment Details',
    'LOC': 'Place/Location Identification',
    'MEA': 'Measurements',
    'UNT': 'Message Trailer',
    'UNZ': 'Interchange Trailer'
  };

  const parseEDIContent = (content: string): FormattedEDI => {
    const segments: EDISegment[] = [];
    const rawSegments = content.split("'").filter(s => s.trim());

    for (const raw of rawSegments) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const parts = trimmed.split('+');
      if (parts.length < 1) continue;

      const tag = parts[0].trim();
      const elements = parts.slice(1).map(p => p.trim());

      segments.push({
        tag,
        elements,
        description: segmentDescriptions[tag] || 'Unknown Segment'
      });
    }

    return { segments, raw: content };
  };

  const handleValidate = async () => {
    if (!ediContent.trim()) {
      toast.error('Please enter EDI content to validate');
      return;
    }

    setIsValidating(true);
    
    try {
      // Parse and format EDI content
      const formatted = parseEDIContent(ediContent);
      setFormattedEDI(formatted);

      // Expand all segments by default
      const allIndices = formatted.segments.map((_, i) => i);
      setExpandedSegments(new Set(allIndices));

      // Validate EDI
      const result = await ediConversionService.validateEDI(ediContent);
      setValidationResult(result);
      onValidationComplete?.(result);
      
      if (result.is_valid) {
        toast.success('EDI validation passed');
      } else {
        toast.warning('EDI validation failed - see details below');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setValidationResult(null);
      setFormattedEDI(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    setEdiContent('');
    setValidationResult(null);
    setFormattedEDI(null);
    setExpandedSegments(new Set());
  };

  const handleCopyResult = () => {
    if (formattedEDI) {
      const formattedText = formattedEDI.segments.map(seg => 
        `${seg.tag} - ${seg.description}\n  ${seg.elements.map((el, i) => `[${i + 1}] ${el}`).join('\n  ')}`
      ).join('\n\n');
      navigator.clipboard.writeText(formattedText);
      toast.success('Formatted EDI copied to clipboard');
    }
  };

  const handleDownloadResult = () => {
    if (formattedEDI && validationResult) {
      const output = {
        validation: validationResult,
        formatted: formattedEDI.segments.map(seg => ({
          tag: seg.tag,
          description: seg.description,
          elements: seg.elements
        })),
        raw: formattedEDI.raw
      };
      
      const resultText = JSON.stringify(output, null, 2);
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
    // Valid CODECO EDI sample with realistic container gate-in data
    // Includes all commonly used segments with proper structure
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const dateOnly = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refNumber = `REF${dateOnly}`;
    
    const sampleEDI = `UNB+UNOC:3+CIABJ31+MAERSK+${dateOnly}+${refNumber}+${timestamp.slice(8, 14)}'UNH+1+CODECO:D:95B:UN:EANCOM'BGM+393+DOC${timestamp}+9'DTM+137:${timestamp}:204'NAD+TO+CIABJ31++TERMINAL OPERATOR'NAD+FR+MAERSK++MAERSK LINE'NAD+SH+CUST001++CUSTOMER NAME LTD'LOC+87+CIABJ31'EQD+CN+MSCU1234567+45G1:102:5++2+5'MEA+AAE+WT+KGM:24000'DTM+7:${timestamp}:204'LOC+9+GATE01'LOC+11+STACK_A01'UNT+13+1'UNZ+1+${refNumber}'`;
    
    setEdiContent(sampleEDI);
    setValidationResult(null);
    setFormattedEDI(null);
    setExpandedSegments(new Set());
    toast.success('Sample EDI content loaded - Gate-in container MSCU1234567');
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
        {(validationResult || formattedEDI) && (
          <div className="space-y-6">
            {/* Validation Banner */}
            {validationResult && (
              <div 
                className={`w-full border rounded-lg p-3 flex items-center gap-3 shadow-sm ${
                  validationResult.is_valid 
                    ? 'border-green-400 bg-green-50 text-green-800' 
                    : 'border-red-400 bg-red-50 text-red-800'
                }`}
                role="alert"
              >
                <div className="flex-shrink-0">
                  {validationResult.is_valid ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div className="text-sm sm:text-base">
                  <span className="font-bold">
                    {validationResult.is_valid ? 'Validation Successful.' : 'Validation Failed.'}
                  </span>
                  {' '}
                  <span>
                    {validationResult.is_valid 
                      ? 'EDI structure and segments are compliant.' 
                      : 'Please review the errors below.'}
                  </span>
                </div>
              </div>
            )}

            {/* Erreurs de validation */}
            {validationResult && (validationResult.validation_errors.length > 0 || validationResult.parsing_errors.length > 0) && (
              <div className="space-y-4">
                {validationResult.validation_errors.length > 0 && (
                  <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center">
                          <XCircle className="h-3 w-3 text-rose-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-rose-800 mb-2">
                          Validation Errors
                        </h4>
                        <div className="space-y-1.5">
                          {validationResult.validation_errors.map((error, index) => (
                            <div key={index} className="text-sm text-rose-700 flex items-start">
                              <span className="mr-2">•</span>
                              <span className="flex-1">{error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {validationResult.parsing_errors.length > 0 && (
                  <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-amber-800 mb-2">
                          Parsing Warnings
                        </h4>
                        <div className="space-y-1.5">
                          {validationResult.parsing_errors.map((error, index) => (
                            <div key={index} className="text-sm text-amber-700 flex items-start">
                              <span className="mr-2">•</span>
                              <span className="flex-1">{error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dashboard Layout: Two Columns */}
            {formattedEDI && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Segments Overview */}
                <section className="lg:col-span-5 flex flex-col gap-2">
                  <h2 className="text-xl font-medium text-slate-900 mb-2">
                    Segments Overview
                  </h2>
                  
                  <nav aria-label="Segments List" className="flex flex-col gap-1">
                    {formattedEDI.segments.map((segment, index) => (
                      <div
                        key={index}
                        onClick={() => setExpandedSegments(new Set([index]))}
                        className={`flex items-center gap-3 p-2 pl-3 rounded-md cursor-pointer transition-colors ${
                          expandedSegments.has(index) && expandedSegments.size === 1
                            ? 'bg-slate-400 shadow-sm'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex-shrink-0 text-green-600">
                          <CheckCircle className="h-6 w-6" />
                        </div>
                        <span className={`text-sm sm:text-base ${
                          expandedSegments.has(index) && expandedSegments.size === 1
                            ? 'font-medium text-slate-900'
                            : 'text-slate-700'
                        }`}>
                          <span className="font-bold">{segment.tag}</span> {segment.description} ({segment.elements.length} elements)
                        </span>
                      </div>
                    ))}
                  </nav>
                </section>

                {/* Right Column: Segment Details */}
                <section className="lg:col-span-7">
                  {expandedSegments.size === 1 && Array.from(expandedSegments).map(index => {
                    const segment = formattedEDI.segments[index];
                    return (
                      <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                          <h3 className="text-xl font-normal text-slate-800">
                            Segment Details: {segment.tag} {segment.description}
                          </h3>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCopyResult}
                              aria-label="Copy to clipboard"
                              className="p-2 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                            >
                              <Copy className="h-5 w-5" />
                            </button>
                            <button
                              onClick={handleDownloadResult}
                              aria-label="Download"
                              className="p-2 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* Code/Content Block */}
                        <div className="rounded-lg overflow-x-auto bg-slate-100 p-4">
                          <pre className="font-mono text-sm text-slate-700 leading-relaxed whitespace-pre">
                            {segment.elements.map((element, elemIndex) => {
                              const lines: string[] = [];
                              lines.push(`[${elemIndex + 1}] ${element || '(empty)'}`);
                              
                              // Show composite elements if present
                              if (element && element.includes(':')) {
                                lines.push('\nComposite elements:');
                                element.split(':').forEach((comp, compIndex) => {
                                  lines.push(`  [${elemIndex + 1}]:${compIndex + 1} ${comp}`);
                                });
                              }
                              
                              return lines.join('\n');
                            }).join('\n\n')}
                          </pre>
                        </div>
                      </div>
                    );
                  })}

                  {/* Show message when no segment is selected or multiple are expanded */}
                  {(expandedSegments.size === 0 || expandedSegments.size > 1) && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 flex items-center justify-center min-h-[300px]">
                      <div className="text-center text-slate-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-lg">Select a segment to view details</p>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary unmounts when parent re-renders
export const EDIValidator = React.memo(EDIValidatorComponent);