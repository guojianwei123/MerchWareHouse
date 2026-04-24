import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

export class StorageAdapter {
  constructor(
    private readonly uploadDir = process.env.UPLOAD_DIR ?? './uploads',
    private readonly publicBaseUrl = process.env.PUBLIC_UPLOAD_BASE_URL ?? '/uploads',
  ) {}

  async uploadImage(fileBuffer: Buffer, originalName = 'image.jpg'): Promise<string> {
    await mkdir(this.uploadDir, { recursive: true });

    const extension = extname(originalName) || '.jpg';
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(this.uploadDir, filename), fileBuffer);

    return `${this.publicBaseUrl.replace(/\/$/, '')}/${filename}`;
  }
}
