/**
 * ═══════════════════════════════════════════════════════
 * 🔐 SUKUNA AUTH ENGINE | محرك الربط الموحد
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو)
 * 📜 الوصف: نفس دوال الربط المستخدمة في بوت الواتساب الرئيسي
 * ═══════════════════════════════════════════════════════
 */

import {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} from '@whiskeysockets/baileys'
import { makeWASocket } from './simple.js'
import store from './store.js'
import pino from 'pino'
import qrcode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class AuthEngine {
  constructor(options = {}) {
    this.sessionId = options.sessionId || `session_${Date.now()}`
    this.sessionPath = path.join(process.cwd(), global.sessionsMain, global.sessionsSub, this.sessionId)
    this.socket = null
    this.qrCallbacks = []
    this.codeCallbacks = []
    this.connectionCallbacks = []
    this.phoneNumber = null
    this.qrTimeout = null
    this.maxRetries = 3
    this.retryCount = 0
  }

  // ═══ تنظيف الأرقام ═══
  normalizePhone(number) {
    let digits = String(number || '').replace(/\D/g, '')
    if (!digits) return ''
    if (digits.startsWith('00')) digits = digits.slice(2)
    if (digits.startsWith('+')) digits = digits.slice(1)
    return digits
  }

  // ═══ بدء جلسة جديدة ═══
  async start() {
    // إنشاء مجلد الجلسة
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true })
    }

    const { state, saveState, saveCreds } = await useMultiFileAuthState(this.sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const socketConfig = {
      version,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '10.0'],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
      },
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 250,
      getMessage: async (key) => {
        try {
          const jid = jidNormalizedUser(key.remoteJid)
          const msg = await store.loadMessage(jid, key.id)
          return msg?.message || ''
        } catch { return '' }
      }
    }

    this.socket = makeWASocket(socketConfig)
    this.socket.ev.on('creds.update', saveCreds)

    // معالجة تحديثات الاتصال
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update

      if (qr) {
        this.qrCallbacks.forEach(cb => cb(qr))
      }

      if (connection === 'open') {
        this.connectionCallbacks.forEach(cb => cb({ status: 'connected', jid: this.socket.user?.id }))
        this.clearTimeouts()
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode
        if (code !== DisconnectReason.loggedOut && this.retryCount < this.maxRetries) {
          this.retryCount++
          setTimeout(() => this.start(), 2000)
        } else {
          this.connectionCallbacks.forEach(cb => cb({ status: 'disconnected', code }))
        }
      }
    })

    return this.socket
  }

  // ═══ طلب كود الربط (Pairing Code) ═══
  async requestPairingCode(number) {
    if (!this.socket) {
      throw new Error('Socket not initialized. Call start() first.')
    }

    const digits = this.normalizePhone(number)
    if (!digits || digits.length < 8) {
      throw new Error('رقم الواتساب غير صحيح. اكتب رقم بصيغة دولية بدون +.')
    }

    this.phoneNumber = digits

    // انتظار حتى يكون الـ socket جاهزاً
    await this.waitForSocketReady()

    let code = await this.socket.requestPairingCode(digits)
    code = code?.match(/.{1,4}/g)?.join('-') || code
    return code
  }

  // ═══ انتظار جاهزية الـ socket ═══
  async waitForSocketReady(timeout = 45000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (this.socket && typeof this.socket.requestPairingCode === 'function') {
        return this.socket
      }
      await new Promise(r => setTimeout(r, 500))
    }
    throw new Error('Socket not ready. Please try again.')
  }

  // ═══ تسجيل callback للـ QR ═══
  onQR(callback) {
    this.qrCallbacks.push(callback)
    return this
  }

  // ═══ تسجيل callback للكود ═══
  onCode(callback) {
    this.codeCallbacks.push(callback)
    return this
  }

  // ═══ تسجيل callback للاتصال ═══
  onConnection(callback) {
    this.connectionCallbacks.push(callback)
    return this
  }

  // ═══ توليد صورة QR ═══
  async generateQRImage(qr) {
    return await qrcode.toDataURL(qr, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    })
  }

  // ═══ تنظيف ═══
  clearTimeouts() {
    if (this.qrTimeout) {
      clearTimeout(this.qrTimeout)
      this.qrTimeout = null
    }
  }

  cleanup() {
    this.clearTimeouts()
    if (this.socket) {
      try {
        this.socket.ws.close()
        this.socket.ev.removeAllListeners()
      } catch {}
    }
  }

  // ═══ حذف الجلسة ═══
  destroy() {
    this.cleanup()
    try {
      fs.rmSync(this.sessionPath, { recursive: true, force: true })
    } catch {}
  }
}

export default AuthEngine