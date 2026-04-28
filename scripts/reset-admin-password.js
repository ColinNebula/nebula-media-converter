#!/usr/bin/env node
/**
 * Admin Password Reset Utility
 * Usage: node scripts/reset-admin-password.js
 *
 * Generates a fresh PBKDF2-SHA256 hash for a new admin password
 * and writes it to both the server-side and REACT_APP_ entries in .env
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

function askPassword(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let password = '';

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      function handler(char) {
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          resolve(password);
        } else if (char === '\b' || char.charCodeAt(0) === 127) {
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (char.charCodeAt(0) === 3) {
          process.exit(1);
        } else if (char.charCodeAt(0) >= 32) {
          password += char;
          process.stdout.write('*');
        }
      }

      process.stdin.on('data', handler);
    } else {
      // Non-TTY (piped input)
      const { createInterface } = require('readline');
      const rl = createInterface({ input: process.stdin, output: null });
      rl.question('', (answer) => { rl.close(); resolve(answer); });
    }
  });
}

async function main() {
  console.log('\n🔐  Nebula Admin Password Reset\n');

  if (!fs.existsSync(ENV_PATH)) {
    console.error('❌  .env file not found at', ENV_PATH);
    process.exit(1);
  }

  const password = await askPassword('Enter new admin password : ');
  const confirm  = await askPassword('Confirm new admin password: ');

  if (password !== confirm) {
    console.error('\n❌  Passwords do not match.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n❌  Password must be at least 8 characters.');
    process.exit(1);
  }

  const salt    = crypto.randomBytes(32).toString('hex');
  const hash    = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');

  let env = fs.readFileSync(ENV_PATH, 'utf8');

  function replaceOrAppend(text, key, value) {
    const re = new RegExp(`^${key}=.*`, 'm');
    if (re.test(text)) {
      return text.replace(re, `${key}=${value}`);
    }
    return text + `\n${key}=${value}`;
  }

  // Update server-side entries (read by backend/dev-server.js)
  env = replaceOrAppend(env, 'ADMIN_PASSWORD_SALT', salt);
  env = replaceOrAppend(env, 'ADMIN_PASSWORD_HASH', hash);

  // Update client-side entries (bundled by Vite for offline fallback)
  env = replaceOrAppend(env, 'REACT_APP_ADMIN_PASSWORD_SALT', salt);
  env = replaceOrAppend(env, 'REACT_APP_ADMIN_PASSWORD_HASH', hash);

  fs.writeFileSync(ENV_PATH, env, 'utf8');

  console.log('\n✅  .env updated successfully.');
  console.log('\nNext steps:');
  console.log('  1. Rebuild the app:       npm run build');
  console.log('  2. Restart the backend:   node backend/dev-server.js');
  console.log('  3. Deploy if needed:      npm run deploy\n');
}

main().catch((err) => {
  console.error('\n❌  Error:', err.message);
  process.exit(1);
});
