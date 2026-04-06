'use strict';

const express          = require('express');
const authController   = require('../controllers/authController');
const sentbotController = require('../controllers/sentbotController');

const router = express.Router();

// ── Internal analytics POST — no auth (called server-side by ragController) ──
// Secured by being an internal server-to-server call only (not exposed to browser)
router.post('/analytics', sentbotController.logAnalytics);

// ── All other sentbot routes require authentication ───────────
router.use(authController.protect);

router.post('/respond',   sentbotController.respond);
router.get('/analytics',  sentbotController.getAnalytics);

module.exports = router;
