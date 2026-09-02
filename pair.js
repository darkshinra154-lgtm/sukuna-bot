/**
 * ═══════════════════════════════════════════════════════
 * 🔢 PAIR CODE ROUTER | نظام كود الربط السريع
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: ربط الواتساب بنفس دوال البوت الرئيسي
 *          وحفظ الجلسة في session-sub/{number}
 *          ليشغلها conexion.js كـ Sub Bot تلقائياً
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import {
  makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys'
import config from './config.js'

const router = express.Router()

// ═══ تنظيف رقم الهاتف (نفس دالة البوت الرئيسي) ═══
function normalizePhone(value = '') {
  let digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) {
    digits = `${config.bot.defaultCountryCode}${digits.slice(1)}`
  }
  return digits
}

// ═══ حذف جلسة ═══
function removeSession(sessionPath) {
  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true })
      return true
    }
    return false
  } catch (e) {
    console.error('[PAIR] Error removing session:', e.message)
    return false
  }
}

// ═══ التحقق من اكتمال الجلسة ═══
function isSessionComplete(sessionPath) {
  try {
    const credsPath = path.join(sessionPath, 'creds.json')
    if (!fs.existsSync(credsPath)) return false
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
    return !!(creds && creds.me && creds.me.id)
  } catch {
    return false
  }
}

// ═══ إرسال إشعار للمراقبة ═══
async function notifySessionReady(number, sessionPath) {
  try {
    const monitor = await import('./telegram-monitor.js').catch(() => null)
    if (monitor?.notifyNewSession) {
      await monitor.notifyNewSession(number, sessionPath)
    }
  } catch (e) {
    console.log('[PAIR] Telegram notification skipped:', e.message)
  }
}

// ═══ المسار الرئيسي ═══
router.get('/', async (req, res) => {
  const rawNumber = req.query.number || ''
  const number = normalizePhone(rawNumber)

  // ═══ التحقق من صحة الرقم ═══
  if (!number || number.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'invalid_number',
      message: 'رقم الواتساب غير صحيح. أدخل الرقم بالصيغة الدولية بدون +.'
    })
  }

  // ═══ مسار الجلسة داخل session-sub ═══
  const sessionPath = path.join(config.subSessionsDir, number)
  removeSession(sessionPath)
  fs.mkdirSync(sessionPath, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

  let socket = null
  let responseSent = false
  let connectionTimeout = null

  const safeSend = (data, status = 200) => {
    if (responseSent) return
    responseSent = true
    clearTimeout(connectionTimeout)
    try {
      res.status(status).json(data)
    } catch {}
  }

  try {
    const { version } = await fetchLatestBaileysVersion()

    // ═══ إعدادات socket مطابقة تماماً للبوت الرئيسي ═══
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
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      defaultQueryTimeoutMs: config.bot.defaultQueryTimeoutMs,
      connectTimeoutMs: config.bot.connectTimeoutMs,
      keepAliveIntervalMs: config.bot.keepAliveIntervalMs,
      maxIdleTimeMs: config.bot.maxIdleTimeMs,
      retryRequestDelayMs: config.bot.retryRequestDelayMs,
      maxRetries: config.bot.maxRetries
    })

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      const statusCode = lastDisconnect?.error?.output?.statusCode

      if (connection === 'open') {
        console.log(`[PAIR] ✅ Connected: ${number}`)

        if (isSessionComplete(sessionPath)) {
          console.log(`[PAIR] 💾 Session saved at: ${sessionPath}`)
          await notifySessionReady(number, sessionPath)

          safeSend({
            success: true,
            stage: 'connected',
            number,
            message: '✅ تم الربط بنجاح! البوت الفرعي جاهز.',
            sessionPath
          })

          try {
            socket.ws?.close?.()
            socket.ev.removeAllListeners()
          } catch {}
        }
      }

      if (connection === 'close') {
        if (statusCode === 401) {
          console.log(`[PAIR] ❌ Logged out: ${number}`)
          removeSession(sessionPath)
          safeSend({
            success: false,
            error: 'logged_out',
            message: 'تم تسجيل الخروج. حاول مرة أخرى.'
          }, 401)
        }
      }
    })

    // ═══ طلب كود الربط (بعد تأخير قصير) ═══
    await delay(2000)

    try {
      let code = await socket.requestPairingCode(number)
      code = code?.match(/.{1,4}/g)?.join('-') || code

      console.log(`[PAIR] 📱 Code for ${number}: ${code}`)

      safeSend({
        success: true,
        stage: 'code_ready',
        number,
        code,
        message: 'تم توليد كود الربط بنجاح.',
        instructions: [
          'افتح واتساب على هاتفك',
          'الإعدادات ⚙️ ← الأجهزة المرتبطة 🔗',
          'اضغط "ربط جهاز" ← "الربط برقم الهاتف"',
          'أدخل الكود أعلاه'
        ]
      })
    } catch (pairErr) {
      console.error('[PAIR] ❌ Failed:', pairErr.message)
      removeSession(sessionPath)
      safeSend({
        success: false,
        error: 'pairing_failed',
        message: `فشل توليد الكود: ${pairErr.message}`
      }, 503)
    }

    // ═══ Timeout ═══
    connectionTimeout = setTimeout(() => {
      if (!responseSent) {
        removeSession(sessionPath)
        safeSend({
          success: false,
          error: 'timeout',
          message: 'انتهت المهلة. حاول مرة أخرى.'
        }, 408)
        try {
          socket.ws?.close?.()
          socket.ev.removeAllListeners()
        } catch {}
      }
    }, 90000)

  } catch (err) {
    console.error('[PAIR] ❌ Init error:', err.message)
    removeSession(sessionPath)
    safeSend({
      success: false,
      error: 'init_failed',
      message: err.message
    }, 500)
  }
})

// ═══ Polling endpoint لحالة الاتصال ═══
router.get('/status/:number', (req, res) => {
  const number = String(req.params.number).replace(/\D/g, '')
  const sessionPath = path.join(config.subSessionsDir, number)

  if (isSessionComplete(sessionPath)) {
    res.json({
      success: true,
      status: 'connected',
      number
    })
  } else {
    res.json({
      success: false,
      status: 'pending'
    })
  }
})

export default router