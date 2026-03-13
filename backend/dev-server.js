#!/usr/bin/env node
/**
 * Nebula Media Converter - Development Backend Server
 *
 * Mirrors the C++ server's endpoints (backend/cpp_server/main.cpp) for local
 * development without requiring a compiled C++ binary.
 *
 * Endpoints:
 *   GET  /health                  - health check
 *   GET  /api/system/info         - system/capability info
 *   POST /api/convert             - single-file conversion (delegates to ffmpeg CLI)
 *   POST /api/batch-convert       - batch conversion (not yet implemented)
 *   GET  /api/queue/status        - queue stats
 *   POST /api/admin/login         - server-side admin authentication
 *   GET  /api/admin/verify        - verify admin session token
 *   POST /api/admin/logout        - invalidate admin session
 *   POST /api/admin/change-password - change admin password (session lifetime only)
 *
 * Admin credentials are read from server-side environment variables:
 *   ADMIN_USERNAME        - admin login name/email
 *   ADMIN_EMAIL           - admin email (for session)
 *   ADMIN_PASSWORD_HASH   - PBKDF2-SHA256 hex hash of the password
 *   ADMIN_PASSWORD_SALT   - hex salt used when generating the hash
 *
 * To regenerate the hash:
 *   node -e "const c=require('crypto'),s=c.randomBytes(32).toString('hex'),h=c.pbkdf2Sync('<password>',s,310000,32,'sha256').toString('hex');console.log('ADMIN_PASSWORD_SALT='+s+'\nADMIN_PASSWORD_HASH='+h)"
 *
 * Usage:  node backend/dev-server.js [port]   (default port 8080)
 */

const http = require('http');
const { execSync, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.argv[2] || process.env.PORT || '8080', 10);
// Only allow requests from the local React dev server
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

// Allowlists to prevent command injection via ffmpeg arguments
const ALLOWED_FORMATS = new Set([
  'mp4','mkv','webm','avi','mov','flv','gif',
  'mp3','aac','wav','flac','ogg','m4a','m4v','wmv',
  '3gp','ts','opus','weba',
  'jpg','jpeg','png','bmp','tiff','tif','webp','ico','pdf'
]);
const ALLOWED_QUALITY = new Set(['high', 'medium', 'low']);

// Maximum request body size (500 MB)
const MAX_BODY_BYTES = 500 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Load server-side environment variables from root .env
// (CRA only bundles REACT_APP_* vars; plain vars like ADMIN_* stay server-side)
// ---------------------------------------------------------------------------
(function loadServerEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (m && !m[1].startsWith('REACT_APP_') && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].trim();
      }
    }
  } catch { /* .env not present - rely on OS environment */ }
})();

// ---------------------------------------------------------------------------
// Admin authentication (server-side, credentials never sent to browser)
// ---------------------------------------------------------------------------
const adminSessions = new Map(); // token -> { username, email, expiresAt }
const loginAttempts = new Map(); // normalizedUsername -> { count, lockoutEnd }
const SESSION_TTL = 8 * 60 * 60 * 1000;   // 8 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000;  // 30 minutes

function getAdminCreds() {
  return {
    username: process.env.ADMIN_USERNAME,
    email:    process.env.ADMIN_EMAIL,
    hash:     process.env.ADMIN_PASSWORD_HASH,
    salt:     process.env.ADMIN_PASSWORD_SALT,
  };
}

function verifyPassword(plaintext, salt, storedHash) {
  if (!salt || !storedHash) return false;
  const computed = crypto.pbkdf2Sync(plaintext, salt, 310000, 32, 'sha256').toString('hex');
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function checkRateLimit(key) {
  const entry = loginAttempts.get(key);
  if (!entry) return { allowed: true };
  if (entry.lockoutEnd && Date.now() < entry.lockoutEnd) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockoutEnd - Date.now()) / 1000) };
  }
  if (entry.lockoutEnd && Date.now() >= entry.lockoutEnd) {
    loginAttempts.delete(key);
  }
  return { allowed: true };
}

function recordFailedAttempt(key) {
  const entry = loginAttempts.get(key) || { count: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) entry.lockoutEnd = Date.now() + LOCKOUT_DURATION;
  loginAttempts.set(key, entry);
}

async function handleAdminLogin(req, res) {
  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw.toString());
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const { username, password } = body;
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return json(res, 400, { error: 'username and password are required' });
  }

  const creds = getAdminCreds();
  if (!creds.username || !creds.hash || !creds.salt) {
    console.error('⚠️  Admin credentials not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT.');
    return json(res, 503, { error: 'Admin authentication not configured on this server' });
  }

  const normalizedInput = username.trim().toLowerCase();
  const rl = checkRateLimit(normalizedInput);
  if (!rl.allowed) {
    return json(res, 429, { error: `Too many login attempts. Retry in ${rl.retryAfter}s` });
  }

  const usernameMatch =
    normalizedInput === creds.username.toLowerCase() ||
    normalizedInput === (creds.email || '').toLowerCase();
  const passwordMatch = verifyPassword(password, creds.salt, creds.hash);

  if (!usernameMatch || !passwordMatch) {
    recordFailedAttempt(normalizedInput);
    await new Promise(r => setTimeout(r, 500)); // constant-time delay
    return json(res, 401, { error: 'Invalid credentials' });
  }

  loginAttempts.delete(normalizedInput);

  const token = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL;
  adminSessions.set(token, { username: creds.username, email: creds.email, expiresAt });
  setTimeout(() => adminSessions.delete(token), SESSION_TTL);

  json(res, 200, {
    success: true,
    token,
    expiresAt,
    username: creds.username,
    email: creds.email,
    role: 'super_admin',
  });
}

function handleAdminVerify(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return json(res, 401, { valid: false, reason: 'No token provided' });

  const session = adminSessions.get(token);
  if (!session) return json(res, 401, { valid: false, reason: 'Session not found' });
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return json(res, 401, { valid: false, reason: 'Session expired' });
  }

  json(res, 200, { valid: true, username: session.username, expiresAt: session.expiresAt });
}

function handleAdminLogout(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) adminSessions.delete(token);
  json(res, 200, { success: true });
}

async function handleAdminChangePassword(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const session = token ? adminSessions.get(token) : null;
  if (!session || Date.now() > session.expiresAt) {
    return json(res, 401, { error: 'Valid admin session required' });
  }

  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw.toString());
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return json(res, 400, { error: 'currentPassword and newPassword are required' });
  }

  const creds = getAdminCreds();
  if (!verifyPassword(currentPassword, creds.salt, creds.hash)) {
    return json(res, 401, { error: 'Current password is incorrect' });
  }

  if (newPassword.length < 12) {
    return json(res, 400, { error: 'New password must be at least 12 characters' });
  }

  // Re-hash with new salt (in-memory only; persisted only if ADMIN_PASSWORD_* env vars are updated)
  const newSalt = crypto.randomBytes(32).toString('hex');
  const newHash = crypto.pbkdf2Sync(newPassword, newSalt, 310000, 32, 'sha256').toString('hex');
  process.env.ADMIN_PASSWORD_SALT = newSalt;
  process.env.ADMIN_PASSWORD_HASH = newHash;

  console.log('Password changed. Update .env with:');
  console.log(`  ADMIN_PASSWORD_SALT=${newSalt}`);
  console.log(`  ADMIN_PASSWORD_HASH=${newHash}`);

  json(res, 200, { success: true, message: 'Password changed. Restart server with updated ADMIN_PASSWORD_HASH env var to persist.' });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFFmpegVersion() {
  try {
    const out = execSync('ffmpeg -version 2>&1', { timeout: 3000 }).toString();
    const match = out.match(/ffmpeg version ([^\s]+)/);
    return match ? match[1] : 'unknown';
  } catch {
    return 'not-found';
  }
}

function getSupportedFormats() {
  try {
    const out = execSync('ffmpeg -formats 2>&1', { timeout: 5000 }).toString();
    const formats = [];
    const lines = out.split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*[DE]+\s+(\w+)/);
      if (m) formats.push(m[1]);
    }
    return formats.slice(0, 100); // cap for response size
  } catch {
    return ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'aac', 'wav', 'flac', 'ogg'];
  }
}

function detectGPU() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic path Win32_VideoController get Name /format:list 2>&1', { timeout: 5000 }).toString();
      const name = (out.match(/Name=(.+)/) || [])[1]?.trim() || '';
      const isHW = /nvidia|amd|intel arc|radeon/i.test(name);
      return { support: isHW, info: name || 'Unknown GPU' };
    }
    // Linux / macOS fallback
    return { support: false, info: 'Detection not available on this platform' };
  } catch {
    return { support: false, info: 'Detection failed' };
  }
}

// Parse multipart/form-data manually (no external deps)
function parseMultipart(buffer, boundary) {
  const parts = {};
  const sep = Buffer.from('--' + boundary);
  let pos = 0;

  while (pos < buffer.length) {
    const start = buffer.indexOf(sep, pos);
    if (start === -1) break;
    pos = start + sep.length;

    // Skip CRLF after boundary
    if (buffer[pos] === 0x0d && buffer[pos + 1] === 0x0a) pos += 2;

    // Collect headers
    const headersEnd = buffer.indexOf('\r\n\r\n', pos);
    if (headersEnd === -1) break;
    const headerStr = buffer.slice(pos, headersEnd).toString();
    pos = headersEnd + 4;

    // Find body end (next boundary)
    const nextBound = buffer.indexOf(sep, pos);
    const bodyEnd = nextBound === -1 ? buffer.length : nextBound - 2; // strip CRLF before boundary

    const body = buffer.slice(pos, bodyEnd);
    pos = nextBound === -1 ? buffer.length : nextBound;

    // Parse Content-Disposition
    const dispMatch = headerStr.match(/Content-Disposition:[^\r\n]*name="([^"]+)"/i);
    if (!dispMatch) continue;
    const name = dispMatch[1];

    const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
    parts[name] = {
      filename: filenameMatch ? filenameMatch[1] : null,
      body,
      text: filenameMatch ? null : body.toString(),
    };
  }
  return parts;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Request body too large (max 500 MB)'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function handleHealth(res) {
  json(res, 200, {
    status: 'healthy',
    service: 'Nebula Dev Backend (Node.js)',
    version: '1.0.0-dev',
    note: 'Development server - mirrors C++ server API',
  });
}

let _systemInfo = null;
function handleSystemInfo(res) {
  if (!_systemInfo) {
    const gpu = detectGPU();
    _systemInfo = {
      cpuCores: os.cpus().length,
      gpuSupport: gpu.support,
      gpuInfo: gpu.info,
      ffmpegVersion: getFFmpegVersion(),
      supportedFormats: getSupportedFormats(),
      platform: process.platform,
      nodeVersion: process.version,
    };
  }
  json(res, 200, _systemInfo);
}

async function handleConvert(req, res) {
  try {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) {
      return json(res, 400, { error: 'Expected multipart/form-data' });
    }

    const body = await readBody(req);
    const parts = parseMultipart(body, boundaryMatch[1]);

    if (!parts.file || !parts.file.body.length) {
      return json(res, 400, { error: 'No file uploaded' });
    }

    const outputFormat = (parts.format?.text || 'mp4').trim().toLowerCase();
    const quality = (parts.quality?.text || 'medium').trim().toLowerCase();
    const useGPU = parts.useGPU?.text === 'true';
    const originalName = parts.file.filename || 'input';

    // Validate format and quality against allowlists to prevent argument injection
    if (!ALLOWED_FORMATS.has(outputFormat)) {
      return json(res, 400, { error: 'Invalid output format' });
    }
    if (!ALLOWED_QUALITY.has(quality)) {
      return json(res, 400, { error: 'Invalid quality setting' });
    }

    // Write input to temp file
    const tmpId = crypto.randomUUID();
    const ext = path.extname(originalName) || '.bin';
    const inputPath = path.join(os.tmpdir(), `nebula_in_${tmpId}${ext}`);
    const outputPath = path.join(os.tmpdir(), `nebula_out_${tmpId}.${outputFormat}`);

    fs.writeFileSync(inputPath, parts.file.body);

    // Build ffmpeg args
    const qualityArgs = quality === 'high'
      ? ['-crf', '18']
      : quality === 'low'
        ? ['-crf', '28']
        : ['-crf', '23'];

    const hwArgs = useGPU && detectGPU().support ? ['-hwaccel', 'auto'] : [];

    const ffmpegArgs = [
      ...hwArgs,
      '-i', inputPath,
      ...qualityArgs,
      '-y',
      outputPath,
    ];

    await new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', ffmpegArgs, { timeout: 300_000 });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      proc.on('error', reject);
    });

    const fileData = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="converted.${outputFormat}"`,
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    });
    res.end(fileData);
  } catch (err) {
    try { json(res, 500, { error: err.message }); } catch (_) { /* already sent */ }
  }
}

function handleBatchConvert(res) {
  json(res, 501, {
    message: 'Batch conversion endpoint - implementation pending',
    status: 'not_implemented',
  });
}

function handleQueueStatus(res) {
  json(res, 200, {
    queueSize: 0,
    processing: 0,
    completed: 0,
  });
}

// ---------------------------------------------------------------------------
// Request routing
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const { method, url } = req;
  console.log(`[${new Date().toISOString()}] ${method} ${url}`);

  try {
    if (method === 'GET'  && url === '/health')                    return handleHealth(res);
    if (method === 'GET'  && url === '/api/system/info')            return handleSystemInfo(res);
    if (method === 'POST' && url === '/api/convert')                return await handleConvert(req, res);
    if (method === 'POST' && url === '/api/batch-convert')          return handleBatchConvert(res);
    if (method === 'GET'  && url === '/api/queue/status')           return handleQueueStatus(res);
    if (method === 'POST' && url === '/api/admin/login')            return await handleAdminLogin(req, res);
    if (method === 'GET'  && url === '/api/admin/verify')           return handleAdminVerify(req, res);
    if (method === 'POST' && url === '/api/admin/logout')           return handleAdminLogout(req, res);
    if (method === 'POST' && url === '/api/admin/change-password')  return await handleAdminChangePassword(req, res);

    json(res, 404, { error: 'Not found', url });
  } catch (err) {
    console.error('Unhandled error:', err);
    json(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  const credsOk = !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH);
  console.log(`\n🚀 Nebula Dev Backend running on http://localhost:${PORT}`);
  console.log(`🔐 Admin auth: ${credsOk ? 'configured' : '⚠️  NOT configured (set ADMIN_USERNAME, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT)'}`);  
  console.log(`📊 Health:       http://localhost:${PORT}/health`);
  console.log(`🔧 System info:  http://localhost:${PORT}/api/system/info`);
  console.log(`🎬 Convert:      POST http://localhost:${PORT}/api/convert`);
  console.log(`📋 Queue status: http://localhost:${PORT}/api/queue/status\n`);
});
