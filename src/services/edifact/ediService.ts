import { CODECOGenerator } from './codecoGenerator';
import { SapXmlGenerator, SapCodecoReportData } from '../sapXmlGenerator';
import { Container, EDITransmissionConfig, EDITransmissionLog } from '../../types';
import { format } from 'date-fns';
import { yardService } from '../yardService';

export class EDIService {
  private transmissionConfigs: Map<string, EDITransmissionConfig> = new Map();
  private transmissionLogs: EDITransmissionLog[] = [];

  constructor() {
    // Initialize with default configurations
    this.loadDefaultConfigurations();
  }

  private loadDefaultConfigurations() {
    // Example configuration for different partners
    const defaultConfig: EDITransmissionConfig = {
      sftpHost: 'edi.partner.com',
      sftpPort: 22,
      sftpUsername: 'depot_user',
      sftpPassword: 'secure_password', // In production, use environment variables
      remotePath: '/incoming/codeco',
      fileNamePattern: 'CODECO_{timestamp}_{container}_{operation}.edi',
      partnerCode: 'PARTNER001',
      senderCode: 'DEPOT001',
      testMode: true // Set to false in production
    };

    this.transmissionConfigs.set('DEFAULT', defaultConfig);
  }

  addPartnerConfiguration(partnerCode: string, config: EDITransmissionConfig) {
    this.transmissionConfigs.set(partnerCode, config);
  }

  async processGateIn(container: Container): Promise<EDITransmissionLog> {
    if (!container.gateInDate) {
      throw new Error('Container must have a gate-in date to generate CODECO');
    }

    const messageRef = this.generateMessageReference('GI', container.number);
    const partnerCode = this.getPartnerCodeForContainer(container);
    
    // Generate CODECO message
    const ediContent = CODECOGenerator.generateFromContainer(
      container,
      'GATE_IN',
      messageRef,
      partnerCode
    );

    // Simulate transmission
    return await this.simulateTransmission(ediContent, container, 'GATE_IN', messageRef, partnerCode);
  }

  async processGateOut(container: Container): Promise<EDITransmissionLog> {
    if (!container.gateOutDate) {
      throw new Error('Container must have a gate-out date to generate CODECO');
    }

    const messageRef = this.generateMessageReference('GO', container.number);
    const partnerCode = this.getPartnerCodeForContainer(container);
    
    // Generate CODECO message
    const ediContent = CODECOGenerator.generateFromContainer(
      container,
      'GATE_OUT',
      messageRef,
      partnerCode
    );

    // Simulate transmission
    return await this.simulateTransmission(ediContent, container, 'GATE_OUT', messageRef, partnerCode);
  }

  async generateSapXmlReport(
    container: Container,
    operationType: 'GATE_IN' | 'GATE_OUT',
    transporter: string,
    vehicleNumber: string,
    userName: string,
    containerLoadStatus: 'FULL' | 'EMPTY' = 'FULL'
  ): Promise<{ xmlContent: string; log: EDITransmissionLog }> {
    try {
      // Generate SAP XML
      const xmlContent = await SapXmlGenerator.generateSapCodecoReportXml({
        container,
        operationType,
        transporter,
        vehicleNumber,
        clientCode: container.clientCode || container.client,
        userName,
        containerLoadStatus
      });

      // Validate the generated XML
      const validation = SapXmlGenerator.validateSapXml(xmlContent);
      if (!validation.isValid) {
        throw new Error(`SAP XML validation failed: ${validation.errors.join(', ')}`);
      }

      // Create transmission log
      const messageRef = this.generateMessageReference(
        operationType === 'GATE_IN' ? 'GI' : 'GO',
        container.number
      );
      const partnerCode = this.getPartnerCodeForContainer(container);
      const currentYard = yardService.getCurrentYard();
      
      const log = await this.simulateTransmission(
        xmlContent,
        container,
        operationType,
        messageRef,
        partnerCode,
        currentYard?.id || 'unknown'
      );

      console.log(`[SAP XML] Generated for ${container.number}:`, {
        operationType,
        containerType: SapXmlGenerator.getContainerTypeDescription(container.type),
        operationDesc: SapXmlGenerator.getOperationDescription(operationType),
        transporter,
        vehicleNumber,
        yardCode: currentYard?.code || 'UNKNOWN'
      });

      return { xmlContent, log };
    } catch (error) {
      throw new Error(`Failed to generate SAP XML report: ${error}`);
    }
  }

  async processSapXmlFromGateIn(
    container: Container,
    transporter: string,
    vehicleNumber: string,
    userName: string,
    containerLoadStatus: 'FULL' | 'EMPTY' = 'FULL'
  ): Promise<{ xmlContent: string; log: EDITransmissionLog }> {
    if (!container.gateInDate) {
      throw new Error('Container must have a gate-in date to generate SAP XML');
    }

    return this.generateSapXmlReport(
      container,
      'GATE_IN',
      transporter,
      vehicleNumber,
      userName,
      containerLoadStatus
    );
  }

  async processSapXmlFromGateOut(
    container: Container,
    transporter: string,
    vehicleNumber: string,
    userName: string,
    containerLoadStatus: 'FULL' | 'EMPTY' = 'FULL'
  ): Promise<{ xmlContent: string; log: EDITransmissionLog }> {
    if (!container.gateOutDate) {
      throw new Error('Container must have a gate-out date to generate SAP XML');
    }

    return this.generateSapXmlReport(
      container,
      'GATE_OUT',
      transporter,
      vehicleNumber,
      userName,
      containerLoadStatus
    );
  }

  private async simulateTransmission(
    ediContent: string,
    container: Container,
    operation: 'GATE_IN' | 'GATE_OUT',
    messageRef: string,
    partnerCode: string,
    yardId: string
  ): Promise<EDITransmissionLog> {
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const yard = yardService.getYardById(yardId);
    const yardCode = yard?.code || 'UNKNOWN';
    const fileName = operation.includes('XML') 
      ? `SAP_CODECO_${yardCode}_${timestamp}_${container.number}_${operation}.xml`
      : `CODECO_${yardCode}_${timestamp}_${container.number}_${operation}.edi`;

    const log: EDITransmissionLog = {
      id: `${messageRef}_${timestamp}`,
      messageType: 'CODECO',
      operation,
      containerNumber: container.number,
      fileName,
      transmissionDate: new Date(),
      status: 'SENT', // Simulate successful transmission
      partnerCode,
      retryCount: 0,
      createdBy: 'System',
      updatedBy: 'System'
    };

    this.transmissionLogs.push(log);
    
    // Simulate acknowledgment after a delay
    setTimeout(() => {
      log.status = 'ACKNOWLEDGED';
      log.acknowledgmentReceived = new Date();
    }, 2000);

    // Log EDI operation
    yardService.logOperation('edi_transmission', container.number, 'System', {
      operation,
      partnerCode,
      fileName,
      yardId,
      yardCode
    });

    console.log(`[SIMULATED] EDI transmission for ${container.number} in yard ${yardCode}:`, {
      fileName,
      operation,
      yardCode,
      ediContent: ediContent.substring(0, 200) + '...'
    });

    return log;
  }

  async retryFailedTransmission(logId: string): Promise<EDITransmissionLog> {
    const log = this.transmissionLogs.find(l => l.id === logId);
    if (!log) {
      throw new Error('Transmission log not found');
    }

    if (log.status !== 'FAILED') {
      throw new Error('Can only retry failed transmissions');
    }

    log.retryCount++;
    log.status = 'SENT';
    log.transmissionDate = new Date();
    
    // Simulate successful retry
    setTimeout(() => {
      log.status = 'ACKNOWLEDGED';
      log.acknowledgmentReceived = new Date();
    }, 1000);

    return log;
  }

  async checkPendingAcknowledgments(): Promise<void> {
    const pendingLogs = this.transmissionLogs.filter(log => 
      log.status === 'SENT' && !log.acknowledgmentReceived
    );

    // Simulate checking acknowledgments
    pendingLogs.forEach(log => {
      // Randomly acknowledge some pending transmissions
      if (Math.random() > 0.5) {
        log.status = 'ACKNOWLEDGED';
        log.acknowledgmentReceived = new Date();
      }
    });
  }

  async processFromJSON(jsonFile: string, operation: 'GATE_IN' | 'GATE_OUT'): Promise<EDITransmissionLog> {
    try {
      const data = JSON.parse(jsonFile);
      const containerNumber = data.containerNumber || 'UNKNOWN';
      
      const container = await this.getContainerByNumber(containerNumber);
      const messageRef = this.generateMessageReference(
        operation === 'GATE_IN' ? 'GI' : 'GO',
        containerNumber
      );
      
      // Generate EDI content from JSON
      const ediContent = `JSON_PROCESSED_${messageRef}`;
      
      return await this.simulateTransmission(ediContent, container, operation, messageRef, 'DEFAULT');
    } catch (error) {
      throw new Error(`Failed to process JSON file: ${error}`);
    }
  }

  async processFromXML(xmlFile: string, operation: 'GATE_IN' | 'GATE_OUT'): Promise<EDITransmissionLog> {
    try {
      // Simple XML parsing simulation
      const containerMatch = xmlFile.match(/<containerNumber>(.*?)<\/containerNumber>/);
      const containerNumber = containerMatch ? containerMatch[1] : 'UNKNOWN';
      
      const container = await this.getContainerByNumber(containerNumber);
      const messageRef = this.generateMessageReference(
        operation === 'GATE_IN' ? 'GI' : 'GO',
        containerNumber
      );
      
      // Generate EDI content from XML
      const ediContent = `XML_PROCESSED_${messageRef}`;
      
      return await this.simulateTransmission(ediContent, container, operation, messageRef, 'DEFAULT');
    } catch (error) {
      throw new Error(`Failed to process XML file: ${error}`);
    }
  }

  private generateMessageReference(prefix: string, containerNumber: string): string {
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const containerSuffix = containerNumber.slice(-4);
    return `${prefix}${timestamp}${containerSuffix}`;
  }

  private getPartnerCodeForContainer(container: Container): string {
    // In production, this would map container clients to partner codes
    const clientPartnerMap: { [key: string]: string } = {
      'Maersk Line': 'MAEU',
      'MSC': 'MSCU',
      'CMA CGM': 'CMDU',
      'Hapag-Lloyd': 'HLCU'
    };

    return clientPartnerMap[container.client] || 'DEFAULT';
  }

  private async getContainerByNumber(containerNumber: string): Promise<Container> {
    // In production, this would fetch from database
    // For now, return a mock container
    return {
      id: '1',
      number: containerNumber,
      type: 'dry',
      size: '40ft',
      status: 'in_depot',
      location: 'Block A-12',
      gateInDate: new Date(),
      client: 'Maersk Line'
    };
  }

  getTransmissionLogs(): EDITransmissionLog[] {
    return [...this.transmissionLogs];
  }

  getFailedTransmissions(): EDITransmissionLog[] {
    return this.transmissionLogs.filter(log => log.status === 'FAILED');
  }

  getPendingTransmissions(): EDITransmissionLog[] {
    return this.transmissionLogs.filter(log => log.status === 'PENDING');
  }
}