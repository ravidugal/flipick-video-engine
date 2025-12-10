import express from 'express';
import multer from 'multer';
import pdfController from '../controllers/pdf.controller';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

router.post(
  '/generate-video',
  upload.single('pdf'),
  pdfController.generateVideoFromPDF
);

export default router;
