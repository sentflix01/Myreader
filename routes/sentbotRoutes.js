const express = require('express');
const authController = require('../controllers/authController');
const sentbotController = require('../controllers/sentbotController');

const router = express.Router();

router.use(authController.protect);

router.post('/respond', sentbotController.respond);

// RAG analytics — internal fire-and-forget from ragController (no auth required)
// Also accessible to the user for their own stats dashboard
router.post('/analytics', sentbotController.logAnalytics);
router.get('/analytics',  authController.protect, sentbotController.getAnalytics);

module.exports = router;

