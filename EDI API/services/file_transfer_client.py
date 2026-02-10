"""
Unified File Transfer Client supporting both FTP and SFTP protocols.
Automatically detects protocol based on port or explicit configuration.
"""

import asyncio
import logging
from typing import Optional, Literal
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import ftplib
import paramiko

logger = logging.getLogger(__name__)

# Thread pool for running blocking operations
_executor = ThreadPoolExecutor(max_workers=5)

ProtocolType = Literal['ftp', 'sftp', 'auto']


class UnifiedFileTransferClient:
    """
    Unified client supporting both FTP and SFTP protocols.
    
    Automatically detects protocol based on:
    - Explicit protocol parameter
    - Port number (21 = FTP, 22 = SFTP)
    - Auto-detection by trying both protocols
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        remote_dir: str = '/',
        protocol: ProtocolType = 'auto',
        max_retries: int = 3,
        retry_delay: int = 1
    ):
        """
        Initialize unified file transfer client.

        Args:
            host: Server hostname or IP address.
            port: Server port (21 for FTP, 22 for SFTP).
            username: Username for authentication.
            password: Password for authentication.
            remote_dir: Remote directory for uploads (default: '/').
            protocol: Protocol to use ('ftp', 'sftp', or 'auto').
            max_retries: Maximum retry attempts (default: 3).
            retry_delay: Initial delay between retries (default: 1).
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.remote_dir = remote_dir.rstrip('/')
        self.protocol = protocol
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        # Determine actual protocol to use
        self._detected_protocol = self._detect_protocol()

    def _detect_protocol(self) -> Literal['ftp', 'sftp']:
        """
        Detect which protocol to use based on configuration.
        
        Returns:
            'ftp' or 'sftp' based on detection logic.
        """
        if self.protocol == 'ftp':
            return 'ftp'
        elif self.protocol == 'sftp':
            return 'sftp'
        else:  # auto detection
            if self.port == 21:
                logger.info(f"Port {self.port} detected - using FTP protocol")
                return 'ftp'
            elif self.port == 22:
                logger.info(f"Port {self.port} detected - using SFTP protocol")
                return 'sftp'
            else:
                # Default to SFTP for non-standard ports
                logger.info(f"Non-standard port {self.port} - defaulting to SFTP protocol")
                return 'sftp'

    async def upload_file(
        self,
        local_file_path: str,
        remote_file_name: Optional[str] = None
    ) -> bool:
        """
        Upload a file using the detected protocol with retry logic.

        Args:
            local_file_path: Full path to local file to upload.
            remote_file_name: Optional custom name for remote file.

        Returns:
            bool: True if upload succeeded, False otherwise.

        Raises:
            FileNotFoundError: If local file doesn't exist.
            IOError: If final upload attempt fails (after all retries).
        """
        # Validate local file exists
        if not Path(local_file_path).exists():
            error_msg = f"Local file not found: {local_file_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)

        # Use basename if remote filename not specified
        if remote_file_name is None:
            remote_file_name = Path(local_file_path).name

        # Attempt upload with retries
        for attempt in range(self.max_retries):
            try:
                logger.info(
                    f"{self._detected_protocol.upper()} upload attempt {attempt + 1}/{self.max_retries}: "
                    f"{local_file_path} -> {self.host}:{self.port}"
                )

                # Use appropriate upload method based on detected protocol
                if self._detected_protocol == 'ftp':
                    await self._upload_with_ftp(local_file_path, remote_file_name)
                else:
                    await self._upload_with_sftp(local_file_path, remote_file_name)

                logger.info(
                    f"Successfully uploaded {local_file_path} via {self._detected_protocol.upper()}"
                )
                return True

            except Exception as e:
                error_msg = str(e)
                logger.warning(
                    f"Upload attempt {attempt + 1} failed: {error_msg}"
                )

                # Check for specific Windows socket permission error
                if "WinError 10013" in error_msg:
                    logger.error("Windows socket permission error detected. This is usually caused by:")
                    logger.error("1. Windows Firewall blocking the connection")
                    logger.error("2. Antivirus software blocking network access")
                    logger.error("3. Corporate network restrictions")
                    logger.error("4. VPN or proxy interference")

                # If auto-detection and first protocol fails, try the other one
                if self.protocol == 'auto' and attempt == 0:
                    self._detected_protocol = 'sftp' if self._detected_protocol == 'ftp' else 'ftp'
                    logger.info(f"Switching to {self._detected_protocol.upper()} protocol for retry")
                    continue

                # Calculate exponential backoff delay
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2 ** attempt)
                    logger.info(f"Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                else:
                    # All retries exhausted
                    final_error = (
                        f"File upload failed after {self.max_retries} attempts. "
                        f"Last error: {error_msg}"
                    )
                    logger.error(final_error)
                    raise IOError(final_error)

        return False

    async def _upload_with_ftp(
        self,
        local_file_path: str,
        remote_file_name: str
    ) -> None:
        """Upload file using FTP protocol."""
        loop = asyncio.get_event_loop()

        def _ftp_upload_sync():
            try:
                # Create FTP connection
                ftp = ftplib.FTP()
                ftp.connect(self.host, self.port)
                ftp.login(self.username, self.password)

                try:
                    # Change to remote directory if specified
                    if self.remote_dir and self.remote_dir != '/':
                        try:
                            ftp.cwd(self.remote_dir)
                        except ftplib.error_perm:
                            # Directory might not exist, try to create it
                            try:
                                ftp.mkd(self.remote_dir)
                                ftp.cwd(self.remote_dir)
                            except ftplib.error_perm:
                                logger.warning(f"Could not create/access directory {self.remote_dir}")

                    # Upload file in binary mode
                    with open(local_file_path, 'rb') as file:
                        ftp.storbinary(f'STOR {remote_file_name}', file)

                finally:
                    ftp.quit()

            except ftplib.error_perm as e:
                raise IOError(f"FTP permission error: {str(e)}")
            except ftplib.error_temp as e:
                raise IOError(f"FTP temporary error: {str(e)}")
            except ftplib.all_errors as e:
                raise IOError(f"FTP error: {str(e)}")
            except Exception as e:
                raise IOError(f"FTP transfer error: {str(e)}")

        await loop.run_in_executor(_executor, _ftp_upload_sync)

    async def _upload_with_sftp(
        self,
        local_file_path: str,
        remote_file_name: str
    ) -> None:
        """Upload file using SFTP protocol."""
        loop = asyncio.get_event_loop()

        def _sftp_upload_sync():
            try:
                # Create SSH transport
                transport = paramiko.Transport((self.host, self.port))
                transport.connect(username=self.username, password=self.password)

                # Open SFTP client
                sftp = paramiko.SFTPClient.from_transport(transport)

                try:
                    # Construct full remote path
                    full_remote_path = f"{self.remote_dir}/{remote_file_name}".replace('//', '/')
                    
                    # Try to create remote directory if it doesn't exist
                    if self.remote_dir and self.remote_dir != '/':
                        try:
                            sftp.stat(self.remote_dir)
                        except FileNotFoundError:
                            try:
                                sftp.mkdir(self.remote_dir)
                            except Exception:
                                logger.warning(f"Could not create directory {self.remote_dir}")

                    # Upload file
                    sftp.put(local_file_path, full_remote_path)

                finally:
                    sftp.close()
                    transport.close()

            except paramiko.AuthenticationException as e:
                raise IOError(f"SFTP authentication error: {str(e)}")
            except paramiko.SSHException as e:
                raise IOError(f"SSH error: {str(e)}")
            except Exception as e:
                raise IOError(f"SFTP transfer error: {str(e)}")

        await loop.run_in_executor(_executor, _sftp_upload_sync)


async def upload_edi_file_unified(
    local_edi_path: str,
    host: str,
    port: int,
    username: str,
    password: str,
    remote_dir: str = '/',
    protocol: ProtocolType = 'auto',
    max_retries: int = 3,
    retry_delay: int = 1
) -> bool:
    """
    Convenience function to upload an EDI file using unified client.

    Args:
        local_edi_path: Full path to local EDI file.
        host: Server hostname.
        port: Server port.
        username: Username.
        password: Password.
        remote_dir: Remote directory for upload.
        protocol: Protocol to use ('ftp', 'sftp', or 'auto').
        max_retries: Maximum retry attempts.
        retry_delay: Initial delay between retries.

    Returns:
        bool: True if upload succeeded, False otherwise.
    """
    client = UnifiedFileTransferClient(
        host=host,
        port=port,
        username=username,
        password=password,
        remote_dir=remote_dir,
        protocol=protocol,
        max_retries=max_retries,
        retry_delay=retry_delay
    )

    return await client.upload_file(local_edi_path)