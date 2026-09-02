/**
 * ═══════════════════════════════════════════════════════
 * 🚀 SUKUNA PLATFORM | منصة سوكونا الرئيسية
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: موقع ربط الواتساب + مراقبة الجلسات + إرسالها للتليجرام
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import bodyParser from 'body-parser'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import config from './config.js'

// استيراد الراوترات
import pairRouter from './routes/pair.js'
import qrRouter from './routes/qr.js'
import apiRouter from './routes/api.js'
import { startTelegramMonitor } from './lib/telegram-monitor.js'

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = config.PORT

// زيادة حد الـ Event Listeners
import('events').then(events => {
  events.EventEmitter.defaultMaxListeners = 500
})

// ═══ إنشاء المجلدات المطلوبة ═══
const dirs = [
  config.sessionsDir,
  config.subSessionsDir,
  config.pairSessionsDir,
  config.qrSessionsDir
]

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`📁 Created: ${dir}`)
  }
}

// ═══ Middleware ═══
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// ═══ Routes ═══
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'))
})

app.get('/connect', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'connect.html'))
})

app.use('/pair', pairRouter)
app.use('/qr', qrRouter)
app.use('/api', apiRouter)

// ═══ تشغيل السيرفر ═══
app.listen(PORT, async () => {
  console.log('╔════════════════════════════════════════╗')
  console.log('║   🕸 SUKUNA PLATFORM IS RUNNING! 🕸   ║')
  console.log('╠════════════════════════════════════════╣')
  console.log(`║   🌐 Server: http://localhost:${PORT}    ║`)
  console.log(`║   👑 Developer: ${config.platform.developer.padEnd(20)}║`)
  console.log(`║   🤖 Bot: ${config.platform.botName.padEnd(26)}║`)
  console.log('╚════════════════════════════════════════╝')
  console.log('')

  // تشغيل بوت مراقبة الجلسات
  await startTelegramMonitor()
})

export default app