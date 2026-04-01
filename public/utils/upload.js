// const multer = require('multer');
// const sharp = require('sharp');
// const path = require('path');
// const fs = require('fs');
// const AppError = require('./AppError');

// // Create comments directory if it doesn't exist
// const commentsDir = 'public/img/comments';
// if (!fs.existsSync(commentsDir)) {
//   fs.mkdirSync(commentsDir, { recursive: true });
// }

// const multerStorage = multer.memoryStorage();

// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image')) {
//     cb(null, true);
//   } else {
//     cb(new AppError('Not an image! Please upload only images.', 400), false);
//   }
// };

// const upload = multer({
//   storage: multerStorage,
//   fileFilter: multerFilter,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
// });

// exports.uploadCommentPhoto = upload.single('photo');

// exports.resizeCommentPhoto = async (req, res, next) => {
//   if (!req.file) return next();
//   try {
//     req.file.filename = `comment-${req.user.id}-${Date.now()}.jpeg`;
//     await sharp(req.file.buffer)
//       .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
//       .toFormat('jpeg')
//       .jpeg({ quality: 85 })
//       .toFile(path.join(commentsDir, req.file.filename));
//     next();
//   } catch (error) {
//     console.error('Error resizing comment photo:', error);
//     next(error);
//   }
// };
