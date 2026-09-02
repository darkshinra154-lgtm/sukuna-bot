/**
 * ═══════════════════════════════════════════════════════
 * 🔳 QR CODE HANDLER | نظام كود QR
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: نظام ربط باستخدام QR مع نفس دوال بوت الواتس
 * ═══════════════════════════════════════════════════════
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import QRCode from 'qrcode';
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';

const router = express.Router();

function removeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
    return true;
  } catch { return false; }
}

function copySessionToSub(tempDir, sessionId) {
  try {
    // استخدام sessionId كاسم للمجلد أو استخراج الرقم من creds
    const credsPath = path.join(tempDir, 'creds.json');
    let phoneNumber = sessionId;
    if (fs.existsSync(credsPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        if (creds.me?.id) {
          phoneNumber = creds.me.id.split('@')[0];
        }
      } catch {}
    }
    
    const targetDir = path.join(globalThis.subSessionsDir, phoneNumber);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const src = path.join(tempDir, file);
      const dst = path.join(targetDir, file);
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
        for (const subFile of fs.readdirSync(src)) {
          fs.copyFileSync(path.join(src, subFile), path.join(dst, subFile));
        }
      } else {
        fs.copyFileSync(src, dst);
      }
    }
    return true;
  } catch (e) {
    console.error('❌ خطأ في نسخ جلسة QR:', e);
    return false;
  }
}

router.get('/', async (req, res) => {
  const sessionId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tempDir = path.join(process.cwd(), 'temp_sessions', sessionId);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let qrGenerated = false;
  let responseSent = false;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(tempDir);
    const { version } = await fetchLatestBaileysVersion();

    const socketConfig = {
      version,
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Chrome'),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          pino({ level: 'fatal' }).child({ level: 'fatal' })
        )
      },
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    };

    let sock = makeWASocket(socketConfig);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // إرسال QR
      if (qr && !qrGenerated) {
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
            res.json({
              success: true,
              qr: qrDataURL,
              sessionId: sessionId,
              message: 'امسح الكود بكاميرا واتساب',
              instructions: [
                '1️⃣ افتح واتساب ⚙️',
                '2️⃣ الأجهزة المرتبطة 🔗',
                '3️⃣ اضغط "ربط جهاز"',
                '4️⃣ امسح الكود'
              ]
            });
          }
        } catch (e) {
          console.error('❌ خطأ في توليد QR:', e);
          if (!responseSent) {
            responseSent = true;
            res.status(500).json({ success: false, error: 'فشل في توليد QR' });
          }
        }
      }

      // نجاح الربط
      if (connection === 'open') {
        console.log(`✅ [QR] تم الربط بنجاح`);
        copySessionToSub(tempDir, sessionId);
        
        setTimeout(() => {
          try { sock.ws?.close?.(); } catch {}
          removeFile(tempDir);
        }, 5000);
      }

      // انفصال
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === 401) {
          removeFile(tempDir);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Timeout
    setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        res.status(408).json({ success: false, error: 'انتهت المهلة' });
        removeFile(tempDir);
      }
    }, 30000);

  } catch (err) {
    console.error('❌ خطأ في QR:', err);
    if (!responseSent) {
      responseSent = true;
      res.status(503).json({ success: false, error: 'خطأ في الخدمة' });
    }
    removeFile(tempDir);
  }
});

export default router;