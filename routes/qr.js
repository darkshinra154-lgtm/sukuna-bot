/**
 * ═══════════════════════════════════════════════════════
 * 🔳 QR CODE ROUTER | راوتر كود الـ QR
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: توليد كود QR بسرعة فائقة (زي بوت الواتساب) + حفظ الجلسة
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import {
  makeWASocket,
  useMultiFileAuthState,
  jidNormalizedUser
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import config from '../config.js'
import { createConnectionOptions } from '../lib/baileys-config.js'
import {
  saveSessionToSubFolder,
  readSessionData,
  getBotNumberFromCreds,
  cleanupSession
} from '../lib/session-manager.js'

const router = express.Router()

// ═══ دالة حذف ملف أو مجلد ═══
function removeFile(FilePath) {
  try {
    if (!fs.existsSync(FilePath)) return false
    fs.rmSync(FilePath, { recursive: true, force: true })
    return true
  } catch (e) {
    console.error('Error removing file:', e)
    return false
  }
}

// ═══ الراوتر الرئيسي ═══
router.get('/', async (req, res) => {
  const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
  const dirs = path.join(config.qrSessionsDir, `session_${sessionId}`)

  async function initiateSession() {
    if (!fs.existsSync(dirs)) fs.mkdirSync(dirs, { recursive: true })
    const { state, saveCreds } = await useMultiFileAuthState(dirs)

    try {
      let qrGenerated = false
      let responseSent = false

      // ═══ استخدام إعدادات بوت الواتساب بالظبط ═══
      const connectionOptions = await createConnectionOptions(state)

      const handleQRCode = async (qr) => {
        if (qrGenerated || responseSent) return
        qrGenerated = true
        console.log('🟢 QR Code Generated!')

        try {
          const qrDataURL = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' }
          })

          if (!responseSent) {
            responseSent = true
            await res.send({
              qr: qrDataURL,
              message: 'QR Code Generated! Scan it with your WhatsApp app.',
              instructions: [
                '1. Open WhatsApp on your phone',
                '2. Go to Settings > Linked Devices',
                '3. Tap "Link a Device"',
                '4. Scan the QR code above'
              ]
            })
          }
        } catch (qrError) {
          console.error('Error generating QR code:', qrError)
          if (!responseSent) {
            responseSent = true
            res.status(500).send({ code: 'Failed to generate QR code' })
          }
        }
      }

      let sock = makeWASocket(connectionOptions)
      let reconnectAttempts = 0

      const handleConnectionUpdate = async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr && !qrGenerated) {
          await handleQRCode(qr)
        }

        if (connection === 'open') {
          console.log('✅ Connected successfully via QR!')

          try {
            // قراءة بيانات الجلسة للحصول على رقم البوت
            const credsData = readSessionData(dirs)
            const botNumber = getBotNumberFromCreds(credsData) || sessionId

            // ═══ حفظ الجلسة في فولدر البوتات الفرعية ═══
            const savedPath = saveSessionToSubFolder(dirs, botNumber)

            if (savedPath && config.pairing.sendToTelegram) {
              try {
                const { notifyNewSession } = await import('../lib/telegram-monitor.js')
                await notifyNewSession(botNumber, savedPath)
              } catch (e) {
                console.log('⚠️ Telegram notification failed:', e.message)
              }
            }

            // تنظيف الجلسة المؤقتة
            setTimeout(() => {
              removeFile(dirs)
              console.log('🧹 QR session cleaned up')
            }, config.pairing.cleanupAfter)

          } catch (error) {
            console.error('Error saving QR session:', error)
          }

          reconnectAttempts = 0
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode

          if (statusCode === 401) {
            console.log('🔐 Logged out - need new QR code')
            removeFile(dirs)
          } else if (statusCode === 515 || statusCode === 503) {
            reconnectAttempts++
            if (reconnectAttempts <= config.pairing.maxReconnectAttempts) {
              setTimeout(() => {
                try {
                  sock = makeWASocket(connectionOptions)
                  sock.ev.on('connection.update', handleConnectionUpdate)
                  sock.ev.on('creds.update', saveCreds)
                } catch (err) {
                  console.error('Failed to reconnect:', err)
                }
              }, 2000)
            } else {
              if (!responseSent) {
                responseSent = true
                res.status(503).send({ code: 'Connection failed after multiple attempts' })
              }
            }
          }
        }
      }

      sock.ev.on('connection.update', handleConnectionUpdate)
      sock.ev.on('creds.update', saveCreds)

      // Timeout لو الـ QR ما اتعملش
      setTimeout(() => {
        if (!responseSent) {
          responseSent = true
          res.status(408).send({ code: 'QR generation timeout' })
          removeFile(dirs)
        }
      }, config.pairing.qrTimeout)

    } catch (err) {
      console.error('Error initializing QR session:', err)
      if (!res.headersSent) {
        res.status(503).send({ code: 'Service Unavailable' })
      }
      removeFile(dirs)
    }
  }

  await initiateSession()
})

export default router