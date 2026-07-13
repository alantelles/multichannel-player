import { FileRepositoryService } from './file-repository.service';
import { inject, Injectable } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver'; // Opcional: biblioteca leve para disparar o download
import { ProjectConfig } from './audio-engine.service';

export interface BundleProject {
  projetoJson: any;
  nomesArquivos: string[];
}

@Injectable({ providedIn: 'root' })
export class BundleProjectService {

  fileRepository = inject(FileRepositoryService);

  async carregarProjetoZip(zipFile: File): Promise<any> {
    const zip = await JSZip.loadAsync(zipFile);
    const jsonFileName = Object.keys(zip.files).find(name => name.endsWith('.json'));
    if (!jsonFileName) {
      throw new Error('Arquivo JSON de configuração não encontrado no ZIP.');
    }
    const jsonContent = await zip.file(jsonFileName)?.async('string');
    if (!jsonContent) {
      throw new Error('Erro ao ler o conteúdo do arquivo JSON.');
    }
    return JSON.parse(jsonContent);
  }

  async exportarParaZip(projetoJson: ProjectConfig, nomesArquivos: string[]) {
    const zip = new JSZip();
    zip.file(`${projetoJson.pastaBase || 'projeto'}.json`, JSON.stringify(projetoJson, null, 2));
    const audioFolder = zip.folder('audios');
    const arquivos = await this.fileRepository.getFiles(projetoJson.pastaBase);
    for (const arquivo of arquivos) {
      try {        
        audioFolder?.file(arquivo.name, arquivo.content);
      } catch (error) {
        console.error(`Erro ao empacotar o áudio ${arquivo.name}:`, error);
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${projetoJson.pastaBase || 'projeto'}.zip`);
  }
}