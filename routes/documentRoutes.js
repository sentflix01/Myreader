const express = require('express');
const documentsController = require('../controllers/documentsController');

const router = express.Router();

// router.param('id', documentsController.checkID);

router
  .route('/')
  .get(documentsController.getAllDocument)
  .post(documentsController.createDocument);
router
  .route('/:id')
  .get(documentsController.getDocument)
  .patch(documentsController.updateDocument)
  .delete(documentsController.deleteDocument);

module.exports = router;
