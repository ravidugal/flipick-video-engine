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

/**
 * POST /api/pdf/upload
 * Upload PDF to GCS and save metadata (no video generation)
 */
router.post(
  '/upload',
  upload.single('pdf'),
  pdfController.uploadPDF
);

/**
 * POST /api/pdf/extract-topics
 * Extract topics from already-uploaded PDF
 */
router.post('/extract-topics', pdfController.extractTopics);

/**
 * POST /api/pdf/generate-video-from-topics
 * Generate video from PDF using provided topics
 */
router.post('/generate-video-from-topics', pdfController.generateVideoFromTopics);

/**
 * POST /api/pdf/generate-video
 * Upload PDF and generate complete video (legacy endpoint)
 */
router.post(
  '/generate-video',
  upload.single('pdf'),
  pdfController.generateVideoFromPDF
);

export default router;
