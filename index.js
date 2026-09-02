/**
 * ═══════════════════════════════════════════════════════
 * 🚀 SUKUNA PLATFORM | منصة سوكونا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: سيرفر الموقع + لوحة التحكم + حالة المنصة
 * ═══════════════════════════════════════════════════════
 */

import './settings.js'
import express from 'express'
import bodyParser from 'body-parser'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import pairRouter from './pair.js'
import qrRouter from './qr.js'
import { startSessionWatcher } from './lib/session-manager.js'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT || 8000

import('events').then(events => {
  events.EventEmitter.defaultMaxListeners = 500
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// حالة المنصة (للداشبورد)
app.get('/status', (req, res) => {
  const dir = path.join(__dirname, global.subSessionsDir)
  let sessions = 0
  try {
    sessions = fs.readdirSync(dir).filter(f => {
      return fs.statSync(path.join(dir, f)).isDirectory()
    }).length
  } catch {}
  res.json({
    uptime: Math.floor(process.uptime()),
    sessions,
    bot: global.botname
  })
})

app.use('/pair', pairRouter)
app.use('/qr', qrRouter)

// تشغيل المراقب التلقائي
startSessionWatcher()

app.listen(PORT, () => {
  console.log(`🕸 منصة سوكونا شغالة على البورت ${PORT}`)
})

export default app