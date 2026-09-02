/* تـم الـتـنـسـيـق بـحـسـب طـلـب الـمـطـور: آدم (شادو) 🍁 */

import * as mega from 'megajs';
import crypto from 'crypto';

// 🔐 استخدام متغيرات البيئة بدل hardcoded credentials
const MEGA_EMAIL = process.env.MEGA_EMAIL || '';
const MEGA_PASSWORD = process.env.MEGA_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'sukuna_secret_key_2026'; // مفتاح التشفير

if (!MEGA_EMAIL || !MEGA_PASSWORD) {
  console.warn('⚠️ [MEGA] MEGA_EMAIL أو MEGA_PASSWORD مش معرّفين في environment variables');
}

// 🔒 دالة تشفير الجلسة قبل الرفع
function encryptBuffer(buffer, secret) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]); // IV في أول الملف
}

// 🔓 دالة فك التشفير
function decryptBuffer(buffer, secret) {
  const iv = buffer.slice(0, 16);
  const encrypted = buffer.slice(16);
  const key = crypto.createHash('sha256').update(secret).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// 📤 رفع ملف مشفّر على MEGA
export const upload = (buffer, name) => {
  return new Promise((resolve, reject) => {
    if (!MEGA_EMAIL || !MEGA_PASSWORD) {
      return reject(new Error('MEGA credentials missing'));
    }

    try {
      // تشفير الملف قبل الرفع
      const encryptedBuffer = encryptBuffer(buffer, SESSION_SECRET);
      
      const storage = new mega.Storage({
        email: MEGA_EMAIL,
        password: MEGA_PASSWORD,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      }, () => {
        const uploadStream = storage.upload({ 
          name: name, 
          size: encryptedBuffer.length,
          allowUploadBuffering: true 
        });

        // كتابة البافر مباشرة
        uploadStream.end(encryptedBuffer);

        storage.on("add", (file) => {
          file.link((err, url) => {
            if (err) {
              storage.close();
              reject(err);
            } else {
              storage.close();
              resolve(url);
            }
          });
        });

        storage.on("error", (error) => {
          storage.close();
          reject(error);
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};

// 📥 تحميل وفك تشفير ملف من MEGA
export const download = (url) => {
  return new Promise((resolve, reject) => {
    try {
      const file = mega.File.fromURL(url);
      file.loadAttributes((err) => {
        if (err) return reject(err);
        file.downloadBuffer((err, buffer) => {
          if (err) return reject(err);
          try {
            const decrypted = decryptBuffer(buffer, SESSION_SECRET);
            resolve(decrypted);
          } catch (decErr) {
            reject(decErr);
          }
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};