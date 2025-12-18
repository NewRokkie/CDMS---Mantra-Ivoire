/**
 * Service de conversion EDI bidirectionnelle
 * Gère les conversions XML ↔ EDI via l'API CODECO
 */

export interface EDIConversionRequest {
  edi_content: string;
}

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

export interface EDIValidationRequest {
  edi_content: string;
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
  private readonly API_BASE_URL = 'http://localhost:5000/api/v1/codeco';

  /**
   * Convertit un contenu EDI en XML
   */
  async convertEDIToXML(ediContent: string): Promise<EDIConversionResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/convert-edi-to-xml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          edi_content: ediContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('EDI to XML conversion failed:', error);
      throw new Error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convertit un fichier EDI en XML via upload
   */
  async convertEDIFileToXML(file: File): Promise<EDIConversionResponse> {
    try {
      const formData = new FormData();
      formData.append('edi_file', file);

      console.log(`Converting EDI file: ${file.name} (${file.size} bytes)`);

      const response = await fetch(`${this.API_BASE_URL}/convert-edi-to-xml`, {
        method: 'POST',
        body: formData
      });

      console.log(`API Response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('API Error details:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Conversion successful:', result);
      return result;
    } catch (error) {
      console.error('EDI file to XML conversion failed:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to EDI API. Please ensure the API server is running on localhost:5000');
      }
      
      throw new Error(`File conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valide le format EDI sans conversion
   */
  async validateEDI(ediContent: string): Promise<EDIValidationResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/validate-edi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          edi_content: ediContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('EDI validation failed:', error);
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Génère des fichiers CODECO (XML → EDI)
   */
  async generateCODECO(requestData: XMLToEDIRequest): Promise<XMLToEDIResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CODECO generation failed:', error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifie la santé de l'API
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
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