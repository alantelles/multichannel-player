// db.service.ts
import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { ProjectConfig } from './audio-engine.service'; // ou do seu model

export interface FileItem {
  id?: number;
  directory: string;
  name: string;
  content: File;
}

export interface SavedProject {
  id?: number;
  nomeProjeto: string;
  pastaBase: string;
  dataModificacao?: Date;
  config: ProjectConfig;
}

@Injectable({
  providedIn: 'root',
})
export class DbService extends Dexie {
  files!: Table<FileItem, number>;
  projects!: Table<SavedProject, number>;

  constructor() {
    super('VirtualMultiPlayer');
    
    // Incrementamos a versão para incluir a nova store de projetos
    this.version(1).stores({
      files: '++id, directory, name, [directory+name]'
    });

    this.version(2).stores({
      files: '++id, directory, name, [directory+name]',
      projects: '++id, &nomeProjeto, pastaBase' // &nomeProjeto garante nome único
    });
  }
}