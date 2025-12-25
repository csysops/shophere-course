import { Injectable } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class UploadService {
  /**
   * Xóa file đã upload
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = join(process.cwd(), 'uploads', 'images', filename);
      await unlink(filePath);
    } catch (error) {
      // File không tồn tại hoặc đã bị xóa - không cần throw error
      console.warn(`Failed to delete file ${filename}:`, error);
    }
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSize: number, maxSize: number = 5 * 1024 * 1024): boolean {
    return fileSize <= maxSize;
  }

  /**
   * Validate file type
   */
  validateFileType(mimetype: string): boolean {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedMimes.includes(mimetype);
  }
}


