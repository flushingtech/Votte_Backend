const multer = require('multer');
const path = require('path');

const upload = multer({
  storage: multer.diskStorage({}),
  filename: function (req, file, cb) {
    console.log(file.originalname);
    cb(null, file.originalname);
  },
  fileFilter: function (req, file, callback) {
    const ext = path.extname(file.originalname);
    if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
      return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE'));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3,
    fieldSize: 25 * 1024 * 1024
  }
}).array('uploadImages');

module.exports = { upload };
