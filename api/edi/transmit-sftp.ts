/**
 * Vercel Serverless Function: Transmit EDI files via SFTP
 * 
 * This endpoint handles SFTP transmission of EDI CODECO files to customer servers.
 * Uses ssh2-sftp-client for Node.js SFTP operations compatible with Vercel.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SFTPTransmitRequest {
  ediContent: string;
  ediFilename: string;
  sftpConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    remoteDir?: string;
  };
}

interface SFTPTransmitResponse {
  status: 'success' | 'error';
  message: string;
  filename?: string;
  remotePath?: string;
  error?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed'
    });
  }

  try {
    const { ediContent, ediFilename, sftpConfig } = req.body as SFTPTransmitRequest;

    // Validate required fields
    if (!ediContent || !ediFilename || !sftpConfig) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: ediContent, ediFilename, or sftpConfig'
      });
    }

    if (!sftpConfig.host || !sftpConfig.username || !sftpConfig.password) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing SFTP configuration: host, username, or password required'
      });
    }

    // Import ssh2-sftp-client dynamically (only when needed)
    const SftpClient = (await import('ssh2-sftp-client')).default;
    const sftp = new SftpClient();

    try {
      // Connect to SFTP server
      await sftp.connect({
        host: sftpConfig.host,
        port: sftpConfig.port || 22,
        username: sftpConfig.username,
        password: sftpConfig.password,
        readyTimeout: 20000, // 20 second timeout
        retries: 3,
        retry_factor: 2,
        retry_minTimeout: 2000
      });

      // Determine remote path
      const remoteDir = sftpConfig.remoteDir || '/';
      const remotePath = `${remoteDir}/${ediFilename}`.replace(/\/+/g, '/');

      // Create remote directory if it doesn't exist
      if (remoteDir !== '/') {
        try {
          await sftp.mkdir(remoteDir, true);
        } catch (mkdirError) {
          // Directory might already exist, continue
          console.log(`Directory ${remoteDir} might already exist:`, mkdirError);
        }
      }

      // Upload EDI content as buffer
      const buffer = Buffer.from(ediContent, 'utf-8');
      await sftp.put(buffer, remotePath);

      // Close connection
      await sftp.end();

      return res.status(200).json({
        status: 'success',
        message: 'EDI file transmitted successfully via SFTP',
        filename: ediFilename,
        remotePath: remotePath
      });

    } catch (sftpError) {
      // Ensure connection is closed
      try {
        await sftp.end();
      } catch (closeError) {
        console.error('Error closing SFTP connection:', closeError);
      }

      throw sftpError;
    }

  } catch (error) {
    console.error('SFTP transmission error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({
      status: 'error',
      message: 'SFTP transmission failed',
      error: errorMessage
    });
  }
}
