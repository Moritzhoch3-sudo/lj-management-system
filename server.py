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
# IP -> {'count': int, 'first_attempt': float}
failed_attempts = {}

def hash_pin(pin):
    # Use SHA-256 with a fixed salt
    return hashlib.sha256(f"LJ_SALT_v1_{pin}".encode('utf-8')).hexdigest()

def get_server_pin():
    if os.path.exists(PIN_FILE):
        try:
            with open(PIN_FILE, 'r') as f:
                data = json.load(f)
                return data.get('pin', hash_pin(DEFAULT_SERVER_PIN))
        except Exception as e:
            print("Error reading PIN file:", e)
    return hash_pin(DEFAULT_SERVER_PIN)

def save_server_pin(new_pin):
    with open(PIN_FILE, 'w') as f:
        json.dump({'pin': hash_pin(new_pin), 'updated_at': time.time()}, f)

class SecureLJRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching for ALL files to ensure latest JS/HTML is always served
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # Security Headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        
        if self.path.startswith('/api/'):
            origin = self.headers.get('Origin')
            if origin:
                self.send_header('Access-Control-Allow-Origin', origin)
            else:
                self.send_header('Access-Control-Allow-Origin', '*')
            
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/cloud-data' or self.path == '/api/cloud-data.json':
            db_file = 'cloud_db.json'
            if os.path.exists(db_file):
                try:
                    with open(db_file, 'r', encoding='utf-8') as f:
                        data = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data.encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()
                    return
            else:
                self.send_response(404)
                self.end_headers()
                return

        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        
        # Endpoint: Realtime Cloud Sync Data Storage
        if self.path == '/api/cloud-data' or self.path == '/api/cloud-data.json':
            if content_length > 5242880: # 5MB max payload
                self.send_response(413)
                self.end_headers()
                self.wfile.write(b'Payload Too Large')
                return
                
            body_bytes = self.rfile.read(content_length)
            try:
                req_data = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
                req_data['_updatedAt'] = int(time.time() * 1000)
                
                with open('cloud_db.json', 'w', encoding='utf-8') as f:
                    json.dump(req_data, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'success': True, '_updatedAt': req_data['_updatedAt']}
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return

        if content_length > 10240:
            self.send_response(413)
            self.end_headers()
            self.wfile.write(b'Payload Too Large')
            return
            
        body_bytes = self.rfile.read(content_length)
        
        try:
            req_data = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
        except Exception:
            req_data = {}

        # Endpoint 1: Verify PIN on Server Side
        if self.path == '/api/verify-pin':
            client_ip = self.client_address[0]
            now = time.time()
            
            if client_ip in failed_attempts:
                if now - failed_attempts[client_ip]['first_attempt'] > 60:
                    del failed_attempts[client_ip]
                elif failed_attempts[client_ip]['count'] >= 5:
                    self.send_response(429)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Too many requests'}).encode('utf-8'))
                    return

            submitted_pin = str(req_data.get('pin', '')).strip()
            actual_pin = get_server_pin()

            if hash_pin(submitted_pin) == actual_pin:
                if client_ip in failed_attempts:
                    del failed_attempts[client_ip]
                
                # Cleanup expired sessions
                expired = [tok for tok, exp in active_sessions.items() if exp <= now]
                for tok in expired:
                    del active_sessions[tok]
                
                # Enforce max 100 active sessions
                if len(active_sessions) >= 100:
                    oldest_token = min(active_sessions, key=active_sessions.get)
                    del active_sessions[oldest_token]

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
                if client_ip not in failed_attempts:
                    failed_attempts[client_ip] = {'count': 1, 'first_attempt': now}
                else:
                    failed_attempts[client_ip]['count'] += 1

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
                old_pin = str(req_data.get('old_pin', req_data.get('oldPin', ''))).strip()
                new_pin = str(req_data.get('newPin', req_data.get('new_pin', ''))).strip()
                
                if hash_pin(old_pin) == get_server_pin():
                    if len(new_pin) >= 4:
                        save_server_pin(new_pin)
                        active_sessions.clear()
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'success': True, 'message': 'Backend PIN erfolgreich aktualisiert'}).encode('utf-8'))
                        return
                else:
                    self.send_response(401)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': 'Alte PIN falsch'}).encode('utf-8'))
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
    else:
        # Check if the existing file has a plain text PIN or hashed PIN
        # By trying to hash it. A plaintext pin is usually 4-6 chars, a hash is 64 chars.
        try:
            with open(PIN_FILE, 'r') as f:
                data = json.load(f)
                pin_val = data.get('pin', '')
                if len(pin_val) < 64: # Re-save as hash
                    save_server_pin(pin_val)
        except Exception:
            pass

    print(f"🔒 Landjugend Scheuring Server gestartet auf http://localhost:{PORT}")
    print("🔑 Backend-Authentifizierung aktiv")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SecureLJRequestHandler) as httpd:
        httpd.serve_forever()
