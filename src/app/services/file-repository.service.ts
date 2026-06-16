import { inject, Injectable, Service, signal } from '@angular/core';
import { DbService, FileItem } from './db.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface FileRetrievalResult {
  url: string;
  fromCache: boolean;
}

@Injectable({providedIn: 'root'})
export class FileRepositoryService {
  private db = inject(DbService);

  onlineRepositoryUrl = signal<string>('audios/'); // URL base para repositório online
  http = inject(HttpClient);

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
    await this.db.files.put({
      directory, name, content
    })
  }

  async getFiles(directory: string): Promise<FileItem[]> {
    return await this.db.files
      .where('directory')
      .equals(directory)
      .toArray();
  }

  async getFileUrl(directory: string, name: string): Promise<FileRetrievalResult> {
    const item = await this.db.files
      .where('[directory+name]')
      .equals([directory, name])
      .first();
      
    if (item) {
      return {
        url: URL.createObjectURL(item.content),
        fromCache: true
      };
    } else {
      const fileContent = await firstValueFrom(this.http.get(`${this.onlineRepositoryUrl()}${directory}/${name}`, { responseType: 'blob' }));
      this.saveFile(directory, name, new File([fileContent], name));
      return {
        url: URL.createObjectURL(fileContent),
        fromCache: false
      };
    }
  }

}
