/**
 * ═══════════════════════════════════════════════════════
 * 🔢 PAIRING CODE API | واجهة ربط بالكود
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو)
 * 📜 الوصف: استخدام نفس دوال بوت الواتساب لطلب كود الربط
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import AuthEngine from './lib/auth-engine.js'
import { randomBytes } from 'crypto'

const router = express.Router()
const activeSessions = new Map()

// تنظيف الجلسات القديمة كل ساعة
setInterval(() => {
  const now = Date.now()
  for (const [id, session] of activeSessions) {
    if (now - session.createdAt > global.platformConfig.sessionTimeout) {
      session.engine.cleanup()
      activeSessions.delete(id)
    }
  }
}, 3600000)

// ═══ بدء جلسة ربط جديدة ═══
router.post('/start', async (req, res) => {
  try {
    const { number } = req.body
    if (!number) {
      return res.status(400).json({ error: 'الرقم مطلوب' })
    }

    const sessionId = `session_${randomBytes(8).toString('hex')}`
    const engine = new AuthEngine({ sessionId })

    await engine.start()

    // حفظ الجلسة
    activeSessions.set(sessionId, {
      engine,
      createdAt: Date.now(),
      number: engine.normalizePhone(number)
    })

    // طلب كود الربط
    const code = await engine.requestPairingCode(number)

    // تسجيل callback للاتصال
    engine.onConnection(({ status, jid }) => {
      if (status === 'connected') {
        console.log(`[PAIR] ✅ تم الربط بنجاح: ${jid}`)
      }
    })

    res.json({
      success: true,
      sessionId,
      code,
      number: engine.normalizePhone(number),
      expiresAt: Date.now() + global.platformConfig.sessionTimeout
    })
  } catch (e) {
    console.error('[PAIR] Error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ═══ فحص حالة الجلسة ═══
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
      jid,
      number: session.number
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ═══ إلغاء الجلسة ═══
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