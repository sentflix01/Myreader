const express = require('express');
const documentsController = require('../controllers/documentsController');
const authController = require('../controllers/authController');

const ragController = require('../controllers/ragController');
const router = express.Router();

router.use(authController.protect);

// router.param('id', documentsController.checkID);

router.post('/upload', ragController.uploadDocument);
router.post('/folders/upload', ragController.uploadFolder);

router
  .route('/')
  .get(documentsController.getAllDocument)
  .post(documentsController.createDocument)
  .delete(documentsController.deleteAllDocuments);
router
  .route('/:id')
  .get(documentsController.getDocument)
  .patch(documentsController.updateDocument)
  .delete(documentsController.deleteDocument);

module.exports = router;
