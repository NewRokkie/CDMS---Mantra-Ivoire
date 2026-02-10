"""
API Routes for EDI CODECO Generator.
Defines the Flask blueprint with the POST endpoint for CODECO file generation.
"""

from flask import Blueprint, request, jsonify
from pydantic import ValidationError
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path

from api.schemas import CodecoGenerateRequest, CodecoGenerateResponse, ErrorResponse
from services.xml_generator import generate_xml, generate_xml_filename
from services.edi_converter import convert_xml_to_edi
from services.edi_parser import convert_edi_to_xml, validate_edi_format, parse_edi_to_dict
from services.file_utils import write_file_async
from services.file_transfer_client import upload_edi_file_unified
from config import config

logger = logging.getLogger(__name__)

# Create Flask blueprint
codeco_bp = Blueprint('codeco', __name__, url_prefix='/api/v1/codeco')


@codeco_bp.route('/generate', methods=['POST'])
def generate_codeco():
    """
    Generate CODECO XML and EDI files from JSON request.

    This endpoint accepts a JSON payload with container and transaction details,
    validates the input, generates both XML and EDI files, and uploads the EDI
    file to the configured SFTP server.

    Request body: CodecoGenerateRequest (JSON)
    Response: CodecoGenerateResponse (JSON) on success or ErrorResponse on failure

    Returns:
        JSON response with status, filenames, and SFTP upload status.
        HTTP 200 on success, HTTP 400/500 on error.
    """

    try:
        # Extract JSON payload
        try:
            payload = request.get_json()
        except Exception as e:
            logger.warning(f"Failed to parse JSON: {str(e)}")
            return jsonify({
                "status": "error",
                "stage": "validation",
                "message": "Request body must be valid JSON"
            }), 400

        if not payload:
            return jsonify({
                "status": "error",
                "stage": "validation",
                "message": "Request body must be valid JSON"
            }), 400

        # Validate request using Pydantic schema
        try:
            request_data = CodecoGenerateRequest(**payload)
        except ValidationError as e:
            # Extract validation error details
            error_details = "; ".join([
                f"{err['loc'][0]}: {err['msg']}"
                for err in e.errors()
            ])
            logger.warning(f"Validation failed: {error_details}")
            return jsonify({
                "status": "error",
                "stage": "validation",
                "message": f"Invalid request: {error_details}"
            }), 400

        # Convert request to dictionary for XML generation
        request_dict = request_data.model_dump()

        # Auto-generate date/time fields from current UTC time
        current_datetime = datetime.now(timezone.utc)
        request_dict['created_date'] = current_datetime.strftime('%Y%m%d')
        request_dict['created_time'] = current_datetime.strftime('%H%M%S')
        request_dict['changed_date'] = current_datetime.strftime('%Y%m%d')
        request_dict['changed_time'] = current_datetime.strftime('%H%M%S')

        # ==================== XML GENERATION ====================
        logger.info("Starting XML generation")
        try:
            xml_content = generate_xml(request_dict)
            logger.info("XML generated successfully")
        except Exception as e:
            logger.error(f"XML generation failed: {str(e)}")
            return jsonify({
                "status": "error",
                "stage": "xml_generation",
                "message": f"Failed to generate XML: {str(e)}"
            }), 500

        # ==================== EDI CONVERSION ====================
        logger.info("Starting EDI conversion")
        try:
            edi_content = convert_xml_to_edi(xml_content)
            logger.info("EDI conversion successful")
        except Exception as e:
            logger.error(f"EDI conversion failed: {str(e)}")
            return jsonify({
                "status": "error",
                "stage": "edi_conversion",
                "message": f"Failed to convert XML to EDI: {str(e)}"
            }), 500

        # ==================== FILE GENERATION ====================
        # Use the same timestamp that was used for date/time generation
        xml_filename = generate_xml_filename(
            request_dict['client'],
            request_dict['created_by'],
            current_datetime
        )
        edi_filename = xml_filename.replace('.xml', '.edi')

        xml_file_path = str(Path(config.OUTPUT_DIR) / xml_filename)
        edi_file_path = str(Path(config.OUTPUT_DIR) / edi_filename)

        logger.info(f"Writing files to {config.OUTPUT_DIR}")

        # Run async file writes
        try:
            # Create event loop for async operations
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            # Write both files asynchronously
            loop.run_until_complete(asyncio.gather(
                write_file_async(xml_file_path, xml_content),
                write_file_async(edi_file_path, edi_content)
            ))

            logger.info(f"Files written successfully: {xml_filename}, {edi_filename}")

        except Exception as e:
            logger.error(f"File write failed: {str(e)}")
            return jsonify({
                "status": "error",
                "stage": "file_write",
                "message": f"Failed to write files: {str(e)}"
            }), 500

        # ==================== FILE TRANSFER UPLOAD ====================
        logger.info(f"Starting file transfer upload of {edi_filename} (protocol: {config.TRANSFER_PROTOCOL})")
        uploaded_successfully = False

        if config.TRANSFER_HOST and config.TRANSFER_USER and config.TRANSFER_PASSWORD:
            try:
                # Run async file transfer upload
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                uploaded_successfully = loop.run_until_complete(
                    upload_edi_file_unified(
                        edi_file_path,
                        config.TRANSFER_HOST,
                        config.TRANSFER_PORT,
                        config.TRANSFER_USER,
                        config.TRANSFER_PASSWORD,
                        config.TRANSFER_REMOTE_DIR,
                        config.TRANSFER_PROTOCOL,
                        config.TRANSFER_MAX_RETRIES,
                        config.TRANSFER_RETRY_DELAY
                    )
                )

                if uploaded_successfully:
                    logger.info(f"File transfer upload successful: {edi_filename}")
                else:
                    logger.warning("File transfer upload returned False")

            except Exception as e:
                logger.error(f"File transfer upload failed: {str(e)}")
                return jsonify({
                    "status": "error",
                    "stage": "file_upload",
                    "message": f"Failed to upload EDI file: {str(e)}"
                }), 500
        else:
            logger.warning("File transfer credentials not configured, skipping upload")

        # ==================== SUCCESS RESPONSE ====================
        response = CodecoGenerateResponse(
            status="success",
            message="Files generated and EDI uploaded successfully" if uploaded_successfully
                    else "Files generated (transfer credentials not configured)",
            xml_file=xml_filename,
            edi_file=edi_filename,
            uploaded_to_sftp=uploaded_successfully
        )

        logger.info(f"Request completed successfully: {xml_filename}")
        return jsonify(response.model_dump()), 200

    except Exception as e:
        logger.error(f"Unexpected error in /generate endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "stage": "unknown",
            "message": f"Unexpected error: {str(e)}"
        }), 500


@codeco_bp.route('/convert-edi-to-xml', methods=['POST'])
def convert_edi_to_xml_endpoint():
    """
    Convert EDI CODECO file to XML format.

    This endpoint accepts an EDI CODECO message and converts it back to XML format.
    Supports both file upload and raw EDI content in request body.

    Request body: 
    - JSON with 'edi_content' field containing raw EDI text, OR
    - Form data with 'edi_file' containing uploaded EDI file

    Returns:
        JSON response with converted XML content and validation results.
        HTTP 200 on success, HTTP 400/500 on error.
    """
    try:
        edi_content = None
        
        # Check if it's a file upload
        if 'edi_file' in request.files:
            file = request.files['edi_file']
            if file and file.filename:
                try:
                    edi_content = file.read().decode('utf-8')
                    logger.info(f"Processing uploaded EDI file: {file.filename}")
                except UnicodeDecodeError:
                    return jsonify({
                        "status": "error",
                        "stage": "file_reading",
                        "message": "File must be UTF-8 encoded text"
                    }), 400
        
        # Check if it's JSON with edi_content
        elif request.is_json:
            try:
                payload = request.get_json()
                edi_content = payload.get('edi_content')
                logger.info("Processing EDI content from JSON payload")
            except Exception as e:
                logger.warning(f"Failed to parse JSON: {str(e)}")
                return jsonify({
                    "status": "error",
                    "stage": "validation",
                    "message": "Request body must be valid JSON with 'edi_content' field"
                }), 400
        
        if not edi_content:
            return jsonify({
                "status": "error",
                "stage": "validation",
                "message": "No EDI content provided. Use 'edi_content' in JSON or upload 'edi_file'"
            }), 400

        # ==================== EDI VALIDATION ====================
        logger.info("Validating EDI format")
        try:
            is_valid, validation_errors = validate_edi_format(edi_content)
            if not is_valid:
                return jsonify({
                    "status": "error",
                    "stage": "edi_validation",
                    "message": "Invalid EDI format",
                    "validation_errors": validation_errors
                }), 400
            logger.info("EDI validation successful")
        except Exception as e:
            logger.error(f"EDI validation failed: {str(e)}")
            return jsonify({
                "status": "error",
                "stage": "edi_validation",
                "message": f"EDI validation error: {str(e)}"
            }), 400

        # ==================== EDI TO XML CONVERSION ====================
        logger.info("Starting EDI to XML conversion")
        try:
            xml_content = convert_edi_to_xml(edi_content)
            logger.info("EDI to XML conversion successful")
        except Exception as e:
            logger.error(f"EDI to XML conversion failed: {str(e)}")
            return jsonify({
                "status": "error",
                "stage": "edi_conversion",
                "message": f"Failed to convert EDI to XML: {str(e)}"
            }), 500

        # ==================== OPTIONAL: PARSE EDI DATA ====================
        try:
            parsed_edi_data = parse_edi_to_dict(edi_content)
            logger.info("EDI parsing successful")
        except Exception as e:
            logger.warning(f"EDI parsing failed (non-critical): {str(e)}")
            parsed_edi_data = None

        # ==================== FILE GENERATION ====================
        current_datetime = datetime.now(timezone.utc)
        container_number = "UNKNOWN"
        
        # Try to extract container number from parsed data
        if parsed_edi_data and parsed_edi_data.get('container_details'):
            container_number = parsed_edi_data['container_details'].get('container_number', 'UNKNOWN')
        
        xml_filename = f"CONVERTED_EDI_TO_XML_{container_number}_{current_datetime.strftime('%Y%m%d%H%M%S')}.xml"
        xml_file_path = str(Path(config.OUTPUT_DIR) / xml_filename)

        logger.info(f"Writing converted XML file: {xml_filename}")
        try:
            # Create event loop for async operations
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Write XML file asynchronously
            loop.run_until_complete(write_file_async(xml_file_path, xml_content))
            logger.info(f"XML file written successfully: {xml_filename}")
        except Exception as e:
            logger.error(f"File write failed: {str(e)}")
            return jsonify({
                "status": "error",
                "stage": "file_write",
                "message": f"Failed to write XML file: {str(e)}"
            }), 500

        # ==================== SUCCESS RESPONSE ====================
        response_data = {
            "status": "success",
            "message": "EDI successfully converted to XML",
            "xml_content": xml_content,
            "xml_file": xml_filename,
            "validation_passed": True
        }
        
        # Include parsed data if available
        if parsed_edi_data:
            response_data["parsed_edi_data"] = parsed_edi_data

        logger.info(f"EDI to XML conversion completed successfully: {xml_filename}")
        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Unexpected error in /convert-edi-to-xml endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "stage": "unknown",
            "message": f"Unexpected error: {str(e)}"
        }), 500


@codeco_bp.route('/validate-edi', methods=['POST'])
def validate_edi_endpoint():
    """
    Validate EDI CODECO format without conversion.

    This endpoint validates EDI format and returns detailed validation results
    and parsed structure information.

    Request body: JSON with 'edi_content' field containing raw EDI text

    Returns:
        JSON response with validation results and parsed structure.
    """
    try:
        # Extract JSON payload
        try:
            payload = request.get_json()
        except Exception as e:
            logger.warning(f"Failed to parse JSON: {str(e)}")
            return jsonify({
                "status": "error",
                "message": "Request body must be valid JSON"
            }), 400

        if not payload or 'edi_content' not in payload:
            return jsonify({
                "status": "error",
                "message": "Request body must contain 'edi_content' field"
            }), 400

        edi_content = payload['edi_content']
        if not edi_content:
            return jsonify({
                "status": "error",
                "message": "EDI content cannot be empty"
            }), 400

        # Validate EDI format
        is_valid, validation_errors = validate_edi_format(edi_content)
        
        # Try to parse EDI data
        parsed_data = None
        parsing_errors = []
        
        try:
            parsed_data = parse_edi_to_dict(edi_content)
        except Exception as e:
            parsing_errors.append(str(e))

        return jsonify({
            "status": "success" if is_valid else "validation_failed",
            "is_valid": is_valid,
            "validation_errors": validation_errors,
            "parsing_errors": parsing_errors,
            "parsed_data": parsed_data,
            "message": "EDI validation completed"
        }), 200

    except Exception as e:
        logger.error(f"Unexpected error in /validate-edi endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }), 500


@codeco_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify API is running.

    Returns:
        JSON response with status and timestamp.
    """
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200
