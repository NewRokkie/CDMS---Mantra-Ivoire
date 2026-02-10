"""
Examples of EDI CODECO conversion functionality.
Demonstrates both XML to EDI and EDI to XML conversion capabilities.
"""

import requests
import json
from pathlib import Path


# API Base URL
API_BASE_URL = "http://localhost:5000/api/v1/codeco"


def example_xml_to_edi_conversion():
    """Example: Convert JSON data to XML and then to EDI."""
    
    print("=== XML to EDI Conversion Example ===")
    
    # Sample request data
    request_data = {
        "yardId": "419101",
        "client": "0001052069",
        "weighbridge_id": "244191001345",
        "weighbridge_id_sno": "00001",
        "transporter": "PROPRE MOYEN",
        "container_number": "PCIU9507070",
        "container_size": "40",
        "status": "01",
        "vehicle_number": "028-AA-01",
        "created_by": "HCIHABIBS"
    }
    
    try:
        # Call the generate endpoint
        response = requests.post(
            f"{API_BASE_URL}/generate",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result['message']}")
            print(f"📄 XML File: {result['xml_file']}")
            print(f"📄 EDI File: {result['edi_file']}")
            print(f"📤 SFTP Upload: {result['uploaded_to_sftp']}")
        else:
            error = response.json()
            print(f"❌ Error: {error['message']}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


def example_edi_to_xml_conversion():
    """Example: Convert EDI CODECO message back to XML."""
    
    print("\n=== EDI to XML Conversion Example ===")
    
    # Sample EDI CODECO content
    sample_edi_content = """UNB+UNOC:3+CIABJ31+419101+240101+1200+20240101120000'
UNH+1+CODECO:D:96A:UN:EANCOM'
BGM+393+PCIU9507070+9'
DTM+137:20240101120000:204'
NAD+TO+419101'
NAD+FR+PROPRE MOYEN++PROPRE MOYEN'
NAD+SH+0001052069'
LOC+87+419101'
COD+PCIU9507070+40+01'
UNT+11+1'
UNZ+1+20240101120000'"""
    
    try:
        # Call the EDI to XML conversion endpoint
        response = requests.post(
            f"{API_BASE_URL}/convert-edi-to-xml",
            json={"edi_content": sample_edi_content},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result['message']}")
            print(f"📄 XML File: {result['xml_file']}")
            print(f"✅ Validation Passed: {result['validation_passed']}")
            
            # Show first 500 characters of XML content
            xml_preview = result['xml_content'][:500] + "..." if len(result['xml_content']) > 500 else result['xml_content']
            print(f"📄 XML Preview:\n{xml_preview}")
            
            # Show parsed EDI data if available
            if 'parsed_edi_data' in result:
                container_info = result['parsed_edi_data'].get('container_details', {})
                print(f"📦 Container: {container_info.get('container_number', 'N/A')}")
                print(f"📏 Size: {container_info.get('container_size', 'N/A')}")
                print(f"📊 Status: {container_info.get('container_status', 'N/A')}")
        else:
            error = response.json()
            print(f"❌ Error: {error['message']}")
            if 'validation_errors' in error:
                print("Validation Errors:")
                for err in error['validation_errors']:
                    print(f"  - {err}")
                    
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


def example_edi_validation():
    """Example: Validate EDI format without conversion."""
    
    print("\n=== EDI Validation Example ===")
    
    # Sample EDI content (with intentional issues for demonstration)
    sample_edi_content = """UNB+UNOC:3+CIABJ31+419101+240101+1200+20240101120000'
UNH+1+CODECO:D:96A:UN:EANCOM'
BGM+393+PCIU9507070+9'
DTM+137:20240101120000:204'
NAD+TO+419101'
COD+PCIU9507070+40+01'
UNT+8+1'
UNZ+1+20240101120000'"""
    
    try:
        # Call the validation endpoint
        response = requests.post(
            f"{API_BASE_URL}/validate-edi",
            json={"edi_content": sample_edi_content},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"📋 Status: {result['status']}")
            print(f"✅ Valid: {result['is_valid']}")
            
            if result['validation_errors']:
                print("Validation Errors:")
                for err in result['validation_errors']:
                    print(f"  - {err}")
            
            if result['parsing_errors']:
                print("Parsing Errors:")
                for err in result['parsing_errors']:
                    print(f"  - {err}")
            
            if result['parsed_data']:
                print("✅ Successfully parsed EDI structure")
                container_info = result['parsed_data'].get('container_details', {})
                if container_info:
                    print(f"📦 Container: {container_info.get('container_number', 'N/A')}")
        else:
            error = response.json()
            print(f"❌ Error: {error['message']}")
                    
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


def example_file_upload_edi_conversion():
    """Example: Upload EDI file for conversion."""
    
    print("\n=== File Upload EDI Conversion Example ===")
    
    # Create a sample EDI file
    sample_edi_content = """UNB+UNOC:3+CIABJ31+419101+240101+1200+20240101120000'
UNH+1+CODECO:D:96A:UN:EANCOM'
BGM+393+TESTCONTAINER123+9'
DTM+137:20240101120000:204'
NAD+TO+419101'
NAD+FR+TEST TRANSPORT++TEST TRANSPORT'
NAD+SH+TESTCLIENT001'
LOC+87+419101'
COD+TESTCONTAINER123+20+01'
UNT+11+1'
UNZ+1+20240101120000'"""
    
    # Write to temporary file
    temp_file_path = Path("temp_sample.edi")
    temp_file_path.write_text(sample_edi_content)
    
    try:
        # Upload file for conversion
        with open(temp_file_path, 'rb') as file:
            files = {'edi_file': ('sample.edi', file, 'text/plain')}
            
            response = requests.post(
                f"{API_BASE_URL}/convert-edi-to-xml",
                files=files
            )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result['message']}")
            print(f"📄 XML File: {result['xml_file']}")
            print(f"✅ Validation Passed: {result['validation_passed']}")
        else:
            error = response.json()
            print(f"❌ Error: {error['message']}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    finally:
        # Clean up temporary file
        if temp_file_path.exists():
            temp_file_path.unlink()


def example_health_check():
    """Example: Check API health."""
    
    print("\n=== API Health Check ===")
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Status: {result['status']}")
            print(f"🕐 Timestamp: {result['timestamp']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check request failed: {e}")


def run_all_examples():
    """Run all conversion examples."""
    
    print("🚀 EDI CODECO Conversion Examples")
    print("=" * 50)
    
    # Check API health first
    example_health_check()
    
    # Run conversion examples
    example_xml_to_edi_conversion()
    example_edi_to_xml_conversion()
    example_edi_validation()
    example_file_upload_edi_conversion()
    
    print("\n✅ All examples completed!")


if __name__ == "__main__":
    run_all_examples()