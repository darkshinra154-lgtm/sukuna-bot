/**
 * ═══════════════════════════════════════════════════════
 * 📷 QR CODE API | واجهة ربط بالكاميرا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو)
 * 📜 الوصف: استخدام نفس دوال بوت الواتساب لتوليد QR
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import AuthEngine from './lib/auth-engine.js'
import { randomBytes } from 'crypto'

const router = express.Router()
const activeSessions = new Map()

// تنظيف الجلسات القديمة
setInterval(() => {
  const now = Date.now()
  for (const [id, session] of activeSessions) {
    if (now - session.createdAt > global.platformConfig.sessionTimeout) {
      session.engine.cleanup()
      activeSessions.delete(id)
    }
  }
}, 3600000)

// ═══ بدء جلسة QR جديدة ═══
router.post('/start', async (req, res) => {
  try {
    const sessionId = `session_${randomBytes(8).toString('hex')}`
    const engine = new AuthEngine({ sessionId })

    await engine.start()

    // حفظ الجلسة
    activeSessions.set(sessionId, {
      engine,
      createdAt: Date.now(),
      qr: null
    })

    // انتظار QR
    const qrPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('QR timeout'))
      }, 60000)

      engine.onQR(async (qr) => {
        clearTimeout(timeout)
        const qrImage = await engine.generateQRImage(qr)
        activeSessions.get(sessionId).qr = qrImage
        resolve(qrImage)
      })
    })

    const qrImage = await qrPromise

    // تسجيل callback للاتصال
    engine.onConnection(({ status, jid }) => {
      if (status === 'connected') {
        console.log(`[QR] ✅ تم الربط بنجاح: ${jid}`)
      }
    })

    res.json({
      success: true,
      sessionId,
      qrImage,
      expiresAt: Date.now() + global.platformConfig.sessionTimeout
    })
  } catch (e) {
    console.error('[QR] Error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ═══ تحديث QR ═══
router.get('/refresh/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const session = activeSessions.get(sessionId)

    if (!session) {
      return res.status(404).json({ error: 'الجلسة منتهية' })
    }

    if (session.qr) {
      res.json({ qrImage: session.qr })
    } else {
      res.json({ qrImage: null, message: 'في انتظار QR جديد' })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ═══ فحص الحالة ═══
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const session = activeSessions.get(sessionId)

    if (!session) {
      return res.json({ status: 'expired', connected: false })
    }

    const connected = session.engine.socket?.user ? true : false
    const jid = session.engine.socket?.user?.id || null

    res.json({
      status: connected ? 'connected' : 'waiting',
      connected,
      jid
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ═══ إلغاء ═══
router.post('/cancel/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const session = activeSessions.get(sessionId)

    if (session) {
      session.engine.cleanup()
      activeSessions.delete(sessionId)
    }

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router