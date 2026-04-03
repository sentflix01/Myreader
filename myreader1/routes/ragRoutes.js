const express = require('express');
const authController = require('../controllers/authController');
const ragController = require('../controllers/ragController');

const router = express.Router();
router.use(authController.protect);

router.post('/upload', ragController.uploadDocument);
router.post('/upload-folder', ragController.uploadFolder);
router.post('/query', ragController.ragQuery);

module.exports = router;
