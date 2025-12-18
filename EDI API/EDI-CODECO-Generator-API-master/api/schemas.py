"""
Request validation schemas for the EDI Generator API.
Uses Pydantic for validation and serialization of incoming requests.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List


class CodecoGenerateRequest(BaseModel):
    """
    Schema for the CODECO file generation request.
    Validates all required fields and enforces field types and constraints.

    Note: created_date, created_time, changed_date, and changed_time are automatically
    generated from the current UTC date/time on the server side.
    """

    yardId: str = Field(..., min_length=1, description="Yard ID")
    client: str = Field(..., min_length=1, description="Client code")
    weighbridge_id: str = Field(..., min_length=1, description="Weighbridge ID")
    weighbridge_id_sno: str = Field(..., min_length=1, description="Weighbridge serial number")
    transporter: str = Field(..., min_length=1, description="Transporter name")
    container_number: str = Field(..., min_length=1, description="Container number")
    container_size: str = Field(..., min_length=1, description="Container size")
    status: str = Field(..., min_length=1, max_length=2, description="Status code")
    vehicle_number: str = Field(..., min_length=1, description="Vehicle number")
    created_by: str = Field(..., min_length=1, description="User who created the record")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
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
        }
    )


class CodecoGenerateResponse(BaseModel):
    """Success response schema for CODECO generation."""

    status: str
    message: str
    xml_file: str
    edi_file: str
    uploaded_to_sftp: bool


class ErrorResponse(BaseModel):
    """Error response schema."""

    status: str
    stage: str
    message: str


class EDIToXMLRequest(BaseModel):
    """Schema for EDI to XML conversion request."""

    edi_content: str = Field(..., min_length=1, description="Raw EDI CODECO content")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "edi_content": "UNB+UNOC:3+CIABJ31+419101+240101+1200+1'\nUNH+1+CODECO:D:96A:UN:EANCOM'\nBGM+393+PCIU9507070+9'\nDTM+137:20240101120000:204'\nNAD+TO+419101'\nNAD+FR+PROPRE MOYEN+PROPRE MOYEN'\nNAD+SH+0001052069'\nLOC+87+419101'\nCOD+PCIU9507070+40+01'\nUNT+11+1'\nUNZ+1+1'"
            }
        }
    )


class EDIToXMLResponse(BaseModel):
    """Success response schema for EDI to XML conversion."""

    status: str
    message: str
    xml_content: str
    xml_file: str
    validation_passed: bool
    parsed_edi_data: Optional[dict] = None


class EDIValidationRequest(BaseModel):
    """Schema for EDI validation request."""

    edi_content: str = Field(..., min_length=1, description="Raw EDI content to validate")


class EDIValidationResponse(BaseModel):
    """Response schema for EDI validation."""

    status: str
    is_valid: bool
    validation_errors: List[str]
    parsing_errors: List[str]
    parsed_data: Optional[dict] = None
    message: str
