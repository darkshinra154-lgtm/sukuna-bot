/**
 * ═══════════════════════════════════════════════════════
 * 🔳 QR CODE | ربط بمسح الكود
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: توليد كود QR + حفظ الجلسة تلقائياً وإرسالها للمنصة
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import { finalizeSession } from './lib/session-manager.js'

const router = express.Router()

router.get('/', async (req, res) => {
  const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
  const tempDir = path.join('./temp_sessions', `qr_${sessionId}`)
  fs.mkdirSync(tempDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(tempDir)
  const { version } = await fetchLatestBaileysVersion()

  let responded = false

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'fatal' }).child({ level: 'fatal' })
      )
    },
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.windows('Chrome'),
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update

    if (qr && !responded) {
      responded = true
      try {
        const qrDataURL = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' }
        })
        res.send({ qr: qrDataURL })
      } catch (e) {
        res.status(500).send({ code: 'فشل توليد كود QR' })
      }
    }

    if (connection === 'open') {
      let number = ''
      try {
        const id = sock.user?.id || ''
        number = id.split(':')[0].split('@')[0].replace(/[^0-9]/g, '')
      } catch {}
      if (!number) number = sessionId

      try {
        await finalizeSession(tempDir, number, { method: 'qr' })
        console.log('✅ QR Session finalized for', number)
      } catch (e) {
        console.error('qr finalize error:', e.message)
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  setTimeout(() => {
    if (!responded) {
      responded = true
      res.status(408).send({ code: 'انتهت مهلة توليد الـ QR، جرب تاني.' })
    }
  }, 30000)
})

export default router