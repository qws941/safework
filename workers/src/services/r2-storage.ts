/**
 * R2 Object Storage Service
 * Cloudflare-native file storage for Excel files, exports, and documents
 */

export interface FileMetadata {
  filename: string;
  contentType: string;
  size: number;
  uploadedBy?: string;
  uploadedAt: string;
  formType?: string;
  surveyId?: number;
  category: 'excel' | 'export' | 'document' | 'attachment';
}

export class R2StorageService {
  constructor(private bucket: R2Bucket) {}

  /**
   * Upload file to R2
   */
  async uploadFile(
    key: string,
    file: ReadableStream | ArrayBuffer | string,
    metadata: FileMetadata
  ): Promise<{ success: boolean; key: string; url?: string }> {
    try {
      await this.bucket.put(key, file, {
        httpMetadata: {
          contentType: metadata.contentType,
        },
        customMetadata: {
          filename: metadata.filename,
          uploadedAt: metadata.uploadedAt,
          category: metadata.category,
          ...(metadata.uploadedBy && { uploadedBy: metadata.uploadedBy }),
          ...(metadata.formType && { formType: metadata.formType }),
          ...(metadata.surveyId && { surveyId: metadata.surveyId.toString() }),
        },
      });

      return {
        success: true,
        key,
        url: `/api/files/${key}`,
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      return { success: false, key };
    }
  }

  /**
   * Download file from R2
   */
  async downloadFile(key: string): Promise<R2ObjectBody | null> {
    try {
      const object = await this.bucket.get(key);
      return object;
    } catch (error) {
      console.error('R2 download error:', error);
      return null;
    }
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.bucket.delete(key);
      return true;
    } catch (error) {
      console.error('R2 delete error:', error);
      return false;
    }
  }

  /**
   * List files by prefix
   */
  async listFiles(prefix: string, limit = 100): Promise<R2Objects> {
    try {
      const objects = await this.bucket.list({
        prefix,
        limit,
      });
      return objects;
    } catch (error) {
      console.error('R2 list error:', error);
      return { objects: [], truncated: false, delimitedPrefixes: [] };
    }
  }

  /**
   * Generate Excel export and store in R2
   */
  async exportSurveyToExcel(
    formType: string,
    data: any[],
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Promise<{ success: boolean; key?: string; url?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `export_${formType}_${timestamp}.${format}`;
      const key = `exports/${formType}/${filename}`;

      // Convert data to CSV (simple implementation)
      let content: string;
      if (format === 'csv') {
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        content = [headers, ...rows].join('\n');
      } else {
        // For XLSX, we'd need a proper library - for now, use CSV
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        content = [headers, ...rows].join('\n');
      }

      const metadata: FileMetadata = {
        filename,
        contentType: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: content.length,
        uploadedAt: new Date().toISOString(),
        formType,
        category: 'export',
      };

      return await this.uploadFile(key, content, metadata);
    } catch (error) {
      console.error('Export to Excel error:', error);
      return { success: false };
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const object = await this.bucket.head(key);
      if (!object) return null;

      return {
        filename: object.customMetadata?.filename || key,
        contentType: object.httpMetadata?.contentType || 'application/octet-stream',
        size: object.size,
        uploadedBy: object.customMetadata?.uploadedBy,
        uploadedAt: object.customMetadata?.uploadedAt || object.uploaded.toISOString(),
        formType: object.customMetadata?.formType,
        surveyId: object.customMetadata?.surveyId ? parseInt(object.customMetadata.surveyId) : undefined,
        category: (object.customMetadata?.category as FileMetadata['category']) || 'document',
      };
    } catch (error) {
      console.error('R2 metadata error:', error);
      return null;
    }
  }
}
