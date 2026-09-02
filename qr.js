/**
 * ═══════════════════════════════════════════════════════
 * 🔳 QR CODE ROUTER | نظام ربط QR
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: ربط QR بنفس دوال البوت الرئيسي
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import QRCode from 'qrcode'
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys'
import config from './config.js'

const router = express.Router()

function removeSession(p) {
  try {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true })
  } catch {}
}

function isSessionComplete(p) {
  try {
    const credsPath = path.join(p, 'creds.json')
    if (!fs.existsSync(credsPath)) return false
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
    return !!(creds?.me?.id)
  } catch {
    return false
  }
}

async function notifySessionReady(number, sessionPath) {
  try {
    const monitor = await import('./telegram-monitor.js').catch(() => null)
    if (monitor?.notifyNewSession) {
      await monitor.notifyNewSession(number, sessionPath)
    }
  } catch {}
}

// ═══ المسار الرئيسي ═══
router.get('/', async (req, res) => {
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const tempPath = path.join('./qr_sessions', `qr_${sessionId}`)

  fs.mkdirSync('./qr_sessions', { recursive: true })
  removeSession(tempPath)
  fs.mkdirSync(tempPath, { recursive: true })

  let socket = null
  let responseSent = false
  let qrGenerated = false

  const safeSend = (data, status = 200) => {
    if (responseSent) return
    responseSent = true
    res.status(status).json(data)
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(tempPath)
    const { version } = await fetchLatestBaileysVersion()

    socket = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          pino({ level: 'fatal' }).child({ level: 'fatal' })
        )
      },
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: config.bot.defaultQueryTimeoutMs,
      keepAliveIntervalMs: config.bot.keepAliveIntervalMs
    })

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update
      const statusCode = lastDisconnect?.error?.output?.statusCode

      // ═══ توليد QR ═══
      if (qr && !qrGenerated) {
        qrGenerated = true
        try {
          const qrDataURL = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' }
          })

          safeSend({
            success: true,
            stage: 'qr_ready',
            qr: qrDataURL,
            sessionId,
            message: 'امسح الكود بكاميرا واتساب.',
            instructions: [
              'افتح واتساب على هاتفك',
              'الإعدادات ⚙️ ← الأجهزة المرتبطة 🔗',
              'اضغط "ربط جهاز" وامسح الكود'
            ]
          })
        } catch {
          safeSend({
            success: false,
            error: 'qr_failed',
            message: 'فشل توليد QR'
          }, 500)
        }
      }

      // ═══ الاتصال نجح ═══
      if (connection === 'open') {
        console.log('[QR] ✅ Connected!')

        let botNumber = null
        const credsPath = path.join(tempPath, 'creds.json')
        if (fs.existsSync(credsPath)) {
          try {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
            botNumber = (creds?.me?.id || '').split(':')[0].split('@')[0]
          } catch {}
        }

        if (!botNumber) botNumber = sessionId

        // ═══ نقل الجلسة لـ session-sub ═══
        const finalPath = path.join(config.subSessionsDir, botNumber)
        removeSession(finalPath)
        fs.mkdirSync(config.subSessionsDir, { recursive: true })

        try {
          const files = fs.readdirSync(tempPath)
          for (const file of files) {
            fs.copyFileSync(
              path.join(tempPath, file),
              path.join(finalPath, file)
            )
          }
          console.log(`[QR] 💾 Session moved: ${finalPath}`)
          await notifySessionReady(botNumber, finalPath)

          // كتابة ملف حالة للـ polling
          fs.writeFileSync(
            path.join(tempPath, 'STATUS'),
            JSON.stringify({ status: 'connected', number: botNumber })
          )
        } catch (e) {
          console.error('[QR] Move error:', e.message)
        }

        try {
          socket.ws?.close?.()
          socket.ev.removeAllListeners()
        } catch {}
      }

      if (connection === 'close' && statusCode === 401) {
        removeSession(tempPath)
      }
    })

    // Timeout
    setTimeout(() => {
      if (!responseSent) {
        safeSend({
          success: false,
          error: 'timeout',
          message: 'انتهت مهلة توليد QR'
        }, 408)
        removeSession(tempPath)
      }
      setTimeout(() => {
        try {
          socket?.ws?.close?.()
          socket?.ev.removeAllListeners()
        } catch {}
      }, 90000)
    }, 30000)

  } catch (err) {
    console.error('[QR] ❌ Error:', err.message)
    removeSession(tempPath)
    safeSend({
      success: false,
      error: 'init_failed',
      message: err.message
    }, 500)
  }
})

// ═══ Polling endpoint ═══
router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const statusFile = path.join('./qr_sessions', `qr_${sessionId}`, 'STATUS')

  if (fs.existsSync(statusFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(statusFile, 'utf-8'))
      res.json({ success: true, ...data })

      if (data.status === 'connected') {
        setTimeout(() => {
          removeSession(path.join('./qr_sessions', `qr_${sessionId}`))
        }, 5000)
      }
    } catch {
      res.json({ success: false, status: 'pending' })
    }
  } else {
    res.json({ success: false, status: 'pending' })
  }
})

export default router