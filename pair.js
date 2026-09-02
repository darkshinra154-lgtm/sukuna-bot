/**
 * ═══════════════════════════════════════════════════════
 * 🔢 PAIR CODE | ربط بكود الاقتران
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: توليد كود ربط + حفظ الجلسة تلقائياً وإرسالها للمنصة
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
  Browsers,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import pn from 'awesome-phonenumber'
import { finalizeSession } from './lib/session-manager.js'

const router = express.Router()

router.get('/', async (req, res) => {
  let num = (req.query.number || '').replace(/[^0-9]/g, '')
  if (!num) {
    return res.status(400).send({ code: 'أدخل رقم الهاتف أولاً' })
  }

  const phone = pn('+' + num)
  if (!phone.isValid()) {
    return res.status(400).send({
      code: 'رقم غير صحيح. اكتب الرقم بصيغة دولية كاملة بدون + أو مسافات.'
    })
  }
  num = phone.getNumber('e164').replace('+', '')

  const tempDir = path.join('./temp_sessions', `pair_${num}_${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(tempDir)
  const { version } = await fetchLatestBaileysVersion()

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
    generateHighQualityLinkPreview: true,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000
  })

  let responded = false

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      try {
        await finalizeSession(tempDir, num, { method: 'pair' })
        console.log('✅ Session finalized for', num)
      } catch (e) {
        console.error('finalize error:', e.message)
      }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === 401) {
        console.log('Logged out for', num)
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  if (!sock.authState.creds.registered) {
    await delay(3000)
    try {
      let code = await sock.requestPairingCode(num)
      code = code?.match(/.{1,4}/g)?.join('-') || code
      if (!responded) {
        responded = true
        res.send({ code })
      }
    } catch (e) {
      if (!responded) {
        responded = true
        res.status(503).send({ code: 'فشل طلب كود الربط، تأكد من الرقم وجرب تاني.' })
      }
    }
  }

  setTimeout(() => {
    if (!responded) {
      responded = true
      res.status(408).send({ code: 'انتهت مهلة توليد الكود، جرب تاني.' })
    }
  }, 30000)
})

export default router