/**
 * ═══════════════════════════════════════════════════════
 * 💾 SESSION MANAGER | مدير الجلسات
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: حفظ الجلسات في فولدر البوتات الفرعية + إشعارات التليجرام
 * ═══════════════════════════════════════════════════════
 */

import fs from 'fs'
import path from 'path'
import config from '../config.js'

/**
 * حفظ الجلسة في فولدر البوتات الفرعية
 * @param {string} sessionDir - مسار الجلسة المؤقتة
 * @param {string} botNumber - رقم البوت
 * @returns {string|null} - مسار الجلسة المحفوظة
 */
export function saveSessionToSubFolder(sessionDir, botNumber) {
  try {
    const credsPath = path.join(sessionDir, 'creds.json')
    if (!fs.existsSync(credsPath)) {
      console.log('❌ creds.json not found in', sessionDir)
      return null
    }

    // إنشاء مجلد الجلسات الفرعية لو مش موجود
    const subDir = config.subSessionsDir
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true })
    }

    // اسم المجلد = رقم البوت
    const targetDir = path.join(subDir, botNumber)

    // لو المجلد موجود بالفعل، احذفه الأول
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }

    // انسخ كل ملفات الجلسة
    fs.mkdirSync(targetDir, { recursive: true })
    const files = fs.readdirSync(sessionDir)
    for (const file of files) {
      fs.copyFileSync(
        path.join(sessionDir, file),
        path.join(targetDir, file)
      )
    }

    console.log(`✅ Session saved to: ${targetDir}`)
    return targetDir
  } catch (e) {
    console.error('❌ Error saving session:', e)
    return null
  }
}

/**
 * قراءة بيانات الجلسة للحصول على رقم البوت
 * @param {string} sessionDir - مسار الجلسة
 * @returns {Object|null} - بيانات الجلسة
 */
export function readSessionData(sessionDir) {
  try {
    const credsPath = path.join(sessionDir, 'creds.json')
    if (!fs.existsSync(credsPath)) return null
    return JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
  } catch (e) {
    console.error('Error reading session:', e)
    return null
  }
}

/**
 * الحصول على رقم البوت من بيانات الجلسة
 * @param {Object} credsData - بيانات creds.json
 * @returns {string|null} - رقم البوت
 */
export function getBotNumberFromCreds(credsData) {
  try {
    if (!credsData?.me?.id) return null
    // الرقم هو الجزء قبل ':' في الـ id
    return credsData.me.id.split(':')[0]
  } catch {
    return null
  }
}

/**
 * حذف الجلسة المؤقتة
 * @param {string} sessionDir - مسار الجلسة
 */
export function cleanupSession(sessionDir) {
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true })
      console.log('🧹 Session cleaned up:', sessionDir)
    }
  } catch (e) {
    console.error('Error cleaning session:', e)
  }
}

/**
 * الحصول على قائمة الجلسات المحفوظة
 * @returns {Array} - قائمة الجلسات
 */
export function getSavedSessions() {
  try {
    const subDir = config.subSessionsDir
    if (!fs.existsSync(subDir)) return []

    return fs.readdirSync(subDir).filter(dir => {
      const credsPath = path.join(subDir, dir, 'creds.json')
      return fs.existsSync(credsPath)
    })
  } catch {
    return []
  }
}

/**
 * حذف جلسة محفوظة
 * @param {string} botNumber - رقم البوت
 * @returns {boolean} - نجاح الحذف
 */
export function deleteSavedSession(botNumber) {
  try {
    const targetDir = path.join(config.subSessionsDir, botNumber)
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
      return true
    }
    return false
  } catch {
    return false
  }
}