/**
 * Vercel Serverless Function: Generate CODECO files only
 * 
 * This endpoint generates EDI CODECO messages without transmission.
 * Used when transmission will be handled separately via send-edi endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CodecoGenerator, CodecoMessageData } from '../../src/services/edi/codecoGenerator';

interface GenerateCodecoRequest {
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set JSON content type for all responses
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
    return;
  }

  try {
    const payload = req.body as Partial<GenerateCodecoRequest>;

    // Validate required fields
    const requiredFields: (keyof GenerateCodecoRequest)[] = [
      'sender', 'receiver', 'companyCode', 'customer',
      'containerNumber', 'containerSize', 'containerType',
      'transportCompany', 'vehicleNumber',
      'operationType', 'operationDate', 'operationTime',
      'locationCode', 'locationDetails',
      'operatorName', 'operatorId', 'yardId'
    ];

    const missingFields = requiredFields.filter(field => !payload[field]);
    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
      return;
    }

    const requestData = payload as GenerateCodecoRequest;

    // Generate EDI CODECO message
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

    const generator = new CodecoGenerator();
    const ediContent = generator.generateFromSAPData(codecoData);

    // Generate filename: CODECO_{SenderCode}{GateInDate}{GateInTime}_{containerNumber}_{operation}.edi
    // Example: CODECO_20260218234902_ONEU1388601_GATE_IN.edi
    const gateDate = requestData.operationDate.replace(/-/g, '').length === 6
      ? '20' + requestData.operationDate.replace(/-/g, '')
      : requestData.operationDate.replace(/-/g, '').slice(0, 8);
    const gateTime = (requestData.operationTime.replace(/:/g, '') + '00').slice(0, 6).padEnd(6, '0');
    const senderCode = (requestData.sender || requestData.companyCode || '').trim();
    const senderDateTime = `${senderCode}${gateDate}${gateTime}`;
    const ediFilename = `CODECO_${senderDateTime}_${requestData.containerNumber}_${requestData.operationType}.edi`;

    res.status(200).json({
      success: true,
      message: 'CODECO file generated successfully',
      ediFile: ediFilename,
      ediContent: ediContent
    });

  } catch (error) {
    console.error('CODECO generation error:', error);
    
    // Ensure we always return JSON
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
