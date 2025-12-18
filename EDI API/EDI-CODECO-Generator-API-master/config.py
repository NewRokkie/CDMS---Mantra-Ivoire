"""
Configuration module for EDI Generator Flask application.
Loads environment variables from .env file and provides configuration objects.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class Config:
    """Base configuration class."""

    # Flask settings
    ENV = os.getenv('FLASK_ENV', 'production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

    # Output directory configuration
    OUTPUT_DIR = os.getenv('OUTPUT_DIR', './output')

    # Ensure output directory exists
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    # File Transfer Configuration (supports both FTP and SFTP)
    TRANSFER_HOST = os.getenv('TRANSFER_HOST') or os.getenv('SFTP_HOST')  # Backward compatibility
    TRANSFER_PORT = int(os.getenv('TRANSFER_PORT', os.getenv('SFTP_PORT', '22')))
    TRANSFER_USER = os.getenv('TRANSFER_USER') or os.getenv('SFTP_USER')
    TRANSFER_PASSWORD = os.getenv('TRANSFER_PASSWORD') or os.getenv('SFTP_PASSWORD')
    TRANSFER_REMOTE_DIR = os.getenv('TRANSFER_REMOTE_DIR', os.getenv('SFTP_REMOTE_DIR', '/'))
    TRANSFER_PROTOCOL = os.getenv('TRANSFER_PROTOCOL', 'auto')  # 'ftp', 'sftp', or 'auto'

    # Transfer Retry configuration
    TRANSFER_MAX_RETRIES = int(os.getenv('TRANSFER_MAX_RETRIES', os.getenv('SFTP_MAX_RETRIES', '3')))
    TRANSFER_RETRY_DELAY = int(os.getenv('TRANSFER_RETRY_DELAY', os.getenv('SFTP_RETRY_DELAY', '1')))

    # Legacy SFTP properties for backward compatibility
    @property
    def SFTP_HOST(self):
        return self.TRANSFER_HOST
    
    @property
    def SFTP_PORT(self):
        return self.TRANSFER_PORT
    
    @property
    def SFTP_USER(self):
        return self.TRANSFER_USER
    
    @property
    def SFTP_PASSWORD(self):
        return self.TRANSFER_PASSWORD
    
    @property
    def SFTP_REMOTE_DIR(self):
        return self.TRANSFER_REMOTE_DIR
    
    @property
    def SFTP_MAX_RETRIES(self):
        return self.TRANSFER_MAX_RETRIES
    
    @property
    def SFTP_RETRY_DELAY(self):
        return self.TRANSFER_RETRY_DELAY


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    LOG_LEVEL = 'INFO'


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    OUTPUT_DIR = './test_output'
    # Ensure test output directory exists
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)


# Select configuration based on environment
config = DevelopmentConfig() if Config.ENV == 'development' else ProductionConfig()
