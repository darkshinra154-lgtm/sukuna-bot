/**
 * ═══════════════════════════════════════════════════════
 * 🔗 BAILEYS CORE | نواة ربط الواتساب
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 📜 الوصف: دوال ربط احترافية مستخرجة من بوت سوكونا
 * ═══════════════════════════════════════════════════════
 */

import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions', 'session-sub');

// ضمان وجود المجلدات
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/**
 * إنشاء اتصال واتساب جديد لجلسة فرعية
 * @param {string} sessionId - معرف الجلسة (عادة رقم الهاتف)
 * @param {object} options - خيارات إضافية
 */
export async function createSubBotSession(sessionId, options = {}) {
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  
  // إنشاء مجلد الجلسة
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
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
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    retryRequestDelayMs: 250,
    maxRetries: 5,
    ...options
  };

  const sock = makeWASocket(socketConfig);
  
  sock.ev.on('creds.update', saveCreds);
  
  return { sock, state, saveCreds, sessionPath };
}

/**
 * طلب كود ربط (Pairing Code) لرقم معين
 * @param {string} number - رقم الهاتف بالصيغة الدولية (بدون +)
 * @param {string} sessionId - معرف الجلسة
 */
export async function requestPairingCode(number, sessionId = null) {
  const cleanNumber = number.replace(/\D/g, '');
  const sid = sessionId || cleanNumber;
  
  const { sock, sessionPath } = await createSubBotSession(sid);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      sock.ws.close();
      reject(new Error('انتهت مهلة طلب كود الربط'));
    }, 30000);

    sock.ev.on('connection.update', async (update) => {
      const { connection, isNewLogin } = update;
      
      if (!sock.authState.creds.registered) {
        try {
          await new Promise(r => setTimeout(r, 3000));
          let code = await sock.requestPairingCode(cleanNumber);
          code = code?.match(/.{1,4}/g)?.join('-') || code;
          clearTimeout(timeout);
          resolve({
            code,
            sessionId: sid,
            sessionPath,
            number: cleanNumber
          });
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      }

      if (connection === 'open') {
        clearTimeout(timeout);
        console.log(`[PAIR] ✅ تم الربط بنجاح للرقم: ${cleanNumber}`);
      }

      if (connection === 'close') {
        clearTimeout(timeout);
        const statusCode = update.lastDisconnect?.error?.output?.statusCode;
        if (statusCode === 401) {
          reject(new Error('تم تسجيل الخروج، يرجى المحاولة مرة أخرى'));
        }
      }
    });
  });
}

/**
 * إنشاء QR Code لجلسة معينة
 * @param {string} sessionId - معرف الجلسة
 */
export async function generateQRCode(sessionId = null) {
  const sid = sessionId || `session_${Date.now()}`;
  const { sock, sessionPath } = await createSubBotSession(sid);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      sock.ws.close();
      reject(new Error('انتهت مهلة توليد QR Code'));
    }, 30000);

    let qrResolved = false;

    sock.ev.on('connection.update', (update) => {
      const { connection, qr } = update;
      
      if (qr && !qrResolved) {
        qrResolved = true;
        clearTimeout(timeout);
        resolve({
          qr,
          sessionId: sid,
          sessionPath
        });
      }

      if (connection === 'open') {
        clearTimeout(timeout);
        console.log(`[QR] ✅ تم الربط بنجاح عبر QR للجلسة: ${sid}`);
      }

      if (connection === 'close') {
        clearTimeout(timeout);
        if (!qrResolved) {
          reject(new Error('فشل توليد QR Code'));
        }
      }
    });
  });
}

/**
 * حذف جلسة معينة
 * @param {string} sessionId - معرف الجلسة
 */
export async function deleteSession(sessionId) {
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * جلب قائمة جميع الجلسات الفرعية
 */
export async function listSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  
  const dirs = fs.readdirSync(SESSIONS_DIR);
  const sessions = [];
  
  for (const dir of dirs) {
    const credsPath = path.join(SESSIONS_DIR, dir, 'creds.json');
    if (fs.existsSync(credsPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        sessions.push({
          id: dir,
          name: creds.me?.name || dir,
          jid: creds.me?.id || null,
          createdAt: creds.me?.createdAt || null,
          registered: creds.registered || false
        });
      } catch (err) {
        sessions.push({
          id: dir,
          name: dir,
          error: err.message
        });
      }
    }
  }
  
  return sessions;
}