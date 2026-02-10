/**
 * Vercel Serverless Function: Convert EDI to XML
 * Replaces Flask endpoint: POST /api/v1/codeco/convert-edi-to-xml
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EDISegment {
  tag: string;
  elements: string[];
}

interface ParsedEDIData {
  message_info: Record<string, any>;
  header: Record<string, any>;
  container_details: {
    container_number?: string;
    container_size?: string;
    container_status?: string;
  };
  parties: Array<{
    party_qualifier: string;
    party_identification: string;
    name_and_address?: string;
  }>;
  locations: Array<{
    location_qualifier: string;
    location_identification: string;
  }>;
  dates: Array<{
    date_time_qualifier: string;
    date_time: string;
    date_time_format: string;
  }>;
  measurements: any[];
}

class EDIFACTParser {
  private segments: EDISegment[] = [];

  parseEDIMessage(ediContent: string): ParsedEDIData {
    const normalized = this.normalizeEDIContent(ediContent);
    this.segments = this.splitIntoSegments(normalized);

    if (this.segments.length === 0) {
      throw new Error('No valid EDIFACT segments found in EDI content');
    }

    return this.parseSegments();
  }

  private normalizeEDIContent(content: string): string {
    return content.trim().replace(/\s+/g, ' ').replace(/\s*'\s*/g, "'");
  }

  private splitIntoSegments(content: string): EDISegment[] {
    const segments: EDISegment[] = [];
    const rawSegments = content.split("'");

    for (const raw of rawSegments) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const parts = trimmed.split('+');
      if (parts.length < 1) continue;

      const tag = parts[0].trim();
      const elements = parts.slice(1).map(p => p.trim());

      if (tag) {
        segments.push({ tag, elements });
      }
    }

    return segments;
  }

  private parseSegments(): ParsedEDIData {
    const data: ParsedEDIData = {
      message_info: {},
      header: {},
      container_details: {},
      parties: [],
      locations: [],
      measurements: [],
      dates: []
    };

    for (const segment of this.segments) {
      switch (segment.tag) {
        case 'UNB':
          data.message_info = { ...data.message_info, ...this.parseUNB(segment) };
          break;
        case 'UNH':
          data.message_info = { ...data.message_info, ...this.parseUNH(segment) };
          break;
        case 'BGM':
          data.header = this.parseBGM(segment);
          break;
        case 'DTM':
          data.dates.push(this.parseDTM(segment));
          break;
        case 'NAD':
          data.parties.push(this.parseNAD(segment));
          break;
        case 'COD':
          data.container_details = this.parseCOD(segment);
          break;
        case 'LOC':
          data.locations.push(this.parseLOC(segment));
          break;
      }
    }

    return data;
  }

  private getElement(segment: EDISegment, index: number, defaultValue = ''): string {
    return segment.elements[index] || defaultValue;
  }

  private getComposite(segment: EDISegment, elementIndex: number, componentIndex: number, defaultValue = ''): string {
    const element = this.getElement(segment, elementIndex);
    const components = element.split(':');
    return components[componentIndex] || defaultValue;
  }

  private parseUNB(segment: EDISegment) {
    return {
      sender: this.getElement(segment, 1),
      receiver: this.getElement(segment, 2),
      date: this.getElement(segment, 3),
      time: this.getElement(segment, 4),
      interchange_control_ref: this.getElement(segment, 5)
    };
  }

  private parseUNH(segment: EDISegment) {
    return {
      message_reference_number: this.getElement(segment, 0),
      message_type: this.getComposite(segment, 1, 0)
    };
  }

  private parseBGM(segment: EDISegment) {
    return {
      document_name_code: this.getElement(segment, 0),
      document_number: this.getElement(segment, 1),
      message_function_code: this.getElement(segment, 2)
    };
  }

  private parseDTM(segment: EDISegment) {
    return {
      date_time_qualifier: this.getComposite(segment, 0, 0),
      date_time: this.getComposite(segment, 0, 1),
      date_time_format: this.getComposite(segment, 0, 2)
    };
  }

  private parseNAD(segment: EDISegment) {
    return {
      party_qualifier: this.getElement(segment, 0),
      party_identification: this.getElement(segment, 1),
      name_and_address: this.getElement(segment, 3)
    };
  }

  private parseCOD(segment: EDISegment) {
    return {
      container_number: this.getElement(segment, 0),
      container_size: this.getElement(segment, 1),
      container_status: this.getElement(segment, 2)
    };
  }

  private parseLOC(segment: EDISegment) {
    return {
      location_qualifier: this.getElement(segment, 0),
      location_identification: this.getElement(segment, 1)
    };
  }
}

function validateEDIFormat(ediContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ediContent?.trim()) {
    errors.push('EDI content is empty');
    return { isValid: false, errors };
  }

  if (!ediContent.includes('UNB+')) errors.push('Missing UNB segment (message envelope)');
  if (!ediContent.includes('UNH+')) errors.push('Missing UNH segment (message header)');
  if (!ediContent.includes('UNT+')) errors.push('Missing UNT segment (message trailer)');
  if (!ediContent.includes('UNZ+')) errors.push('Missing UNZ segment (envelope closing)');
  if (!ediContent.includes('CODECO')) errors.push('Not a CODECO message type');
  if (!ediContent.includes("'")) errors.push("Missing segment terminators (')");

  return { isValid: errors.length === 0, errors };
}

function generateXMLFromEDIData(parsedData: ParsedEDIData): string {
  const terminalOperator = parsedData.parties.find(p => p.party_qualifier === 'TO');
  const transporter = parsedData.parties.find(p => p.party_qualifier === 'FR');
  const customer = parsedData.parties.find(p => p.party_qualifier === 'SH');

  const creationDate = parsedData.dates.find(d => d.date_time_qualifier === '137');
  const dateTimeStr = creationDate?.date_time || '';
  const createdDate = dateTimeStr.slice(0, 8) || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const createdTime = dateTimeStr.slice(8, 14) || new Date().toTimeString().slice(0, 8).replace(/:/g, '');

  const location = parsedData.locations.find(l => l.location_qualifier === '87');
  const yardId = location?.location_identification || terminalOperator?.party_identification || '';

  const { container_number = '', container_size = '', container_status = '' } = parsedData.container_details;

  return `<?xml version="1.0" encoding="UTF-8"?>
<n0:SAP_CODECO_REPORT_MT xmlns:n0="urn:olam.com:IVC:EDIFACT:ONE" xmlns:prx="urn:sap.com:proxy:GRP:/1SAI/TASC3DF160D1FCBB8D1B039:740" xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <Records>
    <Header>
      <Company_Code>CIABJ31</Company_Code>
      <Plant>${yardId}</Plant>
      <Customer>${customer?.party_identification || ''}</Customer>
    </Header>
    <Item>
      <Weighbridge_ID>WB${Date.now()}</Weighbridge_ID>
      <Weighbridge_ID_SNO>00001</Weighbridge_ID_SNO>
      <Transporter>${transporter?.name_and_address || ''}</Transporter>
      <Container_Number>${container_number}</Container_Number>
      <Container_Size>${container_size}</Container_Size>
      <Design>003</Design>
      <Type>02</Type>
      <Color>#312682</Color>
      <Clean_Type>001</Clean_Type>
      <Status>${container_status}</Status>
      <Device_Number>TD2019031200</Device_Number>
      <Vehicle_Number>UNKNOWN</Vehicle_Number>
      <Created_Date>${createdDate}</Created_Date>
      <Created_Time>${createdTime}</Created_Time>
      <Created_By>EDI_IMPORT</Created_By>
      <Changed_Date>${createdDate}</Changed_Date>
      <Changed_Time>${createdTime}</Changed_Time>
      <Changed_By>EDI_IMPORT</Changed_By>
      <Num_Of_Entries>1</Num_Of_Entries>
    </Item>
  </Records>
</n0:SAP_CODECO_REPORT_MT>`;
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
        stage: 'validation',
        message: "Request body must contain 'edi_content' field"
      });
    }

    // Validate EDI format
    const { isValid, errors: validationErrors } = validateEDIFormat(ediContent);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        stage: 'edi_validation',
        message: 'Invalid EDI format',
        validation_errors: validationErrors
      });
    }

    // Parse EDI
    const parser = new EDIFACTParser();
    const parsedData = parser.parseEDIMessage(ediContent);

    // Generate XML
    const xmlContent = generateXMLFromEDIData(parsedData);

    const containerNumber = parsedData.container_details.container_number || 'UNKNOWN';
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);
    const xmlFilename = `CONVERTED_EDI_TO_XML_${containerNumber}_${timestamp}.xml`;

    return res.status(200).json({
      status: 'success',
      message: 'EDI successfully converted to XML',
      xml_content: xmlContent,
      xml_file: xmlFilename,
      validation_passed: true,
      parsed_edi_data: parsedData
    });

  } catch (error) {
    console.error('EDI to XML conversion error:', error);
    return res.status(500).json({
      status: 'error',
      stage: 'conversion',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
