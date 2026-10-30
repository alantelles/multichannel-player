import { inject, Injectable, Service, signal } from '@angular/core';
import { DbService, FileItem } from './db.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SavedProject } from './db.service';
import { ProjectConfig } from './audio-engine.service';

export interface FileRetrievalResult {
  url: string;
  fromCache: boolean;
}

@Injectable({providedIn: 'root'})
export class FileRepositoryService {
  private db = inject(DbService);

  onlineRepositoryUrl = signal<string>('audios/'); // URL base para repositório online
  http = inject(HttpClient);
  async saveProject(config: ProjectConfig): Promise<ProjectConfig> {
    return this.db.transaction('rw', this.db.projects, async () => {
      const nomeOriginal = config.nomeProjeto?.trim() || 'Sem Nome';
      const projetos = await this.db.projects.toArray();
      const nomesExistentes = new Set(projetos.map(projeto => projeto.nomeProjeto.toLocaleLowerCase()));
      let nomeProjeto = nomeOriginal;

      if (nomesExistentes.has(nomeOriginal.toLocaleLowerCase())) {
        const correspondenciaVersao = nomeOriginal.match(/^(.*?)\s+v(\d+)$/i);
        const nomeBase = correspondenciaVersao?.[1]?.trim() || nomeOriginal;
        const nomeBaseLower = nomeBase.toLocaleLowerCase();
        let maiorVersao = 1;

        for (const nomeExistente of nomesExistentes) {
          if (nomeExistente === nomeBaseLower) {
            maiorVersao = Math.max(maiorVersao, 1);
            continue;
          }

          const versao = nomeExistente.match(/^(.*?)\s+v(\d+)$/i);
          if (versao?.[1].trim() === nomeBaseLower) {
            maiorVersao = Math.max(maiorVersao, Number(versao[2]));
          }
        }

        nomeProjeto = `${nomeBase} v${maiorVersao + 1}`;
      }

      const configSalva: ProjectConfig = { ...config, nomeProjeto };
      const item: SavedProject = {
        nomeProjeto,
        pastaBase: configSalva.pastaBase,
        dataModificacao: new Date(),
        config: configSalva,
      };

      await this.db.projects.add(item);
      return configSalva;
    });
  }

  async getProjects(filtro: string = ''): Promise<SavedProject[]> {
    if (!filtro || filtro.trim() === '') {
      return await this.db.projects.orderBy('nomeProjeto').toArray();
    }

    const termoLower = filtro.toLowerCase();
    return await this.db.projects
      .filter(p => 
        p.nomeProjeto.toLowerCase().includes(termoLower) || 
        p.pastaBase.toLowerCase().includes(termoLower)
      )
      .toArray();
  }

async deleteProject(id: number): Promise<void> {
  await this.db.projects.delete(id);
}
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

  async getDirectories(): Promise<string[]> {
    const directories = await this.db.files
      .orderBy('directory')
      .uniqueKeys();
    return directories.map(dir => dir.toString());
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
