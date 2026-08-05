#!/usr/bin/env python3
"""
Landjugend Scheuring - Secure Backend Auth & Web Server
"""
import http.server
import socketserver
import json
import os
import secrets
import time
import hashlib

PORT = 8080
PIN_FILE = 'server_pin.json'
DEFAULT_SERVER_PIN = '2026'

# In-Memory Active Server Sessions (Token -> Expiry Timestamp)
active_sessions = {}

def get_server_pin():
    if os.path.exists(PIN_FILE):
        try:
            with open(PIN_FILE, 'r') as f:
                data = json.load(f)
                return data.get('pin', DEFAULT_SERVER_PIN)
        except Exception as e:
            print("Error reading PIN file:", e)
    return DEFAULT_SERVER_PIN

def save_server_pin(new_pin):
    with open(PIN_FILE, 'w') as f:
        json.dump({'pin': new_pin, 'updated_at': time.time()}, f)

class SecureLJRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching for dynamic API responses
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_length)
        
        try:
            req_data = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
        except Exception:
            req_data = {}

        # Endpoint 1: Verify PIN on Server Side
        if self.path == '/api/verify-pin':
            submitted_pin = str(req_data.get('pin', '')).strip()
            actual_pin = get_server_pin()

            if submitted_pin == actual_pin:
                # Generate cryptographically secure session token
                session_token = secrets.token_hex(24)
                # Session valid for 4 hours
                active_sessions[session_token] = time.time() + 14400

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'success': True,
                    'token': session_token,
                    'expiresIn': 14400,
                    'message': 'Server-Seitige PIN-Authentifizierung erfolgreich!'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'success': False,
                    'error': 'Falscher Sicherheits-PIN! Zugriff vom Server verweigert.'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        # Endpoint 2: Validate Active Backend Session Token
        elif self.path == '/api/validate-session':
            auth_header = self.headers.get('Authorization', '')
            token = auth_header.replace('Bearer ', '').strip() if auth_header else req_data.get('token', '')

            if token in active_sessions and active_sessions[token] > time.time():
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'valid': True}).encode('utf-8'))
            else:
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'valid': False, 'error': 'Sitzung abgelaufen oder ungültig'}).encode('utf-8'))
            return

        # Endpoint 3: Update Server-Side Master PIN
        elif self.path == '/api/update-pin':
            auth_header = self.headers.get('Authorization', '')
            token = auth_header.replace('Bearer ', '').strip() if auth_header else ''

            if token in active_sessions and active_sessions[token] > time.time():
                new_pin = str(req_data.get('newPin', '')).strip()
                if len(new_pin) >= 4:
                    save_server_pin(new_pin)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': True, 'message': 'Backend PIN erfolgreich aktualisiert'}).encode('utf-8'))
                    return

            self.send_response(403)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': 'Keine Berechtigung zur PIN-Änderung'}).encode('utf-8'))
            return

        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    # Initialize PIN file if not present
    if not os.path.exists(PIN_FILE):
        save_server_pin(DEFAULT_SERVER_PIN)

    print(f"🔒 Landjugend Scheuring Server gestartet auf http://localhost:{PORT}")
    print(f"🔑 Backend-Authentifizierung aktiv (Master PIN: {get_server_pin()})")
    
    with socketserver.TCPServer(("", PORT), SecureLJRequestHandler) as httpd:
        httpd.serve_forever()
