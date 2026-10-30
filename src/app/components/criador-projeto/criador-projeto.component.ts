import { Component, signal, effect, computed, OnDestroy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import * as Tone from 'tone';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';
import { Marker } from '../../models/marker';

export interface CanalAudio {
  id: string;
  nome: string;
  arquivo: string; 
  muted?: boolean;
  volume?: number;
}

export interface ProjectConfig {
  nomeProjeto: string;
  offset?: number;
  bpm: number;
  timeSignature: number;
  pastaBase: string;
  canais: CanalAudio[];
  markers?: Marker[];
  fullSong?: boolean;
}

interface InterfaceFormTrecho {
  nome: string;
  compassoInicio: number;
  compassosDuracao: number;
  maxPlays: number;
  nextMarker: string;
  referencia?: string;
  modoDisparo?: 'compasso' | 'bloco';
}

const computarId = (nome: string) => nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

@Component({
  selector: 'app-criador-projeto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule],
  templateUrl: './criador-projeto.component.html',
  styleUrls: ['./criador-projeto.component.scss']
})
export class CriadorProjetoComponent implements OnInit, OnDestroy {
  private fileRepository = inject(FileRepositoryService);
  bundleService = inject(BundleProjectService);
  statusImportacao = signal<string>('');
  // Dados Gerais do Projeto
  nomeProjeto = signal<string>('');
  pastaBase = signal<string>('');
  bpm = signal<number>(120);
  timeSignature = signal<number>(4);
  offset = signal<number>(0);
  fullSong = signal<boolean>(false);

  // Estado do Áudio Guia
  arquivoSelecionado = signal<File | null>(null);
  player: Tone.Player | null = null;
  isPlaying = signal<boolean>(false);
  posicaoAtual = signal<string>('0:0:0');
  
  // Sinais de Formulários Separados por Blocos Estilizados
  canais = signal<CanalAudio[]>([]);
  trechosForm = signal<InterfaceFormTrecho[]>([]);
  
  carregandoCanais = signal<boolean>(false);

  // 🎯 SINAIS DOS AUTOCOMPLETES
  pastasDisponiveis = signal<string[]>([]);
  arquivosDaPastaAtiva = signal<string[]>([]);

  compassoAbsoluto = computed(() => {
    const [bars] = this.posicaoAtual().split(':');
    return parseInt(bars, 10);
  });

  constructor() {
    effect(() => {
      Tone.Transport.bpm.value = this.bpm();
      Tone.Transport.timeSignature = this.timeSignature();
    });

    effect(async () => {
      const pasta = this.pastaBase();
      if (pasta && pasta.trim() !== '') {
        try {
          const files = await this.fileRepository.getFiles(pasta);
          // Mapeia extraindo apenas a propriedade string do nome do arquivo
          this.arquivosDaPastaAtiva.set(files.map(f => f.name || (f as any).arquivo || ''));
        } catch (error) {
          console.error('Erro ao ler arquivos da pasta base:', error);
          this.arquivosDaPastaAtiva.set([]);
        }
      } else {
        this.arquivosDaPastaAtiva.set([]);
      }
    });

    Tone.Transport.scheduleRepeat(() => {
      this.posicaoAtual.set(Tone.Transport.position.toString());
    }, '16n');
  }
  // Carrega as pastas do banco ao iniciar o componente
  async ngOnInit() {
    try {
      const pastas = await this.fileRepository.getDirectories();
      this.pastasDisponiveis.set(pastas);
    } catch (error) {
      console.error('Erro ao carregar diretórios do IndexedDB:', error);
    }
  }

  reordenarTrechos(event: CdkDragDrop<any[]>) {
    this.trechosForm.update(lista => {
      // Cria uma cópia mutável do array para o moveItemInArray trabalhar
      const novaLista = [...lista];
      moveItemInArray(novaLista, event.previousIndex, event.currentIndex);
      return novaLista;
    });
  }
  // Força atualização manual se o usuário selecionar a pasta pela lista suspensa do topo
  async aoMudarPastaBase() {
    const pasta = this.pastaBase();
    if (pasta) {
      const files = await this.fileRepository.getFiles(pasta);
      this.arquivosDaPastaAtiva.set(files.map(f => f.name || (f as any).arquivo || ''));
    }
  }

  importarProjeto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const arquivo = input.files[0];
    const nomeArquivo = arquivo.name.toLowerCase();

    console.log('Arquivo selecionado:', arquivo.name, 'MIME:', arquivo.type);

    if (nomeArquivo.endsWith('.zip')) {
      this.statusImportacao.set('Carregando arquivo de projeto ZIP...');
      this.bundleService.importarEInstalarZip(arquivo, this.statusImportacao);
    } else if (nomeArquivo.endsWith('.json')) {
      this.importarJsonProjeto(event);
    } else {
      alert(`O arquivo "${arquivo.name}" não é um .zip ou .json válido.`);
    }

    // Reseta o input para permitir selecionar novamente
    input.value = '';
  }

  importarJsonProjeto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const arquivoJson = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      let config: ProjectConfig;
      try {
        config = JSON.parse(e.target?.result as string) as ProjectConfig;
      } catch (err) {
        console.error('Erro ao processar o arquivo JSON de projeto:', err);
        alert('Formato de JSON inválido para ProjectConfig.');
        return;
      }

      // Prioriza o nome do JSON e usa o nome do arquivo quando ele estiver ausente.
      const nomeSemExtensao = arquivoJson.name
        .replace(/\.json(\s*\(\d+\))?$/i, '')
        .trim();

      const nomeFinal = config.nomeProjeto && config.nomeProjeto.trim() !== ''
        ? config.nomeProjeto
        : nomeSemExtensao;
      const canaisImportados = Array.isArray(config.canais)
        ? config.canais.map(canal => ({
          id: canal.id,
          nome: canal.nome,
          arquivo: canal.arquivo || '',
          muted: canal.muted ?? false,
          volume: canal.volume ?? 0,
        }))
        : [];
      const configImportada: ProjectConfig = {
        ...config,
        nomeProjeto: nomeFinal,
        pastaBase: config.pastaBase || '',
        bpm: config.bpm || 120,
        timeSignature: config.timeSignature || 4,
        offset: config.offset || 0,
        fullSong: !!config.fullSong,
        canais: canaisImportados,
      };

      this.nomeProjeto.set(nomeFinal);
      this.pastaBase.set(configImportada.pastaBase);
      this.bpm.set(configImportada.bpm);
      this.timeSignature.set(configImportada.timeSignature);
      this.offset.set((configImportada.offset || 0) * 1000);
      this.fullSong.set(!!configImportada.fullSong);
      this.canais.set(canaisImportados);

      if (configImportada.markers) {
        const trechosMapeados: InterfaceFormTrecho[] = configImportada.markers.map(marker => ({
          nome: marker.nome,
          compassoInicio: parseInt(marker.inicio ? marker.inicio.split('m')[0] : '0', 10) || 0,
          compassosDuracao: parseInt(marker.duracao ? marker.duracao.split('m')[0] : '4', 10) || 4,
          referencia: marker.referencia || '',
          maxPlays: marker.maxPlays || 0,
          nextMarker: marker.nextMarker || '',
          modoDisparo: marker.modoDisparo || 'bloco',
        }));
        this.trechosForm.set(trechosMapeados);
      } else {
        this.trechosForm.set([]);
      }

      this.aoMudarPastaBase();

      try {
        await this.fileRepository.saveProject(configImportada);
        this.statusImportacao.set('Projeto carregado e salvo no banco local.');
        setTimeout(() => this.statusImportacao.set(''), 3000);
      } catch (error) {
        console.error('Erro ao salvar o projeto importado:', error);
        this.statusImportacao.set('Projeto carregado, mas não foi possível salvar no banco local.');
      }
    };

    reader.readAsText(arquivoJson);
    input.value = '';
  }

  async baixarJsonProjeto() {
    const configResultado = this.construirProjetoConfig();

    // 🎯 Obtém o nome limpo do projeto. Se estiver vazio, usa 'projeto-config'
    const nomeProjetoAtual = this.nomeProjeto()?.trim();
    
    const nomeArquivoDownload = nomeProjetoAtual && nomeProjetoAtual !== ''
      ? nomeProjetoAtual.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : 'projeto-config';

    const blob = new Blob([JSON.stringify(configResultado, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeArquivoDownload}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // 🎯 Salva também no banco IndexedDB local
    await this.fileRepository.saveProject(configResultado);
  }

  async onAudioGuiaSelecionado(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.arquivoSelecionado.set(input.files[0]);
      if (this.player) this.player.dispose();

      const url = URL.createObjectURL(input.files[0]);
      this.player = new Tone.Player({
        url: url,
        autostart: false,
        onload: () => console.log('Áudio guia carregado!')
      }).toDestination();

      (this.player as any).onended = () => {
        Tone.Draw.schedule(() => this.pararPlayerCompleto(), Tone.now());
      };
    }
  }

  adicionarCanalEmBranco() {
    this.canais.update(lista => [
      ...lista,
      {
        id: `canal-${lista.length + 1}`,
        nome: `Canal ${lista.length + 1}`,
        arquivo: '',
        muted: false, // Garante o estado inicial mapeado
        volume: 0
      }
    ]);
  }

  // Método legado mantido caso queira injetar arquivo manual na hora
  async uploadAudioCanal(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (!this.pastaBase()) {
      alert('Por favor, defina a "Pasta Base" antes de subir arquivos de áudio.');
      input.value = '';
      return;
    }

    const arquivo = input.files[0];
    this.carregandoCanais.set(true);

    try {
      await this.fileRepository.saveFile(this.pastaBase(), arquivo.name, arquivo);
      
      this.canais.update(lista => {
        const novaLista = [...lista];
        novaLista[index] = { ...novaLista[index], arquivo: arquivo.name };
        return novaLista;
      });
    } catch (error) {
      console.error('Erro ao salvar mídia de canal:', error);
    } finally {
      this.carregandoCanais.set(false);
    }
  }

  removerCanal(index: number) {
    this.canais.update(lista => lista.filter((_, i) => i !== index));
  }

  togglePlay() {
    if (!this.player) return;
    if (this.isPlaying()) {
      this.pararPlayerCompleto();
    } else {
      Tone.start();
      Tone.Transport.start();
      this.player.start(undefined, Tone.Transport.seconds);
      this.isPlaying.set(true);
    }
  }

  pararPlayerCompleto() {
    Tone.Transport.pause();
    if (this.player) this.player.stop();
    this.isPlaying.set(false);
  }

  mudarPosicao(quantidadeCompassos: number) {
    const tempoAtualNaCabeca = Tone.Time(Tone.Transport.seconds).quantize('1m');

    // 2. Calcula o valor de um compasso em segundos
    const segundosPorCompasso = Tone.Time('1m').toSeconds();
    const deslocamentoSegundos = quantidadeCompassos * segundosPorCompasso;

    // 3. Soma o deslocamento a partir da cabeça do compasso encontrada
    let novoTempoEmSegundos = Math.max(0, tempoAtualNaCabeca + deslocamentoSegundos);

    // 4. Aplica ao Transport
    Tone.Transport.seconds = novoTempoEmSegundos;
    
    Tone.Transport.seconds = novoTempoEmSegundos;
    this.posicaoAtual.set(Tone.Transport.position.toString());

    if (this.isPlaying() && this.player) {
      this.player.stop();
      this.player.start(undefined, Tone.Transport.seconds);
    }
  }

  adicionarTrecho() {
    const compassoAtual = parseInt(Tone.Transport.position.toString().split(':')[0], 10);
    this.trechosForm.update(lista => [
      ...lista,
      {
        nome: `Marcador ${lista.length + 1}`,
        compassoInicio: compassoAtual,
        compassosDuracao: 4,
        maxPlays: 0,
        modoDisparo: 'bloco',
        nextMarker: ''
      }
    ]);
  }

  listarTrechos(): {id: string, nome: string}[] {
    return this.trechosForm().map(t => ({
      nome: t.nome, id: computarId(t.nome)
    }));
  }

  removerTrecho(index: number) {
    this.trechosForm.update(lista => lista.filter((_, i) => i !== index));
  }

  construirProjetoConfig(): ProjectConfig {
    const markersFormatados: Marker[] = this.trechosForm().map((t, index) => {
      const idGerado = computarId(t.nome) || `marker-${index}`;
      const idReferencia = t.referencia?.trim() !== '' ? t.referencia : undefined;
      return {
        id: idGerado,
        referencia: idReferencia,
        nome: t.nome,
        modoDisparo: t.modoDisparo || 'bloco',
        inicio: `${t.compassoInicio}m`,
        duracao: `${t.compassosDuracao}m`,
        ...(t.maxPlays > 0 ? { maxPlays: t.maxPlays } : {}),
        ...(t.nextMarker ? { nextMarker: t.nextMarker.toLowerCase().replace(/\s+/g, '-') } : {})
      };
    });

    return {
      nomeProjeto: this.nomeProjeto() || 'Sem Nome',
      bpm: this.bpm(),
      timeSignature: parseInt(this.timeSignature().toString(), 10) || 4,
      pastaBase: this.pastaBase(),
      offset: this.offset() / 1000,
      fullSong: this.fullSong(),
      canais: this.canais(), 
      markers: markersFormatados
    };
  }

  exportarProjetoCompleto() {
    const configResultado = this.construirProjetoConfig();
    const nomesAudios = this.canais().map(c => `${c.arquivo}`);
    this.bundleService.exportarParaZip(configResultado, nomesAudios);
  }

  ngOnDestroy() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (this.player) this.player.dispose();
  }
}