"""
Simple CODECO EDI Generator without external dependencies
Uses only Python standard library for Vercel compatibility
Matches the TypeScript CodecoGenerator format exactly
"""

from datetime import datetime, timezone


def generate_codeco_edi(data: dict) -> str:
    """
    Generate CODECO EDI message from data dictionary.
    Matches the format from TypeScript CodecoGenerator.
    
    Args:
        data: Dictionary containing container and operation data
        
    Returns:
        str: EDI CODECO message in EDIFACT format (no line breaks)
    """
    
    # Get current date and time
    current_dt = datetime.now(timezone.utc)
    
    # Generate message reference: COD + MMDDHHMM (e.g., COD02051428)
    mm = current_dt.strftime('%m')
    dd = current_dt.strftime('%d')
    hh = current_dt.strftime('%H')
    min_val = current_dt.strftime('%M')
    msg_ref = f"COD{mm}{dd}{hh}{min_val}"
    
    # Generate interchange control reference: SenderCode + MMDD (e.g., MANTRA0205)
    sender_code = data.get('sender', data.get('company_code', 'MANTRA'))
    control_ref = f"{sender_code}{mm}{dd}"
    
    # Format date and time for UNB: YYMMDD:HHMM
    msg_date = current_dt.strftime('%y%m%d')
    msg_time = current_dt.strftime('%H%M')
    
    # Build EDI segments (no line breaks - single line format)
    segments = []
    
    # UNB - Interchange Header
    # Format: UNB+UNOA:1+MANTRA+ClientName+260205:1428+MANTRA0205'
    receiver = data.get('receiver', data.get('customer', 'CLIENT'))
    segments.append(
        f"UNB+UNOA:1+{sender_code}+{receiver}+{msg_date}:{msg_time}+{control_ref}'"
    )
    
    # UNH - Message Header
    # Format: UNH+COD02051428+CODECO:D:95B:UN:ITG14'
    segments.append(f"UNH+{msg_ref}+CODECO:D:95B:UN:ITG14'")
    
    # BGM - Beginning of Message
    # Format: BGM+36+TRHU687548302051428+9'
    # Document number: ContainerNumber + MMDDHHMM
    container_number = data.get('container_number', '')
    doc_number = f"{container_number}{mm}{dd}{hh}{min_val}"
    segments.append(f"BGM+36+{doc_number}+9'")
    
    # FTX - Free Text (General information)
    # Format: FTX+AAI'
    segments.append("FTX+AAI'")
    
    # TDT - Details of Transport
    # Format: TDT+1++3+31'
    segments.append("TDT+1++3+31'")
    
    # NAD - Name and Address (Message sender)
    # Format: NAD+MS+MANTRA'
    segments.append(f"NAD+MS+{sender_code}'")
    
    # NAD - Name and Address (Consignee/Freight forwarder)
    # Format: NAD+CF+ONEY:160:20'
    segments.append(f"NAD+CF+{receiver}:160:20'")
    
    # EQD - Equipment Details
    # Format: EQD+CN+TRHU6875483+40EM:102:5+++4'
    container_size = data.get('container_size', '40').replace('ft', '')
    container_type = data.get('container_type', 'EM')
    
    # Map container type to proper code
    type_mapping = {
        'dry': 'EM',
        'empty': 'EM',
        'full': 'FL',
        'reefer': 'RE',
        'tank': 'TK',
        'flat_rack': 'FR',
        'open_top': 'OT'
    }
    container_type_code = type_mapping.get(container_type.lower(), container_type.upper())
    
    size_type = f"{container_size}{container_type_code}"
    segments.append(f"EQD+CN+{container_number}+{size_type}:102:5+++4'")
    
    # RFF - Reference segments (optional)
    # RFF+BN:BookingNumber' for Booking Number
    if data.get('booking_reference'):
        segments.append(f"RFF+BN:{data['booking_reference']}'")
    
    # RFF+EQR:EquipmentReference' for Equipment Reference (ONEY client only)
    if data.get('equipment_reference') and 'ONEY' in data.get('customer', '').upper():
        segments.append(f"RFF+EQR:{data['equipment_reference']}'")
    
    # DTM - Date/Time/Period
    # Format: DTM+203:20260218234900:203' (CCYYMMDDHHMMSS - 14 digits)
    # Note: operationDate is YYMMDD, operationTime is HHMMSS
    operation_date = data.get('operation_date', current_dt.strftime('%y%m%d'))
    operation_time = data.get('operation_time', current_dt.strftime('%H%M%S'))
    
    # Ensure operation_date is YYMMDD format (6 digits)
    if len(operation_date) == 6:
        # Convert YYMMDD to CCYYMMDDHHMMSS
        operation_datetime = f"20{operation_date}{operation_time}"
    elif len(operation_date) == 8:
        # Already YYYYMMDD, just add time
        operation_datetime = f"{operation_date}{operation_time}"
    else:
        # Fallback to current datetime
        operation_datetime = current_dt.strftime('%Y%m%d%H%M%S')
    
    segments.append(f"DTM+203:{operation_datetime}:203'")
    
    # LOC - Location Details
    # Format: LOC+165+CIABJ:139:6+CIABJ31:STO:ZZZ' (PIL) or CIABJ32:STO:ZZZ' (ONEY)
    location_code = data.get('location_code', 'CIABJ')
    
    # Ensure location_code is not a UUID
    if '-' in str(location_code) and len(str(location_code)) > 20:
        # It's a UUID, use default
        location_code = 'CIABJ'
    
    location_details = data.get('location_details', 'CIABJ32:STO:ZZZ')
    
    # Determine location details based on customer if not explicitly set
    customer = data.get('customer', '').upper()
    receiver_upper = receiver.upper()
    
    if 'PIL' in customer or 'PIL' in receiver_upper:
        location_details = 'CIABJ31:STO:ZZZ'
    elif 'ONEY' in customer or 'ONEY' in receiver_upper:
        location_details = 'CIABJ32:STO:ZZZ'
    
    segments.append(f"LOC+165+{location_code}:139:6+{location_details}'")
    
    # CNT - Control Count
    # Format: CNT+16:1'
    segments.append("CNT+16:1'")
    
    # UNT - Message Trailer
    # Format: UNT+12+COD02051428'
    # Count all segments between UNH and UNT (inclusive of UNT)
    segment_count = len(segments) - 1 + 1  # Exclude UNB, include UNT
    segments.append(f"UNT+{segment_count}+{msg_ref}'")
    
    # UNZ - Interchange Trailer
    # Format: UNZ+1+MANTRA0205'
    segments.append(f"UNZ+1+{control_ref}'")
    
    # Join all segments WITHOUT newlines (single line format like TypeScript)
    # Each segment already ends with ', so just concatenate them
    edi_content = ''.join(segments)
    
    # Debug: Print first 200 chars to verify format
    # print(f"EDI Content (first 200 chars): {edi_content[:200]}")
    
    return edi_content
