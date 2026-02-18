/**
 * Vercel Serverless Function: Generate and Transmit CODECO files
 * 
 * This endpoint combines EDI generation and SFTP transmission in a single operation.
 * It generates the EDI CODECO message and immediately transmits it to the customer's SFTP server.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CodecoGenerator, CodecoMessageData } from '../../src/services/edi/codecoGenerator';

interface GenerateAndTransmitRequest {
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

  // SFTP Configuration
  sftpConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    remoteDir?: string;
  };
}

interface GenerateAndTransmitResponse {
  status: 'success' | 'error';
  message: string;
  stage?: 'validation' | 'generation' | 'transmission';
  edi_file?: string;
  edi_content?: string;
  uploaded_to_sftp?: boolean;
  remote_path?: string;
  error?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set JSON content type for all responses
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed'
    });
  }

  try {
    const payload = req.body as Partial<GenerateAndTransmitRequest>;

    // Validate required fields
    const requiredFields: (keyof GenerateAndTransmitRequest)[] = [
      'sender', 'receiver', 'companyCode', 'customer',
      'containerNumber', 'containerSize', 'containerType',
      'transportCompany', 'vehicleNumber',
      'operationType', 'operationDate', 'operationTime',
      'locationCode', 'locationDetails',
      'operatorName', 'operatorId', 'yardId',
      'sftpConfig'
    ];

    const missingFields = requiredFields.filter(field => !payload[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        stage: 'validation',
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const requestData = payload as GenerateAndTransmitRequest;

    // Validate SFTP configuration
    if (!requestData.sftpConfig.host || !requestData.sftpConfig.username || !requestData.sftpConfig.password) {
      return res.status(400).json({
        status: 'error',
        stage: 'validation',
        message: 'Invalid SFTP configuration: host, username, and password are required'
      });
    }

    // STAGE 1: Generate EDI CODECO message
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

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const ediFilename = `CODECO_${requestData.customer}_${timestamp}_${requestData.operatorName}.edi`;

    // STAGE 2: Transmit via SFTP
    let SftpClient;
    try {
      SftpClient = (await import('ssh2-sftp-client')).default;
    } catch (importError) {
      console.error('Failed to import ssh2-sftp-client:', importError);
      return res.status(500).json({
        status: 'error',
        stage: 'transmission',
        message: 'SFTP client library not available in serverless environment',
        edi_file: ediFilename,
        edi_content: ediContent,
        uploaded_to_sftp: false,
        error: 'ssh2-sftp-client module not available'
      });
    }
    
    const sftp = new SftpClient();

    try {
      // Connect to SFTP server
      await sftp.connect({
        host: requestData.sftpConfig.host,
        port: requestData.sftpConfig.port || 22,
        username: requestData.sftpConfig.username,
        password: requestData.sftpConfig.password,
        readyTimeout: 20000,
        retries: 3,
        retry_factor: 2,
        retry_minTimeout: 2000
      });

      // Determine remote path
      const remoteDir = requestData.sftpConfig.remoteDir || '/';
      const remotePath = `${remoteDir}/${ediFilename}`.replace(/\/+/g, '/');

      // Create remote directory if needed
      if (remoteDir !== '/') {
        try {
          await sftp.mkdir(remoteDir, true);
        } catch (mkdirError) {
          console.log(`Directory ${remoteDir} might already exist`);
        }
      }

      // Upload EDI content
      const buffer = Buffer.from(ediContent, 'utf-8');
      await sftp.put(buffer, remotePath);

      // Close connection
      await sftp.end();

      return res.status(200).json({
        status: 'success',
        message: 'CODECO file generated and transmitted successfully',
        edi_file: ediFilename,
        edi_content: ediContent,
        uploaded_to_sftp: true,
        remote_path: remotePath
      });

    } catch (sftpError) {
      // Ensure connection is closed
      try {
        await sftp.end();
      } catch (closeError) {
        console.error('Error closing SFTP connection:', closeError);
      }

      // Return partial success - file generated but not transmitted
      return res.status(207).json({
        status: 'error',
        stage: 'transmission',
        message: 'CODECO file generated but SFTP transmission failed',
        edi_file: ediFilename,
        edi_content: ediContent,
        uploaded_to_sftp: false,
        error: sftpError instanceof Error ? sftpError.message : 'Unknown SFTP error'
      });
    }

  } catch (error) {
    console.error('CODECO generation/transmission error:', error);
    return res.status(500).json({
      status: 'error',
      stage: 'generation',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.stack : String(error)
    });
  }
}
