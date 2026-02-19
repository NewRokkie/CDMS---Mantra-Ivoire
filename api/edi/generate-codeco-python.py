"""
Vercel Serverless Function: Generate CODECO EDI files (Python)

This endpoint generates EDI CODECO messages from JSON request.
Optimized for Vercel's Python runtime - uses only standard library.
"""

from http.server import BaseHTTPRequestHandler
import json
import sys
import os
from datetime import datetime, timezone

# Import the simple CODECO generator (no external dependencies)
sys.path.insert(0, os.path.dirname(__file__))
from codeco_generator_simple import generate_codeco_edi


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests for CODECO generation"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Parse JSON
            try:
                payload = json.loads(body.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_error_response(400, "Invalid JSON in request body")
                return

            # Validate required fields
            required_fields = [
                'sender', 'receiver', 'company_code', 'customer',
                'container_number', 'container_size', 'container_type',
                'transport_company', 'vehicle_number',
                'operation_type', 'operation_date', 'operation_time',
                'location_code', 'location_details',
                'operator_name', 'operator_id', 'yard_id'
            ]
            
            missing_fields = [field for field in required_fields if field not in payload]
            if missing_fields:
                self.send_error_response(
                    400,
                    f"Missing required fields: {', '.join(missing_fields)}"
                )
                return

            # Prepare data for CODECO generator
            codeco_data = {
                'sender': payload['sender'],
                'receiver': payload['receiver'],
                'company_code': payload['company_code'],
                'customer': payload['customer'],
                'container_number': payload['container_number'],
                'container_size': payload['container_size'],
                'container_type': payload['container_type'],
                'transport_company': payload['transport_company'],
                'vehicle_number': payload['vehicle_number'],
                'operation_type': payload['operation_type'],
                'operation_date': payload['operation_date'],
                'operation_time': payload['operation_time'],
                'booking_reference': payload.get('booking_reference', ''),
                'equipment_reference': payload.get('equipment_reference', ''),
                'location_code': payload['location_code'],
                'location_details': payload['location_details'],
                'operator_name': payload['operator_name'],
                'operator_id': payload['operator_id'],
                'yard_id': payload['yard_id'],
                'damage_reported': payload.get('damage_reported', False),
                'damage_type': payload.get('damage_type', ''),
                'damage_description': payload.get('damage_description', ''),
                'damage_assessed_by': payload.get('damage_assessed_by', ''),
                'damage_assessed_at': payload.get('damage_assessed_at', '')
            }

            # Generate EDI CODECO
            current_datetime = datetime.now(timezone.utc)
            try:
                edi_content = generate_codeco_edi(codeco_data)
            except Exception as e:
                self.send_error_response(500, f"CODECO generation failed: {str(e)}")
                return

            # Generate filename: CODECO_{SenderCode}{GateInDate}{GateInTime}_{containerNumber}_{operation}.edi
            # Example: CODECO_20260218234902_ONEU1388601_GATE_IN.edi
            op_date = payload['operation_date'].replace('-', '').replace(' ', '')
            op_time = payload['operation_time'].replace(':', '').replace(' ', '')
            # Normalize date to YYYYMMDD (if YYMMDD, prepend 20)
            if len(op_date) == 6:
                gate_date = '20' + op_date
            else:
                gate_date = op_date[:8] if len(op_date) >= 8 else op_date.zfill(8)
            # Normalize time to HHMMSS
            gate_time = (op_time + '00')[:6].ljust(6, '0') if len(op_time) <= 6 else op_time[:6]
            sender_code = (payload.get('sender') or payload.get('company_code') or '').strip()
            sender_date_time = f"{sender_code}{gate_date}{gate_time}"
            operation = payload['operation_type']  # GATE_IN or GATE_OUT
            container_number = payload['container_number']
            edi_filename = f"CODECO_{sender_date_time}_{container_number}_{operation}.edi"

            # Send success response
            self.send_success_response({
                'success': True,
                'message': 'CODECO file generated successfully',
                'edi_file': edi_filename,
                'edi_content': edi_content
            })

        except Exception as e:
            self.send_error_response(500, f"Unexpected error: {str(e)}")

    def do_GET(self):
        """Handle GET requests - return method not allowed"""
        self.send_error_response(405, "Method not allowed. Use POST.")

    def send_success_response(self, data):
        """Send JSON success response"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, status_code, message):
        """Send JSON error response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            'success': False,
            'message': message
        }).encode('utf-8'))
