/**
 * ═══════════════════════════════════════════════════════
 * 🔧 BAILEYS CONFIG | إعدادات البايليز الموحدة
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: إعدادات ربط موحدة زي بوت الواتساب بالظبط (سرعة + استقرار)
 * ═══════════════════════════════════════════════════════
 */

import pino from 'pino'
import NodeCache from 'node-cache'
import {
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

// كاش للـ retries والأجهزة (زي بوت الواتساب بالظبط)
export const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
export const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })

/**
 * إنشاء إعدادات اتصال موحدة زي بوت الواتساب بالظبط
 * @param {Object} state - حالة المصادقة من useMultiFileAuthState
 * @returns {Object} - إعدادات الاتصال
 */
export async function createConnectionOptions(state) {
  const { version } = await fetchLatestBaileysVersion()

  return {
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    // نفس المتصفح اللي بيستخدمه بوت الواتساب
    browser: ['Ubuntu', 'Chrome'],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'fatal' }).child({ level: 'fatal' })
      )
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    msgRetryCounterCache,
    userDevicesCache,
    defaultQueryTimeoutMs: undefined,
    // نفس القيم اللي في بوت الواتساب (سرعة + استقرار)
    keepAliveIntervalMs: 55000,
    maxIdleTimeMs: 60000
  }
}