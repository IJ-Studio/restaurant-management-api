import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Readable } from 'stream';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(private config: ConfigService) {}

  private getAuth() {
    return new google.auth.JWT({
      email: this.config.get<string>('GOOGLE_CLIENT_EMAIL'),
      key: this.config.get<string>('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
  }

  async uploadFile(
    fileName: string,
    content: string,
  ): Promise<{ fileId: string; webViewLink: string }> {
    const auth = this.getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const folderId = this.config.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    const buffer = Buffer.from(content, 'utf-8');
    const stream = Readable.from(buffer);

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId!],
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    return {
      fileId: res.data.id!,
      webViewLink: res.data.webViewLink!,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    const auth = this.getAuth();
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId });
  }
}
