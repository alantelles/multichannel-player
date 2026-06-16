import { inject, Injectable, Service, signal } from '@angular/core';
import { DbService, FileItem } from './db.service';

@Injectable({providedIn: 'root'})
export class FileRepositoryService {
  private db = inject(DbService);

  onlineRepositoryUrl = signal<string>('audios/'); // URL base para repositório online

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

  async getFileUrl(directory: string, name: string): Promise<string> {
    const item = await this.db.files
      .where('[directory+name]')
      .equals([directory, name])
      .first();
      
    if (item) {
      console.log(`Arquivo encontrado no IndexedDB: ${directory}/${name}`);
      return URL.createObjectURL(item.content);
    } else {
      return `${this.onlineRepositoryUrl()}${directory}/${name}`;
    }
  }

}
