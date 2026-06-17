import { Component, signal, effect, computed, OnDestroy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import * as Tone from 'tone';
import { FileRepositoryService } from '../../services/file-repository.service';

export interface Marker {
  id: string;
  nome: string;
  inicio: string;   
  duracao: string;
  maxPlays?: number;
  nextMarker?: string;
  loopStart?: string;
}

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
}

@Component({
  selector: 'app-criador-projeto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './criador-projeto.component.html',
  styleUrls: ['./criador-projeto.component.scss']
})
export class CriadorProjetoComponent implements OnInit, OnDestroy {
  private fileRepository = inject(FileRepositoryService);

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
    return parseInt(bars, 10) + 1;
  });

  constructor() {
    effect(() => {
      Tone.Transport.bpm.value = this.bpm();
      Tone.Transport.timeSignature = this.timeSignature();
    });

    // 🎯 Efeito reativo: Sempre que o usuário escolher ou digitar uma Pasta Base válida,
    // o sistema varre o IndexedDB e traz os arquivos de áudio disponíveis para o autocomplete dos canais.
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

  // Força atualização manual se o usuário selecionar a pasta pela lista suspensa do topo
  async aoMudarPastaBase() {
    const pasta = this.pastaBase();
    if (pasta) {
      const files = await this.fileRepository.getFiles(pasta);
      this.arquivosDaPastaAtiva.set(files.map(f => f.name || (f as any).arquivo || ''));
    }
  }

  importarJsonProjeto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const arquivoJson = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const config: ProjectConfig = JSON.parse(e.target?.result as string);

        this.nomeProjeto.set(config.nomeProjeto || '');
        this.pastaBase.set(config.pastaBase || '');
        this.bpm.set(config.bpm || 120);
        this.timeSignature.set(config.timeSignature || 4);
        this.offset.set(config.offset || 0);
        this.fullSong.set(!!config.fullSong);

        if (config.canais && Array.isArray(config.canais)) {
          this.canais.set(config.canais.map(c => ({
            id: c.id,
            nome: c.nome,
            arquivo: c.arquivo || '',
            muted: c.muted ?? false,
            volume: c.volume ?? 0
          })));
        }

        if (config.markers && Array.isArray(config.markers)) {
          const trechosMapeados: InterfaceFormTrecho[] = config.markers.map(m => {
            const compassoInicio = parseInt(m.inicio.split(':')[0], 10) || 0;
            const compassosDuracao = parseInt(m.duracao.split(':')[0], 10) || 4;
            return {
              nome: m.nome,
              compassoInicio: compassoInicio,
              compassosDuracao: compassosDuracao,
              maxPlays: m.maxPlays || 0,
              nextMarker: m.nextMarker || ''
            };
          });
          this.trechosForm.set(trechosMapeados);
        }

        console.log('Projeto importado com sucesso!');
      } catch (err) {
        console.error('Erro ao processar o arquivo JSON de projeto:', err);
        alert('Formato de JSON inválido para ProjectConfig.');
      }
    };

    reader.readAsText(arquivoJson);
    input.value = '';
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
    const segundosPorCompasso = Tone.Time('1m').toSeconds();
    const deslocamentoSegundos = quantidadeCompassos * segundosPorCompasso;
    let novoTempoEmSegundos = Math.max(0, Tone.Transport.seconds + deslocamentoSegundos);
    
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
        nome: `Seção ${lista.length + 1}`,
        compassoInicio: compassoAtual,
        compassosDuracao: 4,
        maxPlays: 0,
        nextMarker: ''
      }
    ]);
  }

  removerTrecho(index: number) {
    this.trechosForm.update(lista => lista.filter((_, i) => i !== index));
  }

  baixarJsonProjeto() {
    const markersFormatados: Marker[] = this.trechosForm().map((t, index) => {
      const idGerado = t.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `marker-${index}`;
      return {
        id: idGerado,
        nome: t.nome,
        inicio: `${t.compassoInicio}m`,
        duracao: `${t.compassosDuracao}m`,
        ...(t.maxPlays > 0 ? { maxPlays: t.maxPlays } : {}),
        ...(t.nextMarker ? { nextMarker: t.nextMarker.toLowerCase().replace(/\s+/g, '-') } : {})
      };
    });

    const configResultado: ProjectConfig = {
      nomeProjeto: this.nomeProjeto(),
      bpm: this.bpm(),
      timeSignature: this.timeSignature(),
      pastaBase: this.pastaBase(),
      offset: this.offset(),
      fullSong: this.fullSong(),
      canais: this.canais(), 
      markers: markersFormatados
    };

    const blob = new Blob([JSON.stringify(configResultado, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.pastaBase() || 'config-projeto'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  ngOnDestroy() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (this.player) this.player.dispose();
  }
}