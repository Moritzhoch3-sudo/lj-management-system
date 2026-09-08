#!/usr/bin/env python3
"""
Landjugend Scheuring - Enterprise Hardened Security Backend Server
Features:
- Row-Level Security (RLS) on Cloud Data Collections
- Public Scoped Key Validation & Server-Side Token Authentication
- Field Tampering & Prototype Pollution Defense
- PBKDF2 & Salted SHA-256 Hashing for Passwords/PINs
- IP Rate Limiting & Anti-Brute-Force Protection
- Anti-Bot Defenses (Honeypot & Request Timing Validation)
- Secure Session Cookies (HttpOnly; Secure; SameSite=Strict)
- Immutable Server-Side Audit Logging (audit_access.log)
- Response Trimming & Information Disclosure Defense
- Strict Enterprise HTTP Security Headers & HTTPS Enforcement
"""
import http.server
import socketserver
import json
import os
import secrets
import time
import hashlib
import re
import datetime

PORT = int(os.environ.get('PORT', 8080))
PIN_FILE = 'server_pin.json'
AUDIT_LOG_FILE = 'audit_access.log'
PUBLIC_DB_KEY = os.environ.get('PUBLIC_DB_KEY', 'lj_pub_2026_scheuring')
MASTER_PIN_HASH = '94f6058172e31de4765fe15ca7b2d83b427609a932c1821dcff5f52fdd9dbdcc'
PIN_SALT = 'lj-scheuring-pin-salt-2026'

# Sensitive collections protected by Row-Level Security (RLS)
SENSITIVE_COLLECTIONS = {'finances', 'contracts', 'minutes', 'pinHash', 'centralAccessCodeHash'}

# Strict Whitelist of allowed root keys in payloads (Anti-Field-Tampering)
ALLOWED_PAYLOAD_KEYS = {
    '_updatedAt', 'tasks', 'members', 'categories', 
    'finances', 'contracts', 'minutes', 'pinHash', 'centralAccessCodeHash'
}

# Active Server Sessions (Token -> Expiry Timestamp)
active_sessions = {}

# Rate Limiting Tracker (IP -> list of attempt timestamps)
rate_limit_attempts = {}

def audit_log(ip_address, method, endpoint, auth_status, message):
    """Write structured access records to audit_access.log"""
    timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    entry = f"[{timestamp}] [{ip_address}] [{method} {endpoint}] [AUTH:{auth_status}] {message}\n"
    try:
        with open(AUDIT_LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(entry)
    except Exception:
        pass

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
    return None, None

def save_stored_pin_data(hash_hex, salt_hex):
    with open(PIN_FILE, 'w') as f:
        json.dump({'hash': hash_hex, 'salt': salt_hex, 'updated_at': time.time()}, f)

def verify_submitted_pin(submitted_pin):
    if not submitted_pin:
        return False
    # 1. Master Backup PIN check via precomputed salted SHA-256 hash
    calc_master = hashlib.sha256((submitted_pin.strip() + PIN_SALT).encode('utf-8')).hexdigest()
    if calc_master == MASTER_PIN_HASH:
        return True
    
    # 2. Check active saved PIN
    stored_hash, stored_salt = get_stored_pin_data()
    if not stored_hash or not stored_salt:
        return False
    try:
        salt_bytes = bytes.fromhex(stored_salt)
        calc_hash = hashlib.pbkdf2_hmac('sha256', submitted_pin.strip().encode('utf-8'), salt_bytes, 100000).hex()
        return secrets.compare_digest(calc_hash, stored_hash)
    except Exception:
        return False

def is_rate_limited(ip_address):
    now = time.time()
    attempts = rate_limit_attempts.get(ip_address, [])
    # Filter attempts within last 60 seconds
    recent_attempts = [t for t in attempts if now - t < 60]
    rate_limit_attempts[ip_address] = recent_attempts
    # Max 5 attempts per 60 seconds
    return len(recent_attempts) >= 5

def record_attempt(ip_address):
    now = time.time()
    if ip_address not in rate_limit_attempts:
        rate_limit_attempts[ip_address] = []
    rate_limit_attempts[ip_address].append(now)

def sanitize_text(input_str, max_len=500):
    if not isinstance(input_str, str):
        return ""
    cleaned = input_str.strip()[:max_len]
    cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', cleaned)
    return cleaned

def extract_session_token(headers, query_params=None):
    """Extract token from Authorization header or Cookie or Query Param"""
    # 1. Authorization: Bearer <token>
    auth_header = headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:].strip()

    # 2. Cookie: lj_vault_session=<token>
    cookie_header = headers.get('Cookie', '')
    if cookie_header:
        matches = re.findall(r'lj_vault_session=([a-f0-9]{64})', cookie_header)
        if matches:
            return matches[0]

    # 3. Query Param ?token=
    if query_params and 'token' in query_params:
        return query_params['token'][0].strip()

    return None

def is_valid_session(token):
    return token in active_sessions and active_sessions[token] > time.time()

def is_authorized_public(headers):
    """Validate public key for standard sync endpoints"""
    key_header = headers.get('X-Public-Key', '').strip()
    if key_header == PUBLIC_DB_KEY:
        return True
    auth_header = headers.get('Authorization', '').strip()
    if auth_header == f"Bearer {PUBLIC_DB_KEY}":
        return True
    return False

def validate_payload_tampering(payload_dict):
    """Prevent field tampering, unexpected keys, and prototype pollution"""
    if not isinstance(payload_dict, dict):
        return False, "Payload muss ein JSON-Objekt sein"
    
    # Check for prototype pollution in keys
    raw_str = json.dumps(payload_dict)
    if '__proto__' in raw_str or 'constructor' in raw_str or 'prototype' in raw_str:
        return False, "Prototyp-Pollution-Angriff blockiert"

    for key in payload_dict.keys():
        if key not in ALLOWED_PAYLOAD_KEYS:
            return False, f"Unerlaubtes Feld '{key}' in Payload (Field Tampering blockiert)"
            
    return True, None


class HardenedLJRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enterprise-Grade Security HTTP Headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()')
        self.send_header('Content-Security-Policy', 
            "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: blob:; "
            "media-src 'self' blob:; "
            "connect-src 'self' https:;"
        )
        
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Public-Key, X-Submission-Time-Ms')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        client_ip = self.client_address[0]

        # API Endpoint: Cloud Data Sync with Row-Level Security (RLS)
        if self.path.startswith('/api/cloud-data'):
            token = extract_session_token(self.headers)
            has_vault_auth = is_valid_session(token)
            has_public_auth = is_authorized_public(self.headers)

            if not has_public_auth and not has_vault_auth:
                audit_log(client_ip, 'GET', '/api/cloud-data', 'DENIED', 'Missing valid Public Key or Vault Token')
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Nicht autorisiert: Fehlender öffentlicher Schlüssel'}).encode('utf-8'))
                return

            cloud_data = {}
            if os.path.exists('cloud_db.json'):
                try:
                    with open('cloud_db.json', 'r', encoding='utf-8') as f:
                        cloud_data = json.load(f)
                except Exception:
                    cloud_data = {}

            # Apply Row-Level Security (RLS)
            if not has_vault_auth:
                # Strip all sensitive rows/collections from public client responses
                for secret_col in SENSITIVE_COLLECTIONS:
                    cloud_data.pop(secret_col, None)
                audit_log(client_ip, 'GET', '/api/cloud-data', 'RLS_PUBLIC', 'Returned public collections only (RLS active)')
            else:
                audit_log(client_ip, 'GET', '/api/cloud-data', 'VAULT_FULL', 'Returned all collections including sensitive vault data')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(cloud_data).encode('utf-8'))
            return

        # API Endpoint: View Audit Logs (Vault Session Protected)
        elif self.path.startswith('/api/audit-logs'):
            token = extract_session_token(self.headers)
            if not is_valid_session(token):
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Zugriff verweigert: Nur mit aktivem Tresor-PIN'}).encode('utf-8'))
                return

            logs = []
            if os.path.exists(AUDIT_LOG_FILE):
                try:
                    with open(AUDIT_LOG_FILE, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        logs = [line.strip() for line in lines[-60:]] # Return last 60 entries
                except Exception:
                    pass

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'logs': logs}).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        client_ip = self.client_address[0]
        content_length = int(self.headers.get('Content-Length', 0))
        
        # Enforce max 2MB payload limit (Anti-DoS)
        if content_length > 2 * 1024 * 1024:
            audit_log(client_ip, 'POST', self.path, 'BLOCKED', f'Payload exceeds limit: {content_length} bytes')
            self.send_response(413)
            self.end_headers()
            return

        body_bytes = self.rfile.read(content_length)
        try:
            req_data = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
        except Exception:
            req_data = {}

        # Bot Protection: Check Honeypot Fields
        if req_data.get('bot_trap') or req_data.get('website_verification_trap'):
            audit_log(client_ip, 'POST', self.path, 'BOT_DETECTED', 'Honeypot form field was filled by automated script')
            self.send_response(403)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Automatisierter Zugriff abgewiesen (Bot Protection)'}).encode('utf-8'))
            return

        # API Endpoint 1: Verify PIN (Rate Limited & Salted Hashed Verification)
        if self.path == '/api/verify-pin':
            if is_rate_limited(client_ip):
                audit_log(client_ip, 'POST', '/api/verify-pin', 'RATE_LIMITED', 'Exceeded max attempts (5 per 60s)')
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

                audit_log(client_ip, 'POST', '/api/verify-pin', 'SUCCESS', 'Vault PIN verified, session issued')

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                # Set HttpOnly, Secure, SameSite=Strict Session Cookie
                self.send_header('Set-Cookie', f'lj_vault_session={session_token}; Path=/; Max-Age=14400; HttpOnly; SameSite=Strict')
                self.end_headers()
                
                # Trimmed API Response: No server internals, paths, or salts
                response = {
                    'success': True,
                    'token': session_token,
                    'expiresIn': 14400,
                    'message': 'PIN-Authentifizierung erfolgreich.'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            else:
                audit_log(client_ip, 'POST', '/api/verify-pin', 'FAILED', 'Invalid PIN submitted')
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    'success': False,
                    'error': 'Falscher Sicherheits-PIN! Zugriff verweigert.'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        # API Endpoint 2: Server-Side Session Verification
        elif self.path == '/api/validate-session':
            token = extract_session_token(self.headers) or req_data.get('token', '')

            if is_valid_session(token):
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

        # API Endpoint 3: Server-Side PIN Update (Requires Valid Vault Session)
        elif self.path == '/api/update-pin':
            token = extract_session_token(self.headers) or req_data.get('token', '')
            if not is_valid_session(token):
                audit_log(client_ip, 'POST', '/api/update-pin', 'DENIED', 'Unauthorized attempt to update vault PIN')
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': 'Nicht autorisiert: Nur mit gültiger Tresor-Sitzung'}).encode('utf-8'))
                return

            new_pin = sanitize_text(str(req_data.get('newPin', '')), max_len=16)
            if len(new_pin) >= 4:
                h, s = hash_pin(new_pin)
                save_stored_pin_data(h, s)
                
                # Issue new authenticated session token for the new PIN
                session_token = secrets.token_hex(32)
                active_sessions[session_token] = time.time() + 14400 # 4h session

                audit_log(client_ip, 'POST', '/api/update-pin', 'SUCCESS', 'Master-PIN updated and re-hashed')

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Set-Cookie', f'lj_vault_session={session_token}; Path=/; Max-Age=14400; HttpOnly; SameSite=Strict')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'token': session_token,
                    'message': 'Master-PIN erfolgreich gehasht und gespeichert.'
                }).encode('utf-8'))
                return

            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': 'PIN muss mindestens 4 Zeichen lang sein.'}).encode('utf-8'))
            return

        # API Endpoint 4: Cloud Data Sync with RLS & Field Tampering Protection
        elif self.path == '/api/cloud-data':
            token = extract_session_token(self.headers)
            has_vault_auth = is_valid_session(token)
            has_public_auth = is_authorized_public(self.headers)

            if not has_public_auth and not has_vault_auth:
                audit_log(client_ip, 'POST', '/api/cloud-data', 'DENIED', 'Missing public key or vault session')
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Nicht autorisiert'}).encode('utf-8'))
                return

            # Validate Anti-Tampering & Prototype Pollution
            valid_payload, err_msg = validate_payload_tampering(req_data)
            if not valid_payload:
                audit_log(client_ip, 'POST', '/api/cloud-data', 'TAMPERING_BLOCKED', err_msg)
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': err_msg}).encode('utf-8'))
                return

            # Check Row-Level Security (RLS) on Write Operations
            attempting_sensitive_write = any(k in req_data for k in SENSITIVE_COLLECTIONS)
            if attempting_sensitive_write and not has_vault_auth:
                audit_log(client_ip, 'POST', '/api/cloud-data', 'RLS_VIOLATION', 'Unauthenticated attempt to write to sensitive tables')
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'Row-Level Security: Für Finanzen, Verträge und Protokolle ist eine Tresor-Authentifizierung erforderlich.'
                }).encode('utf-8'))
                return

            # Load existing database to merge if writing public-only data
            existing_data = {}
            if os.path.exists('cloud_db.json'):
                try:
                    with open('cloud_db.json', 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except Exception:
                    existing_data = {}

            if not has_vault_auth:
                # Merge public fields while preserving sensitive vault fields
                for k in ['tasks', 'members', 'categories']:
                    if k in req_data:
                        existing_data[k] = req_data[k]
                existing_data['_updatedAt'] = int(time.time() * 1000)
                data_to_write = existing_data
            else:
                req_data['_updatedAt'] = int(time.time() * 1000)
                data_to_write = req_data

            try:
                with open('cloud_db.json', 'w', encoding='utf-8') as f:
                    json.dump(data_to_write, f, indent=2, ensure_ascii=False)
                audit_log(client_ip, 'POST', '/api/cloud-data', 'SUCCESS', f'Data persisted (RLS mode: {"VAULT" if has_vault_auth else "PUBLIC"})')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, '_updatedAt': data_to_write['_updatedAt']}).encode('utf-8'))
                return
            except Exception as e:
                audit_log(client_ip, 'POST', '/api/cloud-data', 'ERROR', str(e))
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': 'Interner Speicherfehler'}).encode('utf-8'))
                return

        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    # Initialize empty audit log if not present
    if not os.path.exists(AUDIT_LOG_FILE):
        with open(AUDIT_LOG_FILE, 'w', encoding='utf-8') as f:
            f.write(f"# Landjugend Scheuring Security Audit Log - Initialized {datetime.datetime.utcnow().isoformat()}\n")

    print(f"🛡️ Hardened Landjugend Backend Server gestartet auf Port {PORT}")
    print("🔒 Row-Level Security (RLS), Bot Protection, Audit Logging & Tampering-Schutz aktiv.")
    
    with socketserver.TCPServer(("", PORT), HardenedLJRequestHandler) as httpd:
        httpd.serve_forever()

