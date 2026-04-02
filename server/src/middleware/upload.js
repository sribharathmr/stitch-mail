const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isServerless = !!process.env.VERCEL;

// In serverless (Vercel), use memory storage since there's no persistent filesystem
// In local dev, use disk storage
let storage;

if (isServerless) {
  storage = multer.memoryStorage();
} else {
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    }
  });
}

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/', 'application/pdf', 'application/msword',
    'application/vnd.', 'text/', 'application/zip',
    'application/octet-stream'
  ];
  const ok = allowed.some(t => file.mimetype.startsWith(t));
  cb(null, ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

module.exports = upload;
