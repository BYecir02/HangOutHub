import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseUrl = (process.env.SUPABASE_URL || '').replace(
    /\/+$/,
    '',
  );
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'hangouthub-media';

  private ensureConfigured() {
    const missing: string[] = [];

    if (!this.supabaseUrl) {
      missing.push('SUPABASE_URL');
    }

    if (!this.serviceRoleKey) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY');
    }

    if (!this.bucket) {
      missing.push('SUPABASE_STORAGE_BUCKET');
    }

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Supabase Storage n est pas configure (${missing.join(', ')}).`,
      );
    }
  }

  private buildObjectPath(folder: string, file: Express.Multer.File) {
    const extension = extname(file.originalname) || '.bin';
    return `${folder}/${Date.now()}-${randomUUID()}${extension}`;
  }

  private buildPublicUrl(objectPath: string) {
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${objectPath}`;
  }

  async uploadFile(folder: string, file: Express.Multer.File) {
    this.ensureConfigured();

    if (!file.buffer) {
      throw new InternalServerErrorException(
        'Le fichier upload n est pas disponible en memoire.',
      );
    }

    const objectPath = this.buildObjectPath(folder, file);
    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${objectPath}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey,
        'Content-Type': file.mimetype,
        'x-upsert': 'false',
      },
      body: new Uint8Array(file.buffer),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Echec upload Supabase (${response.status}): ${errorBody}`,
      );
      throw new InternalServerErrorException(
        'Impossible d envoyer le fichier vers Supabase Storage.',
      );
    }

    return this.buildPublicUrl(objectPath);
  }

  async uploadFiles(folder: string, files: Express.Multer.File[]) {
    return Promise.all(files.map((file) => this.uploadFile(folder, file)));
  }
}
