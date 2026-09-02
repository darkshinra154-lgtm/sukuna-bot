/**
 * ═══════════════════════════════════════════════════════
 * 🔳 QR API | واجهة برمجة QR Code
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 📜 الوصف: API لتوليد QR Code لربط الواتساب
 * ═══════════════════════════════════════════════════════
 */

import express from 'express';
import QRCode from 'qrcode';
import { generateQRCode, deleteSession } from '../lib/baileys.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const sessionId = req.query.session || `qr_${Date.now()}`;
    
    console.log(`[QR] 🔄 توليد QR Code للجلسة: ${sessionId}`);

    // توليد QR
    const result = await generateQRCode(sessionId);
    
    // تحويل QR إلى Data URL
    const qrDataURL = await QRCode.toDataURL(result.qr, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log(`[QR] ✅ تم توليد QR بنجاح`);

    res.json({
      success: true,
      qr: qrDataURL,
      sessionId: result.sessionId,
      message: 'تم توليد QR Code بنجاح',
      instructions: [
        '1. افتح واتساب على هاتفك',
        '2. اذهب إلى الإعدادات ⚙️',
        '3. اختر "الأجهزة المرتبطة" 🔗',
        '4. اضغط "ربط جهاز"',
        '5. امسح الـ QR Code الظاهر أعلاه'
      ]
    });

  } catch (error) {
    console.error('[QR] ❌ خطأ:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'فشل توليد QR Code',
      code: 'QR_FAILED'
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