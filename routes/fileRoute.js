const express = require('express');
const fileController = require('./../controllers/fileController');

const router = express.Router();

router.param('id', fileController.checkID);

router
  .route('/')
  .get(fileController.getAllFile)
  .post(fileController.checkBody, fileController.createFile);
router
  .route('/:id')
  .get(fileController.getFile)
  .patch(fileController.updateFile)
  .delete(fileController.deleteFile);

module.exports = router;
