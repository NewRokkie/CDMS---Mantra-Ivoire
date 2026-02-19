"""
Simple test script for the CODECO generator
Run this to verify the generator works before deploying to Vercel
"""

from codeco_generator_simple import generate_codeco_edi

# Test data matching TypeScript format
test_data = {
    'sender': 'MANTRA',
    'receiver': 'ONEY',
    'company_code': 'MANTRA',
    'customer': 'ONEY',
    'container_number': 'TRHU6875483',
    'container_size': '40',
    'container_type': 'EM',
    'transport_company': 'TEST TRANSPORT',
    'vehicle_number': 'AB-123-CD',
    'operation_type': 'GATE_IN',
    'operation_date': '260205',  # YYMMDD
    'operation_time': '030200',  # HHMMSS
    'booking_reference': 'BK123456',
    'equipment_reference': 'SEAL123',
    'location_code': 'CIABJ',
    'location_details': 'CIABJ32:STO:ZZZ',
    'operator_name': 'John Doe',
    'operator_id': 'OP001',
    'yard_id': 'YARD01',
    'damage_reported': False,
}

print("Testing CODECO EDI Generator (Python - matching TypeScript format)...")
print("=" * 80)

try:
    edi_content = generate_codeco_edi(test_data)
    print("✓ CODECO generated successfully!")
    print("\nGenerated EDI Content:")
    print("-" * 80)
    print(edi_content)
    print("-" * 80)
    
    # Parse segments for display
    segments = edi_content.split("'")
    print(f"\nTotal segments: {len([s for s in segments if s])}")
    print("\nSegment breakdown:")
    for i, segment in enumerate(segments):
        if segment:
            print(f"  {i+1}. {segment}'")
    
    # Expected format reference (from TypeScript)
    print("\n" + "=" * 80)
    print("Expected format (from TypeScript CodecoGenerator):")
    print("-" * 80)
    print("UNB+UNOA:1+MANTRA+ONEY+260205:1428+MANTRA0205'")
    print("UNH+COD02051428+CODECO:D:95B:UN:ITG14'")
    print("BGM+36+TRHU687548302051428+9'")
    print("FTX+AAI'")
    print("TDT+1++3+31'")
    print("NAD+MS+MANTRA'")
    print("NAD+CF+ONEY:160:20'")
    print("EQD+CN+TRHU6875483+40EM:102:5+++4'")
    print("RFF+BN:BK123456'")
    print("RFF+EQR:SEAL123'")
    print("DTM+203:202602050302:203'")
    print("LOC+165+CIABJ:139:6+CIABJ32:STO:ZZZ'")
    print("CNT+16:1'")
    print("UNT+12+COD02051428'")
    print("UNZ+1+MANTRA0205'")
    print("-" * 80)
    
    print("\n✓ Test passed!")
except Exception as e:
    print(f"✗ Test failed: {e}")
    import traceback
    traceback.print_exc()
