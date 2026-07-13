import { FileRepositoryService } from './file-repository.service';
import { inject, Injectable } from '@angular/core';
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

  async importarEInstalarZip(arquivoZip: File) {
    const zip = new JSZip();
    const conteudo = await zip.loadAsync(arquivoZip);
    
    // 1. Achar e ler o JSON original do ZIP
    const arquivoJson = Object.keys(conteudo.files).find(nome => nome.endsWith('.json'));
    if (!arquivoJson) throw new Error("JSON não encontrado no ZIP");
    
    const jsonTexto = await conteudo.files[arquivoJson].async('string');
    const projetoOriginal: ProjectConfig = JSON.parse(jsonTexto);

    // 2. 🔥 A MÁGICA: Criar uma pasta base única usando a data/hora atual
    // Exemplo: "i-couldnt-love-you-more-20260713-0930"
    const sufixoUnico = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
    const novaPastaBase = `${projetoOriginal.pastaBase || 'projeto'}-${sufixoUnico}`;

    // 3. Modificar o objeto JSON na memória com a nova rota
    const projetoModificado: ProjectConfig = {
      ...projetoOriginal,
      pastaBase: novaPastaBase // Agora ele aponta para o diretório exclusivo
    };

    // 4. Salvar os áudios no IndexedDB usando a nova pasta base exclusiva
    const arquivosAudio = Object.keys(conteudo.files).filter(nome => nome.startsWith('audios/') && !conteudo.files[nome].dir);

    for (const caminhoCompleto of arquivosAudio) {
      const nomeArquivo = caminhoCompleto.replace('audios/', '');
      const blob = await conteudo.files[caminhoCompleto].async('blob');
      
      // Converte o blob em File se o seu repositório exigir, ou salva o blob direto
      const arquivoParaSalvar = new File([blob], nomeArquivo, { type: blob.type });

      // Salva no banco vinculando à nova pastaBase única
      await this.fileRepository.saveFile(novaPastaBase, nomeArquivo, arquivoParaSalvar);
    }

    // 5. 🔥 DEVOLVER O DOWNLOAD: Entrega o novo JSON leve e atualizado para o usuário guardar
    this.devolverJsonModificado(projetoModificado);
  }

  private devolverJsonModificado(projeto: ProjectConfig) {
    const blob = new Blob([JSON.stringify(projeto, null, 2)], { type: 'application/json' });
    // Usa o seu saveAs para baixar o arquivo
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
    saveAs(content, `${projetoJson.pastaBase || 'projeto'}.zip`);
  }
}