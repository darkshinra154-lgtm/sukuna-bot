/**
 * ═══════════════════════════════════════════════════════
 * 🔢 PAIRING CODE HANDLER | نظام كود الربط
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: نظام ربط احترافي باستخدام نفس دوال بوت الواتس
 * ═══════════════════════════════════════════════════════
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers,
  delay
} from '@whiskeysockets/baileys';
import pn from 'awesome-phonenumber';

const router = express.Router();

// ═══ دوال مساعدة ═══
function removeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
    return true;
  } catch (e) {
    console.error('❌ خطأ في الحذف:', e);
    return false;
  }
}

function copySessionToSub(tempDir, phoneNumber) {
  try {
    const targetDir = path.join(globalThis.subSessionsDir, phoneNumber);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    // نسخ كل ملفات الجلسة
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const src = path.join(tempDir, file);
      const dst = path.join(targetDir, file);
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
        const subFiles = fs.readdirSync(src);
        for (const subFile of subFiles) {
          fs.copyFileSync(path.join(src, subFile), path.join(dst, subFile));
        }
      } else {
        fs.copyFileSync(src, dst);
      }
    }
    console.log(chalk?.green?.(`✅ تم حفظ الجلسة في: ${targetDir}`) || `✅ Session saved to: ${targetDir}`);
    return true;
  } catch (e) {
    console.error('❌ خطأ في نسخ الجلسة:', e);
    return false;
  }
}

// ═══ Route Handler ═══
router.get('/', async (req, res) => {
  let num = req.query.number;
  if (!num) {
    return res.status(400).json({ 
      success: false, 
      error: 'الرجاء إدخال رقم الواتساب بصيغة دولية بدون +' 
    });
  }

  // تنظيف الرقم
  num = num.replace(/[^\d]/g, '');
  
  // التحقق من صحة الرقم
  const phone = pn('+' + num);
  if (!phone.isValid()) {
    return res.status(400).json({
      success: false,
      error: 'رقم الواتساب غير صحيح. الرجاء إدخال رقم دولي كامل (مثال: 201012345678)'
    });
  }

  num = phone.getNumber('e164').replace('+', '');
  
  // إنشاء مجلد جلسة مؤقت
  const sessionId = `pair_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const tempDir = path.join(process.cwd(), 'temp_sessions', sessionId);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let responseSent = false;
  let connectionTimeout;

  try {
    // إعداد الحالة
    const { state, saveCreds } = await useMultiFileAuthState(tempDir);
    const { version } = await fetchLatestBaileysVersion();

    // إعداد السوكت بنفس طريقة بوت الواتس
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
      generateHighQualityLinkPreview: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 250,
      maxRetries: 5
    };

    const sock = makeWASocket(socketConfig);

    // Timeout حماية
    connectionTimeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        try { sock.ws?.close?.(); } catch {}
        res.status(408).json({ 
          success: false, 
          error: 'انتهت المهلة. الرجاء المحاولة مرة أخرى.' 
        });
        removeFile(tempDir);
      }
    }, 60000);

    // معالج الاتصال
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, isNewLogin } = update;

      if (connection === 'open') {
        clearTimeout(connectionTimeout);
        console.log(`✅ [PAIR] تم الربط بنجاح للرقم: ${num}`);

        try {
          // نسخ الجلسة إلى المجلد الدائم
          const copied = copySessionToSub(tempDir, num);
          
          if (!responseSent) {
            responseSent = true;
            res.json({
              success: true,
              message: 'تم الربط بنجاح!',
              number: num,
              sessionSaved: copied
            });
          }

          // إغلاق السوكت وتنظيف المجلد المؤقت
          setTimeout(() => {
            try { sock.ws?.close?.(); } catch {}
            removeFile(tempDir);
          }, 3000);

        } catch (error) {
          console.error('❌ خطأ بعد الاتصال:', error);
          if (!responseSent) {
            responseSent = true;
            res.status(500).json({ 
              success: false, 
              error: 'خطأ في حفظ الجلسة' 
            });
          }
        }
      }

      if (connection === 'close') {
        clearTimeout(connectionTimeout);
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`🔌 [PAIR] Connection closed: ${statusCode}`);
        
        if (statusCode === 401) {
          console.log('⚠️ تم تسجيل الخروج - يحتاج كود جديد');
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // انتظار 3 ثواني ثم طلب الكود
    await delay(3000);

    if (!sock.authState.creds.registered) {
      try {
        let code = await sock.requestPairingCode(num);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        
        if (!responseSent) {
          responseSent = true;
          res.json({
            success: true,
            code: code,
            number: num,
            message: 'تم إنشاء كود الربط بنجاح'
          });
        }
      } catch (error) {
        console.error('❌ خطأ في طلب الكود:', error);
        clearTimeout(connectionTimeout);
        if (!responseSent) {
          responseSent = true;
          res.status(503).json({
            success: false,
            error: 'فشل في إنشاء كود الربط. تحقق من الرقم وحاول مرة أخرى.'
          });
        }
        removeFile(tempDir);
      }
    }

  } catch (err) {
    console.error('❌ خطأ في بدء الجلسة:', err);
    clearTimeout(connectionTimeout);
    if (!responseSent) {
      responseSent = true;
      res.status(503).json({
        success: false,
        error: 'فشل في بدء جلسة الربط'
      });
    }
    removeFile(tempDir);
  }
});

// ═══ معالج الأخطاء العامة ═══
process.on('uncaughtException', (err) => {
  const e = String(err);
  if (e.includes('conflict') || e.includes('not-authorized') || 
      e.includes('Socket connection timeout') || e.includes('Connection Closed') ||
      e.includes('Timed Out')) return;
  console.log('🔥 Caught exception:', err);
});

export default router;