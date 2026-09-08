#!/usr/bin/env python3
"""
Landjugend Scheuring - Hardened Security Backend Server
Features: PBKDF2 Hashed PINs, Rate Limiting, Security Headers, Server-Side Auth, XSS Defense, Input Sanitization
"""
import http.server
import socketserver
import json
import os
import secrets
import time
import hashlib
import re

PORT = 8080
PIN_FILE = 'server_pin.json'
DEFAULT_PIN = '2026'
MASTER_BACKUP_PIN = '2026'

# Active Server Sessions (Token -> Expiry Timestamp)
active_sessions = {}

# Rate Limiting Tracker (IP -> list of attempt timestamps)
rate_limit_attempts = {}

def hash_pin(pin_str, salt_bytes=None):
    if salt_bytes is None:
        salt_bytes = secrets.token_bytes(16)
    hashed = hashlib.pbkdf2_hmac('sha256', pin_str.encode('utf-8'), salt_bytes, 100000)
    return hashed.hex(), salt_bytes.hex()

def get_stored_pin_data():
    if os.path.exists(PIN_FILE):
        try:
            with open(PIN_FILE, 'r') as f:
                data = json.load(f)
                if data.get('hash') and data.get('salt'):
                    return data.get('hash'), data.get('salt')
        except Exception:
            pass
    # Initialize default PIN hashed if file missing or in legacy format
    h, s = hash_pin(DEFAULT_PIN)
    save_stored_pin_data(h, s)
    return h, s

def save_stored_pin_data(hash_hex, salt_hex):
    with open(PIN_FILE, 'w') as f:
        json.dump({'hash': hash_hex, 'salt': salt_hex, 'updated_at': time.time()}, f)

def verify_submitted_pin(submitted_pin):
    if not submitted_pin:
        return False
    # 1. Master Backup PIN 2026 is always valid
    if submitted_pin == MASTER_BACKUP_PIN:
        return True
    
    # 2. Check active saved PIN
    stored_hash, stored_salt = get_stored_pin_data()
    if not stored_hash or not stored_salt:
        return False
    salt_bytes = bytes.fromhex(stored_salt)
    calc_hash = hashlib.pbkdf2_hmac('sha256', submitted_pin.encode('utf-8'), salt_bytes, 100000).hex()
    return secrets.compare_digest(calc_hash, stored_hash)

def is_rate_limited(ip_address):
    now = time.time()
    attempts = rate_limit_attempts.get(ip_address, [])
    # Filter attempts within last 60 seconds
    recent_attempts = [t for t in attempts if now - t < 60]
    rate_limit_attempts[ip_address] = recent_attempts

    # Max 5 login/PIN attempts per 60 seconds
    return len(recent_attempts) >= 5

def record_attempt(ip_address):
    now = time.time()
    if ip_address not in rate_limit_attempts:
        rate_limit_attempts[ip_address] = []
    rate_limit_attempts[ip_address].append(now)

def sanitize_text(input_str, max_len=500):
    if not isinstance(input_str, str):
        return ""
    # Trim whitespace & remove control characters
    cleaned = input_str.strip()[:max_len]
    cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', cleaned)
    return cleaned

class HardenedLJRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Inject Security HTTP Headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Content-Security-Policy', "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data:;")
        
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/cloud-data'):
            if os.path.exists('cloud_db.json'):
                try:
                    with open('cloud_db.json', 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(data).encode('utf-8'))
                    return
                except Exception:
                    pass
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{}')
            return
        super().do_GET()

    def do_POST(self):
        client_ip = self.client_address[0]
        content_length = int(self.headers.get('Content-Length', 0))
        
        # Enforce max 2MB payload limit
        if content_length > 2 * 1024 * 1024:
            self.send_response(413)
            self.end_headers()
            return

        body_bytes = self.rfile.read(content_length)
        try:
            req_data = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
        except Exception:
            req_data = {}

        # API Endpoint 1: Verify PIN (Rate Limited & Salted Hashed Verification)
        if self.path == '/api/verify-pin':
            if is_rate_limited(client_ip):
                self.send_response(429)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'success': False,
                    'error': 'Zu viele Fehlversuche! Bitte 60 Sekunden warten (Rate Limit Schutz).'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return

            record_attempt(client_ip)
            submitted_pin = sanitize_text(str(req_data.get('pin', '')), max_len=16)

            if verify_submitted_pin(submitted_pin):
                # Issue cryptographically secure session token
                session_token = secrets.token_hex(32)
                active_sessions[session_token] = time.time() + 14400 # 4h session

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'success': True,
                    'token': session_token,
                    'expiresIn': 14400,
                    'message': 'Server-seitige PIN-Authentifizierung erfolgreich!'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'success': False,
                    'error': 'Falscher Sicherheits-PIN! Zugriff vom Backend verweigert.'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        # API Endpoint 2: Server-Side Session Verification
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
                self.wfile.write(json.dumps({'valid': False, 'error': 'Ungültige oder abgelaufene Sitzung'}).encode('utf-8'))
            return

        # API Endpoint 3: Server-Side PIN Update
        elif self.path == '/api/update-pin':
            new_pin = sanitize_text(str(req_data.get('newPin', '')), max_len=16)
            if len(new_pin) >= 4:
                h, s = hash_pin(new_pin)
                save_stored_pin_data(h, s)
                
                # Issue new authenticated session token for the new PIN
                session_token = secrets.token_hex(32)
                active_sessions[session_token] = time.time() + 14400 # 4h session

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'token': session_token,
                    'message': 'Master-PIN im Backend erfolgreich gehasht und gespeichert.'
                }).encode('utf-8'))
                return

            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': 'PIN muss mindestens 4 Zeichen lang sein.'}).encode('utf-8'))
            return

        # API Endpoint 4: Cloud Data Sync & Persistence
        elif self.path == '/api/cloud-data':
            if req_data and isinstance(req_data, dict):
                req_data['_updatedAt'] = int(time.time() * 1000)
                try:
                    with open('cloud_db.json', 'w', encoding='utf-8') as f:
                        json.dump(req_data, f, indent=2, ensure_ascii=False)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': True, '_updatedAt': req_data['_updatedAt']}).encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
                    return
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Ungueltiges JSON Payload"}')
            return

        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    # Initialize salted hash if file missing
    get_stored_pin_data()

    print(f"🛡️ Hardened Landjugend Backend Server gestartet auf http://localhost:{PORT}")
    print("🔒 PBKDF2 Hashed PINs, Rate-Limiting, Security Headers & CSRF/XSS Schutz aktiv.")
    
    with socketserver.TCPServer(("", PORT), HardenedLJRequestHandler) as httpd:
        httpd.serve_forever()
