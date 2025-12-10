import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';
import { config } from '../config/env';

interface PDFUploadResult {
  gcsPath: string;
  signedUrl: string;
  filename: string;
  size: number;
  pages: number;
}

export class PDFUploadService {
  private storage: Storage;
  private bucket: any;

  constructor() {
    this.storage = new Storage({
      projectId: config.gcpProjectId,
      keyFilename: config.gcpKeyFile
    });
    
    this.bucket = this.storage.bucket(config.gcpBucket || 'flipick-pdf-uploads');
  }

  async uploadPDF(file: Buffer, tenantId: string, userId: string): Promise<PDFUploadResult> {
    console.log(`📄 Uploading PDF for tenant: ${tenantId}, user: ${userId}`);
    
    const validation = await this.validatePDF(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const filename = `${tenantId}/${userId}/${timestamp}-${hash}.pdf`;

    console.log(`→ GCS path: ${filename}`);

    const blob = this.bucket.file(filename);
    
    await blob.save(file, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          tenantId,
          userId,
          uploadedAt: new Date().toISOString(),
          originalSize: file.length
        }
      }
    });

    console.log('✅ PDF uploaded to GCS');

    const [url] = await blob.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    return {
      gcsPath: filename,
      signedUrl: url,
      filename: filename.split('/').pop() || 'document.pdf',
      size: file.length,
      pages: validation.pageCount
    };
  }

  private async validatePDF(file: Buffer): Promise<{ valid: boolean; error?: string; pageCount: number }> {
    const sizeMB = file.length / 1024 / 1024;
    if (sizeMB > 10) {
      return {
        valid: false,
        error: `PDF too large: ${sizeMB.toFixed(2)}MB (max 10MB)`,
        pageCount: 0
      };
    }

    const signature = file.slice(0, 5).toString();
    if (signature !== '%PDF-') {
      return {
        valid: false,
        error: 'Invalid PDF file',
        pageCount: 0
      };
    }

    const pdfText = file.toString('latin1');
    const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
    const pageCount = pageMatches ? pageMatches.length : 1;

    if (pageCount > 50) {
      return {
        valid: false,
        error: `PDF has ${pageCount} pages (max 50 pages)`,
        pageCount
      };
    }

    console.log(`✅ PDF validated: ${sizeMB.toFixed(2)}MB, ${pageCount} pages`);

    return {
      valid: true,
      pageCount
    };
  }
}

export default new PDFUploadService();
