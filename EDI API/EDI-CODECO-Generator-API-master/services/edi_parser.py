"""
EDI EDIFACT Parser Service.
Parses EDIFACT EDI messages and converts them back to structured data or XML format.

EDIFACT PARSING IMPLEMENTATION NOTES:
====================================
This parser handles CODECO (Container Station Report Message) EDIFACT format
and converts it back to XML or structured data.

EDIFACT Structure:
- Segments are terminated with single quote (')
- Elements within segments are separated by plus (+)
- Components within elements are separated by colon (:)
- UNB: Service String Advice (envelope opening)
- UNH: Message Header
- BGM: Beginning of Message
- DTM: Date/Time/Period
- NAD: Name and Address
- COD: Container Details
- LOC: Location
- MEA: Measurements
- UNT: Message Trailer
- UNZ: Service String Advice (envelope closing)
"""

import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from lxml import etree


class EDIFACTSegment:
    """Represents a single EDIFACT segment with its elements."""
    
    def __init__(self, tag: str, elements: List[str]):
        self.tag = tag
        self.elements = elements
    
    def get_element(self, index: int, default: str = '') -> str:
        """Get element at index, return default if not found."""
        return self.elements[index] if index < len(self.elements) else default
    
    def get_composite(self, element_index: int, component_index: int, default: str = '') -> str:
        """Get component from composite element."""
        element = self.get_element(element_index)
        components = element.split(':') if element else []
        return components[component_index] if component_index < len(components) else default
    
    def __repr__(self):
        return f"EDIFACTSegment(tag='{self.tag}', elements={self.elements})"


class EDIFACTParser:
    """Parser for EDIFACT EDI messages."""
    
    def __init__(self):
        self.segments: List[EDIFACTSegment] = []
        self.parsed_data: Dict[str, Any] = {}
    
    def parse_edi_message(self, edi_content: str) -> Dict[str, Any]:
        """
        Parse complete EDIFACT EDI message into structured data.
        
        Args:
            edi_content: Raw EDI message content as string.
            
        Returns:
            Dict containing parsed message data.
            
        Raises:
            ValueError: If EDI format is invalid or required segments are missing.
        """
        # Clean and normalize EDI content
        edi_content = self._normalize_edi_content(edi_content)
        
        # Split into segments
        self.segments = self._split_into_segments(edi_content)
        
        if not self.segments:
            raise ValueError("No valid EDIFACT segments found in EDI content")
        
        # Parse segments into structured data
        self.parsed_data = self._parse_segments()
        
        return self.parsed_data
    
    def _normalize_edi_content(self, content: str) -> str:
        """Normalize EDI content by removing extra whitespace and line breaks."""
        # Remove line breaks and extra spaces
        normalized = re.sub(r'\s+', ' ', content.strip())
        # Remove spaces around segment terminators
        normalized = re.sub(r'\s*\'\s*', "'", normalized)
        return normalized
    
    def _split_into_segments(self, content: str) -> List[EDIFACTSegment]:
        """Split EDI content into individual segments."""
        segments = []
        
        # Split by segment terminator (')
        raw_segments = content.split("'")
        
        for raw_segment in raw_segments:
            raw_segment = raw_segment.strip()
            if not raw_segment:
                continue
                
            # Split segment into tag and elements
            parts = raw_segment.split('+')
            if len(parts) < 1:
                continue
                
            tag = parts[0].strip()
            elements = [part.strip() for part in parts[1:]]
            
            if tag:  # Only add segments with valid tags
                segments.append(EDIFACTSegment(tag, elements))
        
        return segments
    
    def _parse_segments(self) -> Dict[str, Any]:
        """Parse all segments into structured data."""
        data = {
            'message_info': {},
            'header': {},
            'container_details': {},
            'parties': [],
            'locations': [],
            'measurements': [],
            'dates': []
        }
        
        for segment in self.segments:
            if segment.tag == 'UNB':
                data['message_info'].update(self._parse_unb_segment(segment))
            elif segment.tag == 'UNH':
                data['message_info'].update(self._parse_unh_segment(segment))
            elif segment.tag == 'BGM':
                data['header'].update(self._parse_bgm_segment(segment))
            elif segment.tag == 'DTM':
                data['dates'].append(self._parse_dtm_segment(segment))
            elif segment.tag == 'NAD':
                data['parties'].append(self._parse_nad_segment(segment))
            elif segment.tag == 'COD':
                data['container_details'].update(self._parse_cod_segment(segment))
            elif segment.tag == 'LOC':
                data['locations'].append(self._parse_loc_segment(segment))
            elif segment.tag == 'MEA':
                data['measurements'].append(self._parse_mea_segment(segment))
            elif segment.tag == 'UNT':
                data['message_info'].update(self._parse_unt_segment(segment))
            elif segment.tag == 'UNZ':
                data['message_info'].update(self._parse_unz_segment(segment))
        
        return data
    
    def _parse_unb_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse UNB (Service String Advice) segment."""
        return {
            'syntax_identifier': segment.get_composite(0, 0),
            'syntax_version': segment.get_composite(0, 1),
            'sender': segment.get_element(1),
            'receiver': segment.get_element(2),
            'date': segment.get_element(3),
            'time': segment.get_element(4),
            'interchange_control_ref': segment.get_element(5)
        }
    
    def _parse_unh_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse UNH (Message Header) segment."""
        return {
            'message_reference_number': segment.get_element(0),
            'message_type': segment.get_composite(1, 0),
            'message_version': segment.get_composite(1, 1),
            'message_release': segment.get_composite(1, 2),
            'controlling_agency': segment.get_composite(1, 3),
            'association_assigned_code': segment.get_composite(1, 4)
        }
    
    def _parse_bgm_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse BGM (Beginning of Message) segment."""
        return {
            'document_name_code': segment.get_element(0),
            'document_number': segment.get_element(1),
            'message_function_code': segment.get_element(2)
        }
    
    def _parse_dtm_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse DTM (Date/Time/Period) segment."""
        return {
            'date_time_qualifier': segment.get_composite(0, 0),
            'date_time': segment.get_composite(0, 1),
            'date_time_format': segment.get_composite(0, 2)
        }
    
    def _parse_nad_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse NAD (Name and Address) segment."""
        return {
            'party_qualifier': segment.get_element(0),
            'party_identification': segment.get_element(1),
            'name_and_address': segment.get_element(3)
        }
    
    def _parse_cod_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse COD (Container Details) segment."""
        return {
            'container_number': segment.get_element(0),
            'container_size': segment.get_element(1),
            'container_status': segment.get_element(2)
        }
    
    def _parse_loc_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse LOC (Location) segment."""
        return {
            'location_qualifier': segment.get_element(0),
            'location_identification': segment.get_element(1)
        }
    
    def _parse_mea_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse MEA (Measurements) segment."""
        return {
            'measurement_purpose_qualifier': segment.get_element(0),
            'unit_of_measurement': segment.get_element(1),
            'measurement_value': segment.get_element(2)
        }
    
    def _parse_unt_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse UNT (Message Trailer) segment."""
        return {
            'segment_count': segment.get_element(0),
            'message_reference_number_trailer': segment.get_element(1)
        }
    
    def _parse_unz_segment(self, segment: EDIFACTSegment) -> Dict[str, Any]:
        """Parse UNZ (Service String Advice) segment."""
        return {
            'interchange_control_count': segment.get_element(0),
            'interchange_control_ref_trailer': segment.get_element(1)
        }


def parse_edi_to_dict(edi_content: str) -> Dict[str, Any]:
    """
    Parse EDI content and return structured dictionary.
    
    Args:
        edi_content: Raw EDI message content.
        
    Returns:
        Dictionary with parsed EDI data.
    """
    parser = EDIFACTParser()
    return parser.parse_edi_message(edi_content)


def convert_edi_to_xml(edi_content: str) -> str:
    """
    Convert EDI CODECO message to XML format.
    
    Args:
        edi_content: Raw EDI message content.
        
    Returns:
        XML string in SAP CODECO format.
        
    Raises:
        ValueError: If EDI parsing fails or required data is missing.
    """
    # Parse EDI to structured data
    parsed_data = parse_edi_to_dict(edi_content)
    
    # Extract key information for XML generation
    xml_data = _map_edi_data_to_xml_structure(parsed_data)
    
    # Generate XML
    xml_content = _generate_xml_from_edi_data(xml_data)
    
    return xml_content


def _map_edi_data_to_xml_structure(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    """Map parsed EDI data to XML structure format."""
    
    # Find relevant parties
    terminal_operator = None
    transporter = None
    customer = None
    
    for party in parsed_data.get('parties', []):
        if party.get('party_qualifier') == 'TO':
            terminal_operator = party
        elif party.get('party_qualifier') == 'FR':
            transporter = party
        elif party.get('party_qualifier') == 'SH':
            customer = party
    
    # Find creation date/time
    creation_date = None
    creation_time = None
    
    for date_info in parsed_data.get('dates', []):
        if date_info.get('date_time_qualifier') == '137':  # Document date/time
            datetime_str = date_info.get('date_time', '')
            if len(datetime_str) >= 14:  # YYYYMMDDHHMMSS
                creation_date = datetime_str[:8]  # YYYYMMDD
                creation_time = datetime_str[8:14]  # HHMMSS
            break
    
    # Find location
    location_code = None
    for location in parsed_data.get('locations', []):
        if location.get('location_qualifier') == '87':  # Place of acceptance
            location_code = location.get('location_identification')
            break
    
    # Container details
    container_details = parsed_data.get('container_details', {})
    
    return {
        'yardId': location_code or terminal_operator.get('party_identification', '') if terminal_operator else '',
        'client': customer.get('party_identification', '') if customer else '',
        'weighbridge_id': f"WB{datetime.now().strftime('%Y%m%d%H%M%S')}",  # Generated
        'weighbridge_id_sno': '00001',  # Default
        'transporter': transporter.get('name_and_address', '') if transporter else '',
        'container_number': container_details.get('container_number', ''),
        'container_size': container_details.get('container_size', ''),
        'status': container_details.get('container_status', ''),
        'vehicle_number': 'UNKNOWN',  # Not available in EDI
        'created_date': creation_date or datetime.now().strftime('%Y%m%d'),
        'created_time': creation_time or datetime.now().strftime('%H%M%S'),
        'changed_date': creation_date or datetime.now().strftime('%Y%m%d'),
        'changed_time': creation_time or datetime.now().strftime('%H%M%S'),
        'created_by': 'EDI_IMPORT'
    }


def _generate_xml_from_edi_data(data: Dict[str, Any]) -> str:
    """Generate XML from mapped EDI data."""
    
    # Define XML namespaces
    nsmap = {
        'n0': 'urn:olam.com:IVC:EDIFACT:ONE',
        'prx': 'urn:sap.com:proxy:GRP:/1SAI/TASC3DF160D1FCBB8D1B039:740',
        'soap-env': 'http://schemas.xmlsoap.org/soap/envelope/'
    }
    
    # Create root element
    root = etree.Element(
        '{urn:olam.com:IVC:EDIFACT:ONE}SAP_CODECO_REPORT_MT',
        nsmap=nsmap
    )
    
    # Create Records container
    records = etree.SubElement(root, 'Records')
    
    # Header section
    header = etree.SubElement(records, 'Header')
    
    company_code = etree.SubElement(header, 'Company_Code')
    company_code.text = 'CIABJ31'
    
    plant = etree.SubElement(header, 'Plant')
    plant.text = data.get('yardId', '')
    
    customer = etree.SubElement(header, 'Customer')
    customer.text = data.get('client', '')
    
    # Item section
    item = etree.SubElement(records, 'Item')
    
    weighbridge_id = etree.SubElement(item, 'Weighbridge_ID')
    weighbridge_id.text = data.get('weighbridge_id', '')
    
    weighbridge_id_sno = etree.SubElement(item, 'Weighbridge_ID_SNO')
    weighbridge_id_sno.text = data.get('weighbridge_id_sno', '')
    
    transporter = etree.SubElement(item, 'Transporter')
    transporter.text = data.get('transporter', '')
    
    container_number = etree.SubElement(item, 'Container_Number')
    container_number.text = data.get('container_number', '')
    
    container_size = etree.SubElement(item, 'Container_Size')
    container_size.text = data.get('container_size', '')
    
    # Static fields
    design = etree.SubElement(item, 'Design')
    design.text = '003'
    
    item_type = etree.SubElement(item, 'Type')
    item_type.text = '02'
    
    color = etree.SubElement(item, 'Color')
    color.text = '#312682'
    
    clean_type = etree.SubElement(item, 'Clean_Type')
    clean_type.text = '001'
    
    status = etree.SubElement(item, 'Status')
    status.text = data.get('status', '')
    
    device_number = etree.SubElement(item, 'Device_Number')
    device_number.text = 'TD2019031200'
    
    vehicle_number = etree.SubElement(item, 'Vehicle_Number')
    vehicle_number.text = data.get('vehicle_number', '')
    
    created_date = etree.SubElement(item, 'Created_Date')
    created_date.text = data.get('created_date', '')
    
    created_time = etree.SubElement(item, 'Created_Time')
    created_time.text = data.get('created_time', '')
    
    created_by = etree.SubElement(item, 'Created_By')
    created_by.text = data.get('created_by', '')
    
    changed_date = etree.SubElement(item, 'Changed_Date')
    changed_date.text = data.get('changed_date', '')
    
    changed_time = etree.SubElement(item, 'Changed_Time')
    changed_time.text = data.get('changed_time', '')
    
    changed_by = etree.SubElement(item, 'Changed_By')
    changed_by.text = data.get('created_by', '')
    
    num_of_entries = etree.SubElement(item, 'Num_Of_Entries')
    num_of_entries.text = '1'
    
    # Convert to pretty-printed XML string
    xml_string = etree.tostring(
        root,
        pretty_print=True,
        xml_declaration=True,
        encoding='UTF-8'
    ).decode('utf-8')
    
    return xml_string


def validate_edi_format(edi_content: str) -> Tuple[bool, List[str]]:
    """
    Validate EDI format and return validation results.
    
    Args:
        edi_content: Raw EDI content to validate.
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    if not edi_content or not edi_content.strip():
        errors.append("EDI content is empty")
        return False, errors
    
    # Check for basic EDIFACT structure
    if "UNB+" not in edi_content:
        errors.append("Missing UNB segment (message envelope)")
    
    if "UNH+" not in edi_content:
        errors.append("Missing UNH segment (message header)")
    
    if "UNT+" not in edi_content:
        errors.append("Missing UNT segment (message trailer)")
    
    if "UNZ+" not in edi_content:
        errors.append("Missing UNZ segment (envelope closing)")
    
    # Check for CODECO specific segments
    if "CODECO" not in edi_content:
        errors.append("Not a CODECO message type")
    
    # Check segment termination
    if not re.search(r"'", edi_content):
        errors.append("Missing segment terminators (')")
    
    # Try to parse and catch parsing errors
    try:
        parser = EDIFACTParser()
        parser.parse_edi_message(edi_content)
    except Exception as e:
        errors.append(f"Parsing error: {str(e)}")
    
    return len(errors) == 0, errors