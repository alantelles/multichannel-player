import { FileRepositoryService } from './file-repository.service';
import { inject, Injectable, WritableSignal } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver'; 
import { ProjectConfig } from './audio-engine.service';

export interface BundleProject {
  projetoJson: any;
  nomesArquivos: string[];
}

@Injectable({ providedIn: 'root' })
export class BundleProjectService {
  
  fileRepository = inject(FileRepositoryService);

  async importarEInstalarZip(arquivoZip: File, sinal: WritableSignal<string>) {
    const zip = new JSZip();
    const conteudo = await zip.loadAsync(arquivoZip);
    const arquivoJson = Object.keys(conteudo.files).find(nome => nome.endsWith('.json'));
    if (!arquivoJson) {
      sinal.set('Erro: JSON não encontrado no ZIP');
      throw new Error('JSON não encontrado no ZIP');
    };
    sinal.set(`Importando ${arquivoJson}...`);
    const jsonTexto = await conteudo.files[arquivoJson].async('string');
    const projetoOriginal: ProjectConfig = JSON.parse(jsonTexto);    
    
    const sufixoUnico = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
    const novaPastaBase = `${projetoOriginal.pastaBase || 'projeto'}-${sufixoUnico}`;    
    const projetoModificado: ProjectConfig = {
      ...projetoOriginal,
      pastaBase: novaPastaBase 
    };
    const arquivosAudio = Object.keys(conteudo.files).filter(nome => nome.startsWith('audios/') && !conteudo.files[nome].dir);    
    for (const caminhoCompleto of arquivosAudio) {
      sinal.set(`Importando ${caminhoCompleto}...`);
      const nomeArquivo = caminhoCompleto.replace('audios/', '');
      const blob = await conteudo.files[caminhoCompleto].async('blob');
      const arquivoParaSalvar = new File([blob], nomeArquivo, { type: blob.type });      
      await this.fileRepository.saveFile(novaPastaBase, nomeArquivo, arquivoParaSalvar);
    }
    sinal.set('Projeto importado com sucesso!');
    setTimeout(() => sinal.set(''), 2000);
    this.devolverJsonModificado(projetoModificado);
  }

  private devolverJsonModificado(projeto: ProjectConfig) {
    const blob = new Blob([JSON.stringify(projeto, null, 2)], { type: 'application/json' });    
    saveAs(blob, `${projeto.pastaBase}.json`);
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
    saveAs(content, `${projetoJson.nomeProjeto || 'projeto'}.zip`);
  }
}