/**
 * ═══════════════════════════════════════════════════════
 * 🔢 PAIRING API | واجهة برمجة كود الربط
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 📜 الوصف: API لتوليد أكواد ربط الواتساب
 * ═══════════════════════════════════════════════════════
 */

import express from 'express';
import { requestPairingCode, deleteSession } from '../lib/baileys.js';
import pn from 'awesome-phonenumber';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let num = req.query.number;
    
    if (!num) {
      return res.status(400).json({
        success: false,
        error: 'الرجاء إدخال رقم الهاتف',
        code: 'MISSING_NUMBER'
      });
    }

    // تنظيف الرقم
    num = num.replace(/[^0-9]/g, '');
    
    // التحقق من صحة الرقم
    const phone = pn('+' + num);
    if (!phone.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف غير صحيح. الرجاء إدخال رقم دولي صحيح (مثال: 201012345678)',
        code: 'INVALID_NUMBER'
      });
    }

    // استخدام الصيغة الدولية
    num = phone.getNumber('e164').replace('+', '');
    const sessionId = num;

    console.log(`[PAIR] 🔄 طلب كود ربط للرقم: ${num}`);

    // طلب كود الربط
    const result = await requestPairingCode(num, sessionId);
    
    console.log(`[PAIR] ✅ تم توليد الكود: ${result.code}`);

    res.json({
      success: true,
      code: result.code,
      sessionId: result.sessionId,
      number: result.number,
      message: 'تم توليد كود الربط بنجاح',
      instructions: [
        '1. افتح واتساب على هاتفك',
        '2. اذهب إلى الإعدادات ⚙️',
        '3. اختر "الأجهزة المرتبطة" 🔗',
        '4. اضغط "ربط جهاز برقم الهاتف"',
        '5. أدخل الكود الظاهر أعلاه'
      ]
    });

  } catch (error) {
    console.error('[PAIR] ❌ خطأ:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'فشل توليد كود الربط',
      code: 'PAIRING_FAILED'
    });
  }
});

// حذف جلسة
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = await deleteSession(sessionId);
    
    if (deleted) {
      res.json({
        success: true,
        message: `تم حذف الجلسة ${sessionId} بنجاح`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'الجلسة غير موجودة'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;