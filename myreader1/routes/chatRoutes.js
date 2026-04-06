const express = require('express');
const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');

const router = express.Router();

// All chat APIs require authentication
router.use(authController.protect);

router
  .route('/')
  .get(chatController.getMyChats)
  .post(chatController.createChat)
  .delete(chatController.deleteAllMyChats);

router.route('/clear-all').patch(chatController.clearAllMyChats);

router
  .route('/:id')
  .get(chatController.getChat)
  .delete(chatController.deleteChat);

router.route('/:id/messages/stream').post(chatController.addMessageStream);
router.route('/:id/messages').post(chatController.addMessage);

router.route('/:id/sync').put(chatController.syncChat);

router.route('/:id/clear').patch(chatController.clearChat);

module.exports = router;
