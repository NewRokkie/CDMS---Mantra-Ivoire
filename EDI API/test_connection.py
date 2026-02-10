#!/usr/bin/env python3
"""
Connection test utility for SFTP/FTP servers.
Tests connectivity and diagnoses common issues.
"""

import socket
import sys
import paramiko
import ftplib
from config import config

def test_basic_connectivity(host, port):
    """Test basic TCP connectivity to host:port"""
    print(f"Testing basic TCP connectivity to {host}:{port}...")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ TCP connection to {host}:{port} successful")
            return True
        else:
            print(f"❌ TCP connection to {host}:{port} failed (error code: {result})")
            return False
    except Exception as e:
        print(f"❌ TCP connection test failed: {e}")
        return False

def test_sftp_connection(host, port, username, password):
    """Test SFTP connection"""
    print(f"Testing SFTP connection to {host}:{port}...")
    
    try:
        transport = paramiko.Transport((host, port))
        transport.connect(username=username, password=password)
        
        sftp = paramiko.SFTPClient.from_transport(transport)
        
        # Test listing directory
        files = sftp.listdir('.')
        print(f"✅ SFTP connection successful. Found {len(files)} items in root directory")
        
        sftp.close()
        transport.close()
        return True
        
    except paramiko.AuthenticationException as e:
        print(f"❌ SFTP authentication failed: {e}")
        return False
    except paramiko.SSHException as e:
        print(f"❌ SFTP SSH error: {e}")
        return False
    except Exception as e:
        print(f"❌ SFTP connection failed: {e}")
        return False

def test_ftp_connection(host, port, username, password):
    """Test FTP connection"""
    print(f"Testing FTP connection to {host}:{port}...")
    
    try:
        ftp = ftplib.FTP()
        ftp.connect(host, port)
        ftp.login(username, password)
        
        # Test listing directory
        files = ftp.nlst()
        print(f"✅ FTP connection successful. Found {len(files)} items in root directory")
        
        ftp.quit()
        return True
        
    except ftplib.error_perm as e:
        print(f"❌ FTP permission error: {e}")
        return False
    except ftplib.all_errors as e:
        print(f"❌ FTP connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ FTP connection failed: {e}")
        return False

def diagnose_windows_issues():
    """Provide Windows-specific troubleshooting tips"""
    print("\n🔍 Windows Connection Issues Diagnosis:")
    print("=" * 50)
    
    print("\n1. Windows Firewall:")
    print("   - Check if Windows Firewall is blocking Python.exe")
    print("   - Add exception for Python or the EDI API application")
    
    print("\n2. Antivirus Software:")
    print("   - Temporarily disable real-time protection")
    print("   - Add Python.exe to antivirus exclusions")
    
    print("\n3. Corporate Network:")
    print("   - Check if corporate firewall blocks outbound SFTP (port 22)")
    print("   - Contact IT department for network access")
    
    print("\n4. VPN/Proxy:")
    print("   - Try disconnecting VPN temporarily")
    print("   - Check proxy settings")
    
    print("\n5. Alternative Solutions:")
    print("   - Use local FTP server for development")
    print("   - Configure different SFTP port if available")
    print("   - Use FTPS instead of SFTP if supported")

def main():
    """Main connection test function"""
    print("🧪 EDI File Transfer Connection Test")
    print("=" * 40)
    
    # Get configuration
    host = config.TRANSFER_HOST
    port = config.TRANSFER_PORT
    username = config.TRANSFER_USER
    password = config.TRANSFER_PASSWORD
    protocol = config.TRANSFER_PROTOCOL
    
    if not all([host, username, password]):
        print("❌ Missing configuration. Please check your .env file.")
        return False
    
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Username: {username}")
    print(f"Protocol: {protocol}")
    print(f"Remote Dir: {config.TRANSFER_REMOTE_DIR}")
    print()
    
    # Test basic connectivity first
    tcp_ok = test_basic_connectivity(host, port)
    
    if not tcp_ok:
        print("\n❌ Basic TCP connectivity failed!")
        diagnose_windows_issues()
        return False
    
    # Test protocol-specific connection
    success = False
    
    if protocol == 'sftp' or (protocol == 'auto' and port == 22):
        success = test_sftp_connection(host, port, username, password)
    elif protocol == 'ftp' or (protocol == 'auto' and port == 21):
        success = test_ftp_connection(host, port, username, password)
    else:
        # Try both protocols
        print("Testing both protocols...")
        success = test_sftp_connection(host, port, username, password)
        if not success:
            success = test_ftp_connection(host, port, username, password)
    
    if success:
        print("\n🎉 Connection test successful! The EDI API should work correctly.")
    else:
        print("\n❌ Connection test failed!")
        diagnose_windows_issues()
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)