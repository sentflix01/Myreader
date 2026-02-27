const express = require('express');
const viewsController = require('../controllers/viewsController');

const router = express.Router();

router.post('/sentbot', viewsController.getSentbot);

module.exports = router;