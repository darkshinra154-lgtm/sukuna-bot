/**
 * ═══════════════════════════════════════════════════════
 * 🔢 PAIR CODE ROUTER | راوتر كود الربط
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: توليد كود الربط بسرعة فائقة (زي بوت الواتساب) + حفظ الجلسة
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  jidNormalizedUser
} from '@whiskeysockets/baileys'
import pn from 'awesome-phonenumber'
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
  let num = req.query.number
  const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 6)
  let dirs = path.join(config.pairSessionsDir, `session_${sessionId}`)

  // حذف أي جلسة قديمة
  await removeFile(dirs)

  // تنظيف رقم الهاتف
  num = num.replace(/[^0-9]/g, '')

  // التحقق من صحة الرقم
  const phone = pn('+' + num)
  if (!phone.isValid()) {
    if (!res.headersSent) {
      return res.status(400).send({
        code: 'Invalid phone number. Please enter your full international number without + or spaces.'
      })
    }
    return
  }

  // تحويل الرقم لصيغة E.164
  num = phone.getNumber('e164').replace('+', '')

  async function initiateSession() {
    const { state, saveCreds } = await useMultiFileAuthState(dirs)

    try {
      let responseSent = false

      // ═══ استخدام إعدادات بوت الواتساب بالظبط ═══
      const connectionOptions = await createConnectionOptions(state)

      const sukuna = makeWASocket(connectionOptions)

      sukuna.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'open') {
          console.log('✅ Connected successfully!')
          console.log(`📱 Saving session for: ${num}`)

          try {
            // قراءة بيانات الجلسة للحصول على رقم البوت
            const credsData = readSessionData(dirs)
            const botNumber = getBotNumberFromCreds(credsData) || num

            // ═══ حفظ الجلسة في فولدر البوتات الفرعية ═══
            const savedPath = saveSessionToSubFolder(dirs, botNumber)

            if (savedPath && config.pairing.sendToTelegram) {
              // إرسال إشعار لبوت التليجرام
              try {
                const { notifyNewSession } = await import('../lib/telegram-monitor.js')
                await notifyNewSession(botNumber, savedPath)
              } catch (e) {
                console.log('⚠️ Telegram notification failed:', e.message)
              }
            }

            // حذف الجلسة المؤقتة بعد الحفظ
            setTimeout(() => {
              removeFile(dirs)
              console.log('🧹 Temporary session cleaned up')
            }, config.pairing.cleanupAfter)

            console.log('🎉 Process completed successfully!')
          } catch (error) {
            console.error('❌ Error saving session:', error)
            removeFile(dirs)
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode
          if (statusCode === 401) {
            console.log('❌ Logged out. Need new pair code.')
          } else if (statusCode !== 401) {
            console.log('🔁 Connection closed — restarting...')
            if (!responseSent) {
              initiateSession()
            }
          }
        }
      })

      // طلب كود الربط (بسرعة فائقة - تأخير 1 ثانية فقط زي بوت الواتساب)
      if (!sukuna.authState.creds.registered) {
        await new Promise(resolve => setTimeout(resolve, config.pairing.pairingDelay))
        try {
          let code = await sukuna.requestPairingCode(num)
          code = code?.match(/.{1,4}/g)?.join('-') || code
          if (!res.headersSent) {
            responseSent = true
            console.log({ num, code })
            await res.send({ code })
          }
        } catch (error) {
          console.error('Error requesting pairing code:', error)
          if (!res.headersSent) {
            responseSent = true
            res.status(503).send({
              code: 'Failed to get pairing code. Please try again.'
            })
          }
        }
      }

      sukuna.ev.on('creds.update', saveCreds)
    } catch (err) {
      console.error('Error initializing session:', err)
      if (!res.headersSent) {
        res.status(503).send({ code: 'Service Unavailable' })
      }
    }
  }

  await initiateSession()
})

export default router