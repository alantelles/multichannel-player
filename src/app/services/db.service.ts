import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface FileItem {
  id?: number;
  directory: string;
  name: string;
  content: File;
}

@Injectable({
  providedIn: 'root',
})
export class DbService extends Dexie {

  files!: Table<FileItem, number>;

  constructor() {
    super('VirtualMultiPlayer');
    
    this.version(1).stores({
      files: '++id, directory, name, [directory+name]' // Indexamos nomePasta para buscas rápidas
    });
  }

}
