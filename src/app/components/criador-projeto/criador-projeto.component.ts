import { Component, signal, effect, computed, OnDestroy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import * as Tone from 'tone';
import { FileRepositoryService } from '../../services/file-repository.service';
import { SavedProject } from '../../services/db.service';
import { BundleProjectService } from '../../services/bundle-project.service';
import { Marker } from '../../models/marker';
import { ProjectNavigationService } from '../../services/project-navigation.service';
import { NotificacaoService } from '../../services/notificacao.service';
import {
  SelecionarProjetoDialogComponent,
  SelecionarProjetoDialogResult,
} from '../selecionar-projeto-dialog/selecionar-projeto-dialog.component';

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
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule, MatDialogModule],
  templateUrl: './criador-projeto.component.html',
  styleUrls: ['./criador-projeto.component.scss']
})
export class CriadorProjetoComponent implements OnInit, OnDestroy {
  private fileRepository = inject(FileRepositoryService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private projectNavigation = inject(ProjectNavigationService);
  private readonly notificacao = inject(NotificacaoService);
  bundleService = inject(BundleProjectService);
  statusImportacao = signal<string>('');
  private projetoEmEdicaoId: number | null = null;
  // Dados Gerais do Projeto
  nomeProjeto = signal<string>('');
  pastaBase = signal<string>('');
  bpm = signal<number>(120);
  timeSignature = signal<number>(4);
  offset = signal<number>(0);
  fullSong = signal<boolean>(false);

  private mixPlayers: Tone.Player[] = [];
  private audioUrls: string[] = [];
  isPlaying = signal<boolean>(false);
  carregandoPreview = signal<boolean>(false);
  statusPreview = signal<string>('');
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

    const projeto = history.state?.['projeto'] as SavedProject | undefined;
    if (projeto) {
      this.preencherFormulario(projeto.config, projeto.id ?? null);
      this.statusImportacao.set(`Editando ${projeto.nomeProjeto}`);
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

  moverTrecho(index: number, deslocamento: -1 | 1, event?: Event) {
    let moveu = false;
    this.trechosForm.update(lista => {
      const novoIndex = index + deslocamento;
      if (index < 0 || index >= lista.length || novoIndex < 0 || novoIndex >= lista.length) {
        return lista;
      }

      const novaLista = [...lista];
      moveItemInArray(novaLista, index, novoIndex);
      moveu = true;
      return novaLista;
    });

    const elemento = event?.currentTarget as HTMLElement | null;
    const itemMovido = elemento?.closest('.item-trecho');
    if (moveu && itemMovido) {
      requestAnimationFrame(() => {
        if (itemMovido.isConnected) {
          itemMovido.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  }

  abrirSeletorProjetos() {
    const dialogRef = this.dialog.open(SelecionarProjetoDialogComponent, {
      width: '90%',
      maxWidth: '680px',
      data: { origem: 'criador' },
      autoFocus: window.matchMedia('(max-width: 600px)').matches
        ? '.dialog-header h2'
        : 'input[type="search"]',
    });

    dialogRef.afterClosed().subscribe((resultado: SelecionarProjetoDialogResult | undefined) => {
      if (!resultado) return;

      if (resultado.acao === 'editar') {
        this.preencherFormulario(resultado.projeto.config, resultado.projeto.id ?? null);
        this.statusImportacao.set(`Editando ${resultado.projeto.nomeProjeto}`);
        return;
      }

      this.projectNavigation.queueProject(resultado.config);
      void this.router.navigateByUrl('/');
    });
  }

  private preencherFormulario(config: ProjectConfig, projetoId: number | null = null) {
    this.projetoEmEdicaoId = projetoId;
    this.nomeProjeto.set(config.nomeProjeto || '');
    this.pastaBase.set(config.pastaBase || '');
    this.bpm.set(config.bpm || 120);
    this.timeSignature.set(config.timeSignature || 4);
    this.offset.set((config.offset || 0) * 1000);
    this.fullSong.set(!!config.fullSong);

    const canaisImportados = Array.isArray(config.canais)
      ? config.canais.map(canal => ({
        id: canal.id,
        nome: canal.nome,
        arquivo: canal.arquivo || '',
        muted: canal.muted ?? false,
        volume: canal.volume ?? 0,
      }))
      : [];
    this.canais.set(canaisImportados);

    const trechosMapeados: InterfaceFormTrecho[] = (config.markers || []).map(marker => ({
      nome: marker.nome,
      compassoInicio: parseInt(marker.inicio ? marker.inicio.split('m')[0] : '0', 10) || 0,
      compassosDuracao: parseInt(marker.duracao ? marker.duracao.split('m')[0] : '4', 10) || 4,
      referencia: marker.referencia || '',
      maxPlays: marker.maxPlays || 0,
      nextMarker: marker.nextMarker || '',
      modoDisparo: marker.modoDisparo || 'bloco',
    }));
    this.trechosForm.set(trechosMapeados);
    void this.aoMudarPastaBase();
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
      void this.bundleService.importarEInstalarZip(arquivo, this.statusImportacao)
        .then(() => this.notificacao.sucesso('Projeto ZIP importado e salvo no banco local.'))
        .catch(error => {
          console.error('Erro ao importar projeto ZIP:', error);
          this.statusImportacao.set('Não foi possível importar o ZIP. Verifique se o arquivo contém um projeto válido.');
          this.notificacao.erro('Não foi possível importar o projeto ZIP.');
        });
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
        this.notificacao.erro('O arquivo JSON do projeto é inválido.');
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
        const resultado = await this.fileRepository.saveProject(configImportada);
        this.projetoEmEdicaoId = resultado.id;
        this.nomeProjeto.set(resultado.config.nomeProjeto);
        this.statusImportacao.set('Projeto carregado e salvo no banco local.');
        this.notificacao.sucesso(`Projeto "${nomeFinal}" importado e salvo.`);
        setTimeout(() => this.statusImportacao.set(''), 3000);
      } catch (error) {
        console.error('Erro ao salvar o projeto importado:', error);
        this.statusImportacao.set('Projeto carregado, mas não foi possível salvar no banco local.');
        this.notificacao.erro('O projeto foi carregado, mas não pôde ser salvo no banco local.');
      }
    };

    reader.readAsText(arquivoJson);
    input.value = '';
  }

  async baixarJsonProjeto() {
    const resultado = await this.fileRepository.saveProject(this.construirProjetoConfig(), this.projetoEmEdicaoId ?? undefined);
    this.projetoEmEdicaoId = resultado.id;
    const configResultado = resultado.config;
    this.nomeProjeto.set(configResultado.nomeProjeto);

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
  }

  async salvarProjeto() {
    try {
      const resultado = await this.fileRepository.saveProject(
        this.construirProjetoConfig(),
        this.projetoEmEdicaoId ?? undefined,
      );
      this.projetoEmEdicaoId = resultado.id;
      this.nomeProjeto.set(resultado.config.nomeProjeto);
      this.statusImportacao.set('Projeto salvo no banco local.');
      this.notificacao.sucesso(`Projeto "${resultado.config.nomeProjeto}" salvo no banco local.`);
      setTimeout(() => this.statusImportacao.set(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar o projeto:', error);
      this.statusImportacao.set('Não foi possível salvar o projeto no banco local.');
      this.notificacao.erro('Não foi possível salvar o projeto no banco local.');
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

  async baixarAudioCanal(canal: CanalAudio) {
    const pasta = this.pastaBase().trim();
    const nomeArquivo = canal.arquivo.trim();

    if (!pasta || !nomeArquivo) {
      this.statusImportacao.set('Defina a pasta base e o arquivo de áudio do canal antes de baixar.');
      return;
    }

    try {
      const resultado = await this.fileRepository.getFileUrl(pasta, nomeArquivo);
      const link = document.createElement('a');
      link.href = resultado.url;
      link.download = nomeArquivo;
      link.click();
      setTimeout(() => URL.revokeObjectURL(resultado.url), 1000);
      this.statusImportacao.set(`Download iniciado: ${nomeArquivo}`);
    } catch (error) {
      console.error(`Erro ao baixar o áudio ${nomeArquivo}:`, error);
      const erroHttp = error as { status?: number };
      this.statusImportacao.set(erroHttp.status === 404
        ? `Arquivo de áudio "${nomeArquivo}" não encontrado na pasta "${pasta}".`
        : `Não foi possível baixar o arquivo de áudio "${nomeArquivo}".`);
    }
  }

  removerCanal(index: number) {
    this.canais.update(lista => lista.filter((_, i) => i !== index));
  }

  async togglePlay() {
    if (this.isPlaying()) {
      this.pararPlayerCompleto();
      return;
    }

    if (this.carregandoPreview()) return;

    const canaisAtivos = this.canais().filter(canal => !canal.muted && canal.arquivo.trim());
    if (!this.pastaBase().trim() || canaisAtivos.length === 0) {
      this.statusPreview.set('Adicione ao menos uma trilha de áudio não mutada.');
      return;
    }

    this.carregandoPreview.set(true);
    this.statusPreview.set('Carregando trilhas para a prévia...');

    try {
      await Tone.start();
      this.limparMixCanais();

      const resultados = await Promise.allSettled(canaisAtivos.map(async canal => ({
        canal,
        arquivo: await this.fileRepository.getFileUrl(this.pastaBase().trim(), canal.arquivo.trim()),
      })));
      const faixasDisponiveis = resultados.flatMap(resultado =>
        resultado.status === 'fulfilled' ? [resultado.value] : []
      );

      this.audioUrls = faixasDisponiveis.map(faixa => faixa.arquivo.url);
      this.mixPlayers = faixasDisponiveis.map(({ canal, arquivo }) => new Tone.Player({
        url: arquivo.url,
        autostart: false,
        volume: canal.volume ?? 0,
      }).toDestination());

      if (this.mixPlayers.length === 0) {
        throw new Error('Nenhuma trilha pôde ser carregada.');
      }

      await Tone.loaded();
      Tone.Transport.start();
      this.mixPlayers.forEach(player => player.start(undefined, Tone.Transport.seconds));
      this.isPlaying.set(true);
      this.statusPreview.set(resultados.some(resultado => resultado.status === 'rejected')
        ? 'Prévia parcial: não foi possível carregar todas as trilhas.'
        : 'Mix das trilhas em reprodução.');
    } catch (error) {
      console.error('Erro ao carregar o mix de trilhas:', error);
      this.limparMixCanais();
      this.statusPreview.set('Não foi possível carregar as trilhas para a prévia.');
    } finally {
      this.carregandoPreview.set(false);
    }
  }

  pararPlayerCompleto() {
    Tone.Transport.pause();
    this.mixPlayers.forEach(player => player.stop());
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

    if (this.isPlaying()) {
      this.mixPlayers.forEach(player => {
        player.stop();
        player.start(undefined, Tone.Transport.seconds);
      });
    }
  }

  private limparMixCanais() {
    this.mixPlayers.forEach(player => player.dispose());
    this.mixPlayers = [];
    this.audioUrls.forEach(url => URL.revokeObjectURL(url));
    this.audioUrls = [];
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

  listarTrechos(): { id: string; nome: string }[] {
    return this.trechosForm().map(t => ({
      nome: t.nome,
      id: computarId(t.nome),
    }));
  }

  removerTrecho(index: number) {
    this.trechosForm.update(lista => lista.filter((_, i) => i !== index));
  }

  duplicarTrecho(index: number) {
    this.trechosForm.update(lista => {
      const trecho = lista[index];
      if (!trecho) return lista;

      const nomeBase = `${trecho.nome.trim() || 'Marcador'} - cópia`;
      const idsExistentes = new Set(lista.map(item => computarId(item.nome)));
      let nome = nomeBase;
      let numeroCopia = 2;
      while (idsExistentes.has(computarId(nome))) {
        nome = `${nomeBase} ${numeroCopia++}`;
      }

      const novaLista = [...lista];
      novaLista.splice(index + 1, 0, { ...trecho, nome });
      return novaLista;
    });
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
    this.limparMixCanais();
  }
}