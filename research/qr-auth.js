/**
 * Discord QR Code Remote Auth Gateway Client
 * Allows 1-click login from mobile Discord app (Settings -> Scan QR Code)
 */
const crypto = require('crypto');
const EventEmitter = require('events');
const WebSocket = require('ws');
const QRCode = require('qrcode');

class QRAuthClient extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.heartbeatTimer = null;
    this.keyPair = null;
    this.active = false;
    this.isAuthenticating = false;
  }

  start() {
    this.stop();
    this.active = true;
    this.isAuthenticating = false;

    // Generate RSA 2048 keypair
    this.keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    this.ws = new WebSocket('wss://remote-auth-gateway.discord.gg/?v=2', {
      headers: {
        'Origin': 'https://discord.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });

    this.ws.on('open', () => {
      this.emit('status', { state: 'connecting', message: 'Connexion à la passerelle Discord...' });
    });

    this.ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        await this.handleMessage(msg);
      } catch (err) {
        this.emit('error', err.message);
      }
    });

    this.ws.on('error', (err) => {
      this.emit('error', err.message);
      this.stop();
    });

    this.ws.on('close', (code) => {
      // If authenticating, gateway closes normally with 1000 after pending_login
      if (this.isAuthenticating) {
        return;
      }
      this.stop();
      if (code === 4003) {
        this.emit('status', { state: 'expired', message: 'Code QR expiré. Cliquez pour actualiser.' });
      } else {
        this.emit('status', { state: 'closed', message: 'Session QR fermée. Cliquez pour actualiser.' });
      }
    });
  }

  async handleMessage(msg) {
    if (msg.op === 'hello') {
      const interval = msg.heartbeat_interval || 41250;
      this.heartbeatTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ op: 'heartbeat' }));
        }
      }, interval);

      // Send Init with public key
      const encodedPubKey = this.keyPair.publicKey.toString('base64');
      this.ws.send(JSON.stringify({
        op: 'init',
        encoded_public_key: encodedPubKey
      }));
    }

    else if (msg.op === 'nonce_proof') {
      const decryptedNonce = crypto.privateDecrypt(
        {
          key: this.keyPair.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(msg.encrypted_nonce, 'base64')
      );

      const proof = crypto.createHash('sha256').update(decryptedNonce).digest('base64url');
      this.ws.send(JSON.stringify({
        op: 'nonce_proof',
        proof: proof
      }));
    }

    else if (msg.op === 'fingerprint' || msg.op === 'pending_remote_init') {
      const qrData = `https://discord.com/ra/${msg.fingerprint}`;
      // High-contrast, standard black-on-white QR with high error correction
      // Matches official Discord client so mobile camera scanner detects it instantly
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 320,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      this.emit('qr', {
        url: qrData,
        dataUrl: qrDataUrl,
        fingerprint: msg.fingerprint
      });
      this.emit('status', { state: 'waiting_scan', message: 'Scannez le code avec l\'application Discord Mobile (Paramètres → Scanner le code QR)' });
    }

    else if (msg.op === 'pending_ticket') {
      try {
        const decryptedPayload = crypto.privateDecrypt(
          {
            key: this.keyPair.privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          Buffer.from(msg.encrypted_user_payload, 'base64')
        ).toString('utf8');

        const parts = decryptedPayload.split(':');
        const userId = parts[0];
        const discriminator = parts[1];
        const avatar = parts[2];
        const username = parts[3] || 'Utilisateur Discord';

        const avatarUrl = avatar ? `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png';

        this.emit('scanned', {
          userId,
          username,
          avatarUrl
        });
        this.emit('status', { state: 'scanned', message: `Scanné par ${username}. Confirmez la connexion sur votre mobile...` });
      } catch (err) {
        this.emit('error', 'Erreur de déchiffrement du profil');
      }
    }

    else if (msg.op === 'pending_login') {
      this.isAuthenticating = true;
      try {
        this.emit('status', { state: 'authenticating', message: 'Échange du ticket de session...' });

        const superProps = Buffer.from(JSON.stringify({
          os: "Windows",
          browser: "Discord Client",
          device: "",
          system_locale: "en-US",
          os_version: "10",
          release_channel: "stable",
          client_build_number: 606747
        })).toString('base64');

        const res = await fetch('https://discord.com/api/v9/users/@me/remote-auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://discord.com',
            'Referer': 'https://discord.com/login',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'X-Super-Properties': superProps
          },
          body: JSON.stringify({ ticket: msg.ticket })
        });

        const data = await res.json();

        if (data.encrypted_token) {
          const decryptedToken = crypto.privateDecrypt(
            {
              key: this.keyPair.privateKey,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              oaepHash: 'sha256'
            },
            Buffer.from(data.encrypted_token, 'base64')
          ).toString('utf8');

          this.emit('authenticated', { token: decryptedToken });
          this.stop();
        } else {
          this.emit('error', data.message || 'Échec de validation du token');
          this.stop();
        }
      } catch (err) {
        this.emit('error', err.message);
        this.stop();
      }
    }

    else if (msg.op === 'cancel') {
      this.emit('status', { state: 'cancelled', message: 'Connexion refusée ou expirée.' });
      this.stop();
    }
  }

  stop() {
    this.active = false;
    this.isAuthenticating = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }
}

module.exports = QRAuthClient;
