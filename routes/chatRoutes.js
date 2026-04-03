'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');

const router = express.Router();

// ── All chat routes require authentication ────────────────────
router.use(authController.protect);

// ── Regular user: only their own chats ───────────────────────
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

router.route('/:id/messages').post(chatController.addMessage);
router.route('/:id/sync').put(chatController.syncChat);
router.route('/:id/clear').patch(chatController.clearChat);

// ── Admin-only: full CRUD over ALL users' chats ───────────────
router.use('/admin', authController.restrictTo('Admin'));

router.get('/admin/all',        chatController.adminGetAllChats);
router.get('/admin/user/:userId', chatController.adminGetUserChats);
router.delete('/admin/:id',     chatController.adminDeleteChat);
router.delete('/admin/user/:userId/all', chatController.adminDeleteUserChats);

module.exports = router;
