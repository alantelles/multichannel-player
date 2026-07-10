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
    
    // 1. Adiciona o JSON do projeto na raiz do ZIP
    zip.file(`${projetoJson.pastaBase || 'projeto'}.json`, JSON.stringify(projetoJson, null, 2));

    // 2. Cria uma pasta interna para os áudios
    const audioFolder = zip.folder('audios');

    // 3. Loop para baixar cada áudio e injetar no ZIP
    for (const nomeArquivo of nomesArquivos) {      
      try {
        // Faz o fetch do áudio local/online como um Blob binário
        const fetched = await this.fileRepository.getFileUrl(projetoJson.pastaBase, nomeArquivo);        
        const response = await fetch(fetched.url);
        const blob = await response.blob();
        
        // Adiciona o binário dentro da pasta 'audios/' do ZIP
        audioFolder?.file(nomeArquivo, blob);
      } catch (error) {
        console.error(`Erro ao empacotar o áudio ${nomeArquivo}:`, error);
      }
    }

    // 4. Gera o arquivo ZIP final e dispara o download no navegador
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${projetoJson.pastaBase || 'projeto'}.zip`);
  }
}