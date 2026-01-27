"""
FTP Client Service for asynchronous file uploads.
Handles uploading EDI files to FTP server with retry logic and exponential backoff.
Uses ftplib for FTP operations with async wrapper (run_in_executor).
"""

import asyncio
import logging
from typing import Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import ftplib

logger = logging.getLogger(__name__)

# Thread pool for running blocking FTP operations
_executor = ThreadPoolExecutor(max_workers=5)


class FTPClient:
    """
    Async FTP client for uploading files to remote FTP server.

    This client supports:
    - Asynchronous file uploads
    - Automatic retries with exponential backoff
    - Connection pooling and error handling
    - Detailed logging of operations and failures
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        remote_dir: str = '/',
        max_retries: int = 3,
        retry_delay: int = 1
    ):
        """
        Initialize FTP client configuration.

        Args:
            host: FTP server hostname or IP address.
            port: FTP server port (typically 21).
            username: FTP username for authentication.
            password: FTP password for authentication.
            remote_dir: Remote directory where files should be uploaded (default: '/').
            max_retries: Maximum number of retry attempts (default: 3).
            retry_delay: Initial delay in seconds between retry attempts (default: 1).
                        Uses exponential backoff: delay * (2 ^ attempt_number).
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.remote_dir = remote_dir.rstrip('/')
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    async def upload_file(
        self,
        local_file_path: str,
        remote_file_name: Optional[str] = None
    ) -> bool:
        """
        Upload a file to the FTP server with retry logic.

        Implements exponential backoff retry strategy. Each retry waits
        delay_seconds * (2 ^ attempt_number) seconds before retrying.

        Args:
            local_file_path: Full path to local file to upload.
            remote_file_name: Optional custom name for remote file.
                             If not provided, uses the basename of local_file_path.

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

        # Construct full remote path
        full_remote_path = f"{self.remote_dir}/{remote_file_name}".replace('//', '/')

        # Attempt upload with retries
        for attempt in range(self.max_retries):
            try:
                logger.info(
                    f"FTP upload attempt {attempt + 1}/{self.max_retries}: "
                    f"{local_file_path} -> {self.host}:{full_remote_path}"
                )

                # Perform FTP upload
                await self._upload_with_ftplib(local_file_path, remote_file_name)

                logger.info(
                    f"Successfully uploaded {local_file_path} to "
                    f"{self.host}:{full_remote_path}"
                )
                return True

            except Exception as e:
                error_msg = str(e)
                logger.warning(
                    f"Upload attempt {attempt + 1} failed: {error_msg}"
                )

                # Calculate exponential backoff delay
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2 ** attempt)
                    logger.info(f"Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                else:
                    # All retries exhausted
                    final_error = (
                        f"FTP upload failed after {self.max_retries} attempts. "
                        f"Last error: {error_msg}"
                    )
                    logger.error(final_error)
                    raise IOError(final_error)

        return False

    async def _upload_with_ftplib(
        self,
        local_file_path: str,
        remote_file_name: str
    ) -> None:
        """
        Perform FTP upload using ftplib library (run in thread pool for async).

        This method handles the actual FTP connection and file transfer.
        Connection is closed automatically after transfer.

        Since ftplib is synchronous, this method runs in a thread pool executor
        to provide async semantics without blocking the event loop.

        Args:
            local_file_path: Full path to local file.
            remote_file_name: Remote filename for uploaded file.

        Raises:
            IOError: If FTP connection or transfer fails.
            OSError: If file I/O fails.
        """
        loop = asyncio.get_event_loop()

        def _upload_sync():
            """Synchronous FTP upload using ftplib."""
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
            except OSError as e:
                raise IOError(f"File I/O error: {str(e)}")
            except Exception as e:
                raise IOError(f"Unexpected error during FTP transfer: {str(e)}")

        # Run synchronous FTP operation in thread pool
        await loop.run_in_executor(_executor, _upload_sync)


async def upload_edi_file_ftp(
    local_edi_path: str,
    ftp_host: str,
    ftp_port: int,
    ftp_user: str,
    ftp_password: str,
    ftp_remote_dir: str = '/',
    max_retries: int = 3,
    retry_delay: int = 1
) -> bool:
    """
    Convenience function to upload an EDI file to FTP server.

    This is a standalone async function that creates an FTPClient instance
    and performs the upload operation.

    Args:
        local_edi_path: Full path to local EDI file.
        ftp_host: FTP server hostname.
        ftp_port: FTP server port.
        ftp_user: FTP username.
        ftp_password: FTP password.
        ftp_remote_dir: Remote directory for upload.
        max_retries: Maximum retry attempts.
        retry_delay: Initial delay between retries.

    Returns:
        bool: True if upload succeeded, False otherwise.

    Raises:
        Exception: If upload fails after all retries.
    """
    client = FTPClient(
        host=ftp_host,
        port=ftp_port,
        username=ftp_user,
        password=ftp_password,
        remote_dir=ftp_remote_dir,
        max_retries=max_retries,
        retry_delay=retry_delay
    )

    return await client.upload_file(local_edi_path)