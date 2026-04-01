const express = require('express');
const authController = require('../controllers/authController');
const sentbotController = require('../controllers/sentbotController');

const router = express.Router();

router.use(authController.protect);

router.post('/respond', sentbotController.respond);

module.exports = router;

