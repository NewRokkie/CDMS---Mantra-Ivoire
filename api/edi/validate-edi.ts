/**
 * Vercel Serverless Function: Validate EDI format
 * Replaces Flask endpoint: POST /api/v1/codeco/validate-edi
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

function validateEDIFormat(ediContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ediContent?.trim()) {
    errors.push('EDI content is empty');
    return { isValid: false, errors };
  }

  // Check for basic EDIFACT structure
  if (!ediContent.includes('UNB+')) {
    errors.push('Missing UNB segment (message envelope)');
  }

  if (!ediContent.includes('UNH+')) {
    errors.push('Missing UNH segment (message header)');
  }

  if (!ediContent.includes('UNT+')) {
    errors.push('Missing UNT segment (message trailer)');
  }

  if (!ediContent.includes('UNZ+')) {
    errors.push('Missing UNZ segment (envelope closing)');
  }

  // Check for CODECO specific segments
  if (!ediContent.includes('CODECO')) {
    errors.push('Not a CODECO message type');
  }

  // Check segment termination
  if (!ediContent.includes("'")) {
    errors.push("Missing segment terminators (')");
  }

  // Check for proper segment structure
  const segments = ediContent.split("'").filter(s => s.trim());
  for (const segment of segments) {
    if (segment.trim() && !segment.includes('+')) {
      errors.push(`Invalid segment structure: ${segment.slice(0, 20)}...`);
      break;
    }
  }

  // Validate UNT segment count
  const untMatch = ediContent.match(/UNT\+(\d+)\+/);
  if (untMatch) {
    const declaredCount = parseInt(untMatch[1], 10);
    // Count segments between UNH and UNT (inclusive)
    const unhIndex = segments.findIndex(s => s.startsWith('UNH'));
    const untIndex = segments.findIndex(s => s.startsWith('UNT'));
    
    if (unhIndex !== -1 && untIndex !== -1) {
      const actualCount = untIndex - unhIndex + 1;
      if (declaredCount !== actualCount) {
        errors.push(
          `Segment count mismatch: UNT declares ${declaredCount}, actual is ${actualCount}. ` +
          `Count should include UNH and UNT segments`
        );
      }
    }
  }

  // Validate UNB/UNZ interchange reference matching
  const unbMatch = ediContent.match(/UNB\+[^+]*\+[^+]*\+[^+]*\+[^+]*\+([^+]+)\+/);
  const unzMatch = ediContent.match(/UNZ\+[^+]*\+([^']+)/);
  
  if (unbMatch && unzMatch) {
    const unbRef = unbMatch[1];
    const unzRef = unzMatch[1];
    
    if (unbRef !== unzRef) {
      errors.push(
        `Interchange reference mismatch: UNB reference '${unbRef}' does not match UNZ reference '${unzRef}'. ` +
        `Interchange control reference in UNZ must match UNB`
      );
    }
  }

  return { isValid: errors.length === 0, errors };
}

function parseEDIBasicInfo(ediContent: string): Record<string, any> | null {
  try {
    const info: Record<string, any> = {};

    // Extract container number from COD or EQD segment
    const codMatch = ediContent.match(/COD\+([^+]+)\+([^+]+)\+([^']+)/);
    if (codMatch) {
      info.container_number = codMatch[1];
      info.container_size = codMatch[2];
      info.container_status = codMatch[3];
    } else {
      const eqdMatch = ediContent.match(/EQD\+[^+]*\+([^+']*)/);
      if (eqdMatch) {
        info.container_number = eqdMatch[1];
      }
    }

    // Extract message type
    const unhMatch = ediContent.match(/UNH\+[^+]*\+([^:]+)/);
    if (unhMatch) {
      info.message_type = unhMatch[1];
    }

    // Extract sender/receiver
    const unbMatch = ediContent.match(/UNB\+[^+]*\+([^+]+)\+([^+]+)/);
    if (unbMatch) {
      info.sender = unbMatch[1];
      info.receiver = unbMatch[2];
    }

    // Extract document number
    const bgmMatch = ediContent.match(/BGM\+[^+]*\+([^+]*)\+([^']*)/);
    if (bgmMatch) {
      info.document_number = bgmMatch[1];
      info.message_function = bgmMatch[2];
    }

    return Object.keys(info).length > 0 ? info : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const ediContent = req.body?.edi_content;

    if (!ediContent) {
      return res.status(400).json({
        status: 'error',
        message: "Request body must contain 'edi_content' field"
      });
    }

    // Validate EDI format
    const { isValid, errors: validationErrors } = validateEDIFormat(ediContent);

    // Try to parse basic info
    const parsedData = parseEDIBasicInfo(ediContent);
    const parsingErrors: string[] = [];

    if (!parsedData && isValid) {
      parsingErrors.push('Could not extract container information from EDI content');
    }

    return res.status(200).json({
      status: isValid ? 'success' : 'validation_failed',
      is_valid: isValid,
      validation_errors: validationErrors,
      parsing_errors: parsingErrors,
      parsed_data: parsedData,
      message: 'EDI validation completed'
    });

  } catch (error) {
    console.error('EDI validation error:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
