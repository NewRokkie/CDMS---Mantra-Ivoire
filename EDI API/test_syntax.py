#!/usr/bin/env python3
"""
Simple syntax test for EDI parser functionality.
"""

def test_imports():
    """Test that all modules can be imported."""
    try:
        from services.edi_parser import (
            EDIFACTParser,
            EDIFACTSegment,
            parse_edi_to_dict,
            convert_edi_to_xml,
            validate_edi_format
        )
        print("✅ EDI Parser imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_basic_functionality():
    """Test basic EDI parsing functionality."""
    try:
        from services.edi_parser import EDIFACTSegment, validate_edi_format
        
        # Test segment creation
        segment = EDIFACTSegment('UNB', ['UNOC:3', 'SENDER', 'RECEIVER'])
        assert segment.tag == 'UNB'
        assert segment.get_element(0) == 'UNOC:3'
        assert segment.get_composite(0, 0) == 'UNOC'
        print("✅ EDIFACTSegment functionality works")
        
        # Test validation
        sample_edi = """UNB+UNOC:3+SENDER+RECEIVER'UNH+1+CODECO'UNT+2+1'UNZ+1+1'"""
        is_valid, errors = validate_edi_format(sample_edi)
        print(f"✅ EDI validation works: valid={is_valid}, errors={len(errors)}")
        
        return True
    except Exception as e:
        print(f"❌ Functionality test error: {e}")
        return False

def test_conversion():
    """Test EDI to XML conversion."""
    try:
        from services.edi_parser import convert_edi_to_xml
        
        sample_edi = """UNB+UNOC:3+CIABJ31+419101+240101+1200+20240101120000'
UNH+1+CODECO:D:96A:UN:EANCOM'
BGM+393+PCIU9507070+9'
DTM+137:20240101120000:204'
NAD+TO+419101'
COD+PCIU9507070+40+01'
UNT+8+1'
UNZ+1+20240101120000'"""
        
        xml_result = convert_edi_to_xml(sample_edi)
        assert '<?xml' in xml_result
        assert 'PCIU9507070' in xml_result
        print("✅ EDI to XML conversion works")
        
        return True
    except Exception as e:
        print(f"❌ Conversion test error: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Testing EDI Parser Syntax and Basic Functionality")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_basic_functionality,
        test_conversion
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
    
    print("=" * 60)
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! EDI Parser is ready to use.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the implementation.")
        return 1

if __name__ == "__main__":
    exit(main())