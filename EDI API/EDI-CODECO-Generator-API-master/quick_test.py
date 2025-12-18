#!/usr/bin/env python3
"""
Quick connection test using only standard library
"""

import socket
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_tcp_connection():
    """Test basic TCP connectivity"""
    host = os.getenv('TRANSFER_HOST', os.getenv('SFTP_HOST'))
    port = int(os.getenv('TRANSFER_PORT', os.getenv('SFTP_PORT', '22')))
    
    print(f"🧪 Testing TCP connection to {host}:{port}")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ TCP connection successful")
            return True
        else:
            print(f"❌ TCP connection failed (error: {result})")
            
            if result == 10013:
                print("\n🚨 Error 10013 - Permission Denied")
                print("This is typically caused by:")
                print("1. Windows Firewall blocking the connection")
                print("2. Antivirus software interference") 
                print("3. Corporate network restrictions")
                print("4. VPN/Proxy blocking the connection")
                
            return False
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_tcp_connection()
    
    if not success:
        print("\n💡 Quick Solutions:")
        print("1. Temporarily disable Windows Firewall")
        print("2. Add Python.exe to antivirus exclusions")
        print("3. Try using local FTP server instead")
        print("4. Check if VPN is interfering")
    
    sys.exit(0 if success else 1)