/**
 * ═══════════════════════════════════════════════════════
 * 🔌 API ROUTER | راوتر الـ API
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: نقاط API لإدارة الجلسات والإحصائيات
 * ═══════════════════════════════════════════════════════
 */

import express from 'express'
import fs from 'fs'
import path from 'path'
import config from '../config.js'
import {
  getSavedSessions,
  deleteSavedSession
} from '../lib/session-manager.js'

const router = express.Router()

// ═══ API: عرض الجلسات ═══
router.get('/sessions', (req, res) => {
  try {
    const sessions = getSavedSessions()
    res.json({ sessions, count: sessions.length })
  } catch (e) {
    res.json({ sessions: [], count: 0 })
  }
})

// ═══ API: حذف جلسة ═══
router.delete('/session/:number', (req, res) => {
  try {
    const num = req.params.number
    const success = deleteSavedSession(num)
    res.json({
      success,
      message: success ? `Session ${num} deleted` : 'Session not found'
    })
  } catch (e) {
    res.json({ success: false, message: e.message })
  }
})

// ═══ API: حالة المنصة ═══
router.get('/status', (req, res) => {
  try {
    const sessions = getSavedSessions()
    res.json({
      status: 'online',
      botName: config.platform.botName,
      version: config.platform.version,
      sessionsCount: sessions.length,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ═══ API: معلومات المنصة ═══
router.get('/info', (req, res) => {
  res.json({
    platform: config.platform,
    endpoints: {
      pair: '/pair?number=PHONE',
      qr: '/qr',
      sessions: '/api/sessions',
      status: '/api/status'
    }
  })
})

export default router