/**
 * Vercel Serverless Function: Generate CODECO files (XML → EDI)
 * Replaces Flask endpoint: POST /api/v1/codeco/generate
 * 
 * This endpoint uses the CodecoGenerator class to generate EDI CODECO messages
 * matching the ONE LINE client format requirements.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CodecoGenerator, CodecoMessageData } from '../../src/services/edi/codecoGenerator';

interface CodecoRequest {
  // Header Information
  sender: string;
  receiver: string;
  companyCode: string;
  customer: string;
  
  // Container Information
  containerNumber: string;
  containerSize: string;
  containerType: string;
  
  // Transport Information
  transportCompany: string;
  vehicleNumber: string;
  
  // Operation Information
  operationType: 'GATE_IN' | 'GATE_OUT';
  operationDate: string;
  operationTime: string;
  
  // Reference Information
  bookingReference?: string;
  equipmentReference?: string;
  
  // Location Information
  locationCode: string;
  locationDetails: string;
  
  // Operator Information
  operatorName: string;
  operatorId: string;
  yardId: string;
  
  // Damage Information (Optional)
  damageReported?: boolean;
  damageType?: string;
  damageDescription?: string;
  damageAssessedBy?: string;
  damageAssessedAt?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const payload = req.body as Partial<CodecoRequest>;

    // Validate required fields
    const requiredFields: (keyof CodecoRequest)[] = [
      'sender', 'receiver', 'companyCode', 'customer',
      'containerNumber', 'containerSize', 'containerType',
      'transportCompany', 'vehicleNumber',
      'operationType', 'operationDate', 'operationTime',
      'locationCode', 'locationDetails',
      'operatorName', 'operatorId', 'yardId'
    ];

    const missingFields = requiredFields.filter(field => !payload[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        stage: 'validation',
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const requestData = payload as CodecoRequest;

    // Create CodecoMessageData from request
    const codecoData: CodecoMessageData = {
      sender: requestData.sender,
      receiver: requestData.receiver,
      companyCode: requestData.companyCode,
      customer: requestData.customer,
      containerNumber: requestData.containerNumber,
      containerSize: requestData.containerSize,
      containerType: requestData.containerType,
      transportCompany: requestData.transportCompany,
      vehicleNumber: requestData.vehicleNumber,
      operationType: requestData.operationType,
      operationDate: requestData.operationDate,
      operationTime: requestData.operationTime,
      bookingReference: requestData.bookingReference,
      equipmentReference: requestData.equipmentReference,
      locationCode: requestData.locationCode,
      locationDetails: requestData.locationDetails,
      operatorName: requestData.operatorName,
      operatorId: requestData.operatorId,
      yardId: requestData.yardId,
      damageReported: requestData.damageReported,
      damageType: requestData.damageType,
      damageDescription: requestData.damageDescription,
      damageAssessedBy: requestData.damageAssessedBy,
      damageAssessedAt: requestData.damageAssessedAt
    };

    // Generate EDI CODECO message using CodecoGenerator
    const generator = new CodecoGenerator();
    const ediContent = generator.generateFromSAPData(codecoData);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const ediFilename = `CODECO_${requestData.customer}_${timestamp}_${requestData.operatorName}.edi`;

    return res.status(200).json({
      status: 'success',
      message: 'CODECO file generated successfully',
      edi_file: ediFilename,
      edi_content: ediContent,
      uploaded_to_sftp: false // SFTP upload would require additional configuration
    });

  } catch (error) {
    console.error('CODECO generation error:', error);
    return res.status(500).json({
      status: 'error',
      stage: 'generation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
