/**
 * Service de conversion EDI bidirectionnelle
 * Gère les conversions XML ↔ EDI via l'implémentation interne TypeScript
 */

import { ediManagementService } from './ediManagement';
import { EDIContainerData } from '../../types/edi';

export interface EDIConversionResponse {
  status: string;
  message: string;
  xml_content: string;
  xml_file: string;
  validation_passed: boolean;
  parsed_edi_data?: {
    container_details?: {
      container_number: string;
      container_size: string;
      container_status: string;
    };
    parties?: Array<{
      party_qualifier: string;
      party_identification: string;
      name_and_address?: string;
    }>;
    dates?: Array<{
      date_time_qualifier: string;
      date_time: string;
      date_time_format: string;
    }>;
    locations?: Array<{
      location_qualifier: string;
      location_identification: string;
    }>;
  };
}

export interface EDIValidationResponse {
  status: string;
  is_valid: boolean;
  validation_errors: string[];
  parsing_errors: string[];
  parsed_data?: any;
  message: string;
}

export interface XMLToEDIRequest {
  yardId: string;
  client: string;
  weighbridge_id: string;
  weighbridge_id_sno: string;
  transporter: string;
  container_number: string;
  container_size: string;
  status: string;
  vehicle_number: string;
  created_by: string;
}

export interface XMLToEDIResponse {
  status: string;
  message: string;
  xml_file: string;
  edi_file: string;
  uploaded_to_sftp: boolean;
}

class EDIConversionService {
  /**
   * Convertit un contenu EDI en XML
   * Note: Pour l'instant, cette fonctionnalité n'est pas entièrement implémentée
   * dans l'implémentation interne. Nous retournons un objet vide avec un message d'avertissement.
   */
  async convertEDIToXML(ediContent: string): Promise<EDIConversionResponse> {
    try {
      // Pour l'instant, nous ne faisons qu'une validation basique et retournons un message
      const isValid = this.validateEDIFormat(ediContent).isValid;
      
      // Extraire les informations de base à partir du contenu EDI
      const containerInfo = this.extractContainerInfo(ediContent);
      
      return {
        status: 'success',
        message: 'EDI content validated (internal conversion not fully implemented)',
        xml_content: `<!-- XML conversion not fully implemented in internal service -->\n<!-- Original EDI content preserved -->\n${ediContent}`,
        xml_file: `converted_${Date.now()}.xml`,
        validation_passed: isValid,
        parsed_edi_data: {
          container_details: containerInfo.containerNumber ? {
            container_number: containerInfo.containerNumber,
            container_size: containerInfo.containerSize || '40',
            container_status: containerInfo.status || '01'
          } : undefined
        }
      };
    } catch (error) {
      console.error('EDI to XML conversion failed:', error);
      throw new Error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convertit un fichier EDI en XML via lecture du contenu
   */
  async convertEDIFileToXML(file: File): Promise<EDIConversionResponse> {
    try {
      console.log(`Converting EDI file: ${file.name} (${file.size} bytes)`);

      // Lire le contenu du fichier
      const ediContent = await this.readFileContent(file);
      
      // Convertir le contenu EDI en XML
      const result = await this.convertEDIToXML(ediContent);
      
      console.log('Conversion successful:', result);
      return result;
    } catch (error) {
      console.error('EDI file to XML conversion failed:', error);

      throw new Error(`File conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valide le format EDI sans conversion
   */
  async validateEDI(ediContent: string): Promise<EDIValidationResponse> {
    try {
      const validation = this.validateEDIFormat(ediContent);
      
      return {
        status: validation.isValid ? 'success' : 'validation_failed',
        is_valid: validation.isValid,
        validation_errors: validation.errors,
        parsing_errors: [],
        parsed_data: validation.isValid ? this.extractContainerInfo(ediContent) : null,
        message: validation.isValid ? 'EDI validation completed' : 'EDI validation failed'
      };
    } catch (error) {
      console.error('EDI validation failed:', error);
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Génère des fichiers CODECO (XML → EDI) en utilisant l'implémentation interne
   */
  async generateCODECO(requestData: XMLToEDIRequest): Promise<XMLToEDIResponse> {
    try {
      // Convertir les données de requête en format compatible avec le service EDI interne
      const ediData: Omit<EDIContainerData, 'status'> = {
        containerNumber: requestData.container_number,
        size: requestData.container_size === '20' ? '20ft' : '40ft',
        type: 'dry', // Valeur par défaut
        clientName: requestData.client,
        transporter: requestData.transporter,
        vehicleNumber: requestData.vehicle_number,
        userName: requestData.created_by,
        containerLoadStatus: 'FULL', // Valeur par défaut
        timestamp: new Date(),
        yardId: requestData.yardId,
      };

      // Utiliser le service EDI interne pour traiter l'opération Gate In
      const log = await ediManagementService.processGateIn(ediData);
      
      if (!log) {
        throw new Error('Failed to generate CODECO - EDI processing not enabled');
      }

      return {
        status: 'success',
        message: 'Files generated and EDI processed successfully',
        xml_file: `generated_${Date.now()}.xml`,
        edi_file: log.fileName,
        uploaded_to_sftp: log.uploadedToSftp
      };
    } catch (error) {
      console.error('CODECO generation failed:', error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Simule la vérification de la santé du service
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      // Simuler une vérification de santé - dans une implémentation réelle,
      // cela pourrait vérifier la disponibilité des services internes
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lit le contenu d'un fichier texte
   */
  async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Détermine le type de conversion basé sur l'extension du fichier
   */
  getConversionType(fileName: string): 'edi-to-xml' | 'xml-to-edi' | 'unknown' {
    const extension = fileName.toLowerCase().split('.').pop();

    switch (extension) {
      case 'edi':
        return 'edi-to-xml';
      case 'xml':
        return 'xml-to-edi';
      default:
        return 'unknown';
    }
  }

  /**
   * Valide le format d'un fichier EDI côté client
   */
  validateEDIFormat(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || !content.trim()) {
      errors.push('Le contenu EDI est vide');
      return { isValid: false, errors };
    }

    // Vérifications basiques du format EDIFACT
    if (!content.includes("UNB+")) {
      errors.push('Segment UNB manquant (enveloppe du message)');
    }

    if (!content.includes("UNH+")) {
      errors.push('Segment UNH manquant (en-tête du message)');
    }

    if (!content.includes("UNT+")) {
      errors.push('Segment UNT manquant (fin du message)');
    }

    if (!content.includes("UNZ+")) {
      errors.push('Segment UNZ manquant (fermeture de l\'enveloppe)');
    }

    if (!content.includes("CODECO")) {
      errors.push('Type de message CODECO non trouvé');
    }

    if (!content.includes("'")) {
      errors.push('Terminateurs de segment (\') manquants');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extrait les informations de conteneur d'un contenu EDI
   */
  extractContainerInfo(ediContent: string): {
    containerNumber?: string;
    containerSize?: string;
    status?: string;
  } {
    const info: any = {};

    // Recherche du segment COD (Container Details)
    const codMatch = ediContent.match(/COD\+([^+]+)\+([^+]+)\+([^']+)/);
    if (codMatch) {
      info.containerNumber = codMatch[1];
      info.containerSize = codMatch[2];
      info.status = codMatch[3];
    }

    // Si COD n'a pas été trouvé, rechercher dans EQD (Equipment Details) pour le numéro de conteneur
    if (!info.containerNumber) {
      const eqdMatch = ediContent.match(/EQD\+[^+]*\+([^+']*)/);
      if (eqdMatch) {
        info.containerNumber = eqdMatch[1];
      }
    }

    // Si le statut n'a pas été trouvé via COD, rechercher dans BGM (Beginning of Message)
    if (!info.status) {
      const bgmMatch = ediContent.match(/BGM\+[^+]*\+[^+]*\+([^']*)/);
      if (bgmMatch) {
        info.status = bgmMatch[1];
      }
    }

    // Recherche des détails supplémentaires dans les segments DTM
    const dtmMatches = ediContent.matchAll(/DTM\+([^']*)/g);
    for (const match of dtmMatches) {
      const segment = match[1];
      if (segment.startsWith('137:')) {
        // Date document
      }
    }

    return info;
  }

  /**
   * Formate les erreurs de validation pour l'affichage
   */
  formatValidationErrors(errors: string[]): string {
    if (errors.length === 0) return '';

    return errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
  }

  /**
   * Génère un nom de fichier pour la conversion
   */
  generateConvertedFileName(originalName: string, conversionType: 'edi-to-xml' | 'xml-to-edi'): string {
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (conversionType === 'edi-to-xml') {
      return `${baseName}_converted_${timestamp}.xml`;
    } else {
      return `${baseName}_converted_${timestamp}.edi`;
    }
  }
}

export const ediConversionService = new EDIConversionService();