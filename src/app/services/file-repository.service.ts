import { inject, Injectable, Service } from '@angular/core';
import { DbService, FileItem } from './db.service';

@Injectable({providedIn: 'root'})
export class FileRepositoryService {
  db = inject(DbService);

  async saveFiles(directory: string, files: File[]) {
    for (const file of files) {
      await this.db.files.add({
        directory,
        name: file.name,
        content: file
      });
    }
  }
  async saveFile(directory: string, name: string, content: File) {
    await this.db.files.add({
      directory, name, content
    })
  }

  async getFiles(directory: string): Promise<FileItem[]> {
    return await this.db.files
      .where('directory')
      .equals(directory)
      .toArray();
  }

}
