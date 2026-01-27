import SftpClient from 'ssh2-sftp-client';
import { format } from 'date-fns';
import { EDITransmissionConfig, EDITransmissionLog } from '../../types';
import { logger } from '../../utils/logger';

export class SFTPTransmissionService {
  private config: EDITransmissionConfig;
  private sftp: SftpClient;

  constructor(config: EDITransmissionConfig) {
    this.config = config;
    this.sftp = new SftpClient();
  }

  async connect(): Promise<void> {
    try {
      const connectConfig: any = {
        host: this.config.sftpHost,
        port: this.config.sftpPort,
        username: this.config.sftpUsername,
      };

      if (this.config.sftpPassword) {
        connectConfig.password = this.config.sftpPassword;
      }

      if (this.config.sftpPrivateKey) {
        connectConfig.privateKey = this.config.sftpPrivateKey;
      }

      await this.sftp.connect(connectConfig);
    } catch (error) {
      throw new Error(`SFTP connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.sftp.end();
    } catch (error) {
      
    }
  }

  async transmitEDIFile(
    ediContent: string,
    containerNumber: string,
    operation: 'GATE_IN' | 'GATE_OUT',
    messageRef: string
  ): Promise<EDITransmissionLog> {
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const fileName = this.config.fileNamePattern
      .replace('{timestamp}', timestamp)
      .replace('{reference}', messageRef)
      .replace('{container}', containerNumber)
      .replace('{operation}', operation);

    const log: EDITransmissionLog = {
      id: `${messageRef}_${timestamp}`,
      messageType: 'CODECO',
      operation,
      containerNumber,
      fileName,
      transmissionDate: new Date(),
      status: 'PENDING',
      partnerCode: this.config.partnerCode,
      retryCount: 0
    };

    try {
      await this.connect();

      // Create remote directory if it doesn't exist
      try {
        await this.sftp.mkdir(this.config.remotePath, true);
      } catch (error) {
        // Directory might already exist, ignore error
      }

      const remotePath = `${this.config.remotePath}/${fileName}`;
      
      // Upload the EDI file
      await this.sftp.put(Buffer.from(ediContent, 'utf8'), remotePath);

      log.status = 'SENT';
      
      // In test mode, add a test prefix to the filename
      if (this.config.testMode) {
        logger.warn(`[TEST MODE] EDI file would be sent to: ${remotePath}`);
        logger.warn(`[TEST MODE] Content:\n${ediContent}`);
      }

      await this.disconnect();
      
      return log;
    } catch (error) {
      log.status = 'FAILED';
      log.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.disconnect();
      
      throw new Error(`EDI transmission failed: ${log.errorMessage}`);
    }
  }

  async retryTransmission(log: EDITransmissionLog, ediContent: string): Promise<EDITransmissionLog> {
    if (log.retryCount >= 3) {
      throw new Error('Maximum retry attempts reached');
    }

    log.retryCount++;
    log.status = 'PENDING';
    log.transmissionDate = new Date();

    try {
      const result = await this.transmitEDIFile(
        ediContent,
        log.containerNumber,
        log.operation,
        log.id.split('_')[0]
      );
      
      return { ...log, ...result };
    } catch (error) {
      log.status = 'FAILED';
      log.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async checkAcknowledgment(log: EDITransmissionLog): Promise<boolean> {
    try {
      await this.connect();
      
      // Look for acknowledgment files (CONTRL messages)
      const ackPattern = `CONTRL_${log.id}*.edi`;
      const files = await this.sftp.list(this.config.remotePath);
      
      const ackFile = files.find(file => 
        file.name.match(new RegExp(ackPattern.replace('*', '.*')))
      );

      await this.disconnect();

      if (ackFile) {
        log.acknowledgmentReceived = new Date();
        log.status = 'ACKNOWLEDGED';
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking acknowledgment:', 'sftpTransmission.ts', error)
      return false;
    }
  }

  async downloadAcknowledgments(): Promise<string[]> {
    try {
      await this.connect();
      
      const files = await this.sftp.list(this.config.remotePath);
      const ackFiles = files.filter(file => 
        file.name.startsWith('CONTRL_') && file.name.endsWith('.edi')
      );

      const acknowledgments: string[] = [];
      
      for (const file of ackFiles) {
        const content = await this.sftp.get(`${this.config.remotePath}/${file.name}`);
        acknowledgments.push(content.toString());
        
        // Optionally move processed acknowledgments to archive folder
        await this.sftp.rename(
          `${this.config.remotePath}/${file.name}`,
          `${this.config.remotePath}/processed/${file.name}`
        );
      }

      await this.disconnect();
      
      return acknowledgments;
    } catch (error) {
      await this.disconnect();
      throw new Error(`Failed to download acknowledgments: ${error}`);
    }
  }
}