import { Injectable, signal } from '@angular/core';
import * as Tone from 'tone';

export const AUDIO_REPO = 'http://localhost/static/audios/';

export interface Marker {
  id: string;
  nome: string;
  inicio: string;   
  duracao: string;
  maxPlays?: number;
  nextMarker?: string;
  loopStart?: string;
}

export interface ProjectConfig {
  nomeProjeto: string;
  offset?: number;
  bpm: number;
  timeSignature: number; // TODO: permitir compassos compostos
  pastaBase: string;
  canais: CanalAudio[];
  markers?: Marker[];
  fullSong?: boolean;
}

export interface CanalAudio {
  id: string;
  nome: string;
  arquivo: string;
  player: Tone.Player;
  volumeNode: Tone.Volume;
  channelNode: Tone.Channel;
  muted?: boolean;
  volume?: number;
  
  // Signals para atualizar a interface do Angular em tempo real
  volumeSignal: any;  // Armazena o valor em dB (-60 a +6)
  isMuted: any;       // Booleano para o botão de Mute
  isSoloed: any;
  saidaAtiva: any;    // String ou número indicando o canal de saída física
}

@Injectable({
  providedIn: 'root'
})
export class AudioEngineService {
  public audioRepository = signal<string>('http://localhost:4200/audios/');
  public isReady = signal<boolean>(false);
  public isPlaying = signal<boolean>(false);
  public isFullyLoaded = signal<boolean>(false);
  public loopCount = signal<number>(0);
  public statusCarregamento = signal<string>('Aguardando projeto...');
  
  public bpmAtual = signal<number>(120);
  public markers = signal<Marker[]>([]);
  public trechoAtivo = signal<Marker | null>(null);
  public proximoTrecho = signal<Marker | null>(null);
  
  public canais = signal<CanalAudio[]>([]);
  private loopId!: any;
  private offset?: number;
  
  // 1. O Signal que seu componente Angular vai ler no HTML
  public tempoMusicalAtual = signal<string>('0:0:0');
  private animacaoId!: number;
  private tempoInicioCicloTransport: number = 0;

  // Signals que a UI do Angular vai escutar em tempo real
  public segundosDecorridosNoBloco = signal<number>(0);
  public compassoAtualNoBloco = signal<number>(0);
  public beatAtualNoBloco = signal<number>(0);
  public subdivisaoAtualNoBloco = signal<number>(0);


  async init() {
    if (this.isReady()) return;

    await Tone.start();
    Tone.Transport.bpm.value = this.bpmAtual();
    this.isReady.set(true);
  }
// 🎯 CHAME ESTE MÉTODO no 'else' do seu togglePlay(), logo após o Tone.Transport.start()
  private iniciarRelogioUI() {
    const renderizarFrame = () => {
      if (!this.isPlaying()) return;

      // 1. Calcula os segundos decorridos usando a abordagem 2
      const tempoDecorrido = Tone.Transport.seconds - this.tempoInicioCicloTransport;
      const segundosPuros = Math.max(0, tempoDecorrido);
      this.segundosDecorridosNoBloco.set(segundosPuros);

      // 2. Converte para compassos puros (matemática baseada no BPM e Fórmula de Compasso)
      const bps = this.bpmAtual() / 60; // Batidas por segundo
      const batidasTotais = segundosPuros * bps;
      const beat = Math.floor(batidasTotais) % (Tone.Transport.timeSignature as number); // Batida dentro do compasso
      this.beatAtualNoBloco.set(beat + 1);
      const subdivisao = Math.floor((batidasTotais * 4) % 4); // Subdivisão em semicolcheias (4 por batida)
      this.subdivisaoAtualNoBloco.set(subdivisao + 1);

      const compassoCalculado = Math.floor(batidasTotais / (Tone.Transport.timeSignature as number));
      let ajusteTrechoStr = this.loopCount() > 0 ? (this.trechoAtivo()?.loopStart || this.trechoAtivo()?.inicio) : this.trechoAtivo()?.inicio;
      const ajusteTrecho = parseInt((ajusteTrechoStr || '0m').replaceAll('\D*', ''));
      // Somamos +1 para a contagem ficar humana (Compasso 1, Compasso 2...) em vez de indexada em 0
      this.compassoAtualNoBloco.set(compassoCalculado + ajusteTrecho + 1);

      // Continua o laço no próximo frame da tela
      this.animacaoId = requestAnimationFrame(renderizarFrame);
    };

    requestAnimationFrame(renderizarFrame);
  }

  // 🎯 CHAME ESTE MÉTODO no 'if (this.isPlaying())' do seu togglePlay() para limpar tudo
  private pararRelogioUI() {
    if (this.animacaoId) {
      cancelAnimationFrame(this.animacaoId);
    }
    this.segundosDecorridosNoBloco.set(0);
    this.compassoAtualNoBloco.set(0);
    this.beatAtualNoBloco.set(0);
    this.subdivisaoAtualNoBloco.set(0);
  }
  public async carregarProjetoPorJSON(jsonTexto: string) {
    if (!this.isReady()) await this.init();
    if (this.isPlaying()) this.togglePlay();

    try {
      this.isFullyLoaded.set(false);
      this.statusCarregamento.set('Carregando pistas do repositório...');
      this.destruirCanaisAtuais();

      const projeto: ProjectConfig = JSON.parse(jsonTexto) as ProjectConfig;


      // Configurações Globais de Tempo
      this.bpmAtual.set(projeto.bpm);
      this.offset = projeto.offset;
      Tone.Transport.bpm.value = projeto.bpm;
      Tone.Transport.timeSignature = projeto.timeSignature || 4;

      // Montagem da mesa de som multicanal
      const novosCanais: CanalAudio[] = [];
      let canaisCarregados = 0;
      projeto.canais.forEach((canal: CanalAudio) => {
        const urlCompleta = `${this.audioRepository()}${projeto.pastaBase}${canal.arquivo}`;
        // 1. Cria os nós de áudio para este canal
        const player = new Tone.Player({ url: urlCompleta, autostart: false });
        const volumeNode = new Tone.Volume(0); // 0dB = Volume original
        const channelNode = new Tone.Channel();
        channelNode.mute = canal.muted || false;
        volumeNode.volume.rampTo(canal.volume || 0, 0.05);
        player.chain(volumeNode, channelNode, Tone.Destination);
        
        novosCanais.push({
          id: canal.id,
          nome: canal.nome,
          player: player,
          arquivo: canal.arquivo,
          volumeNode: volumeNode,
          channelNode: channelNode,
          volumeSignal: signal(canal.volume || 0),       // Slider começa no meio (0 dB)
          isMuted: signal(canal.muted),        // Desmutado por padrão
          isSoloed: signal(false),
          saidaAtiva: signal('Master')   // Roteamento padrão
        });
      });

      this.canais.set(novosCanais);

      // Aguarda o download e decodificação em lote dos MP3s na RAM

      this.statusCarregamento.set(`Baixando arquivos de áudio`);
      await Tone.loaded();
      // 🎯 AGORA SIM: Se não houver markers no JSON, calculamos dinamicamente baseados na maior pista
      const temMarkersValidos = projeto.markers && Array.isArray(projeto.markers) && projeto.markers.length > 0;

      if (projeto.markers && temMarkersValidos) {
        const markers = projeto.markers.map(m => m);
        if (projeto.fullSong) {
          markers.push(this.criarMarkerAudioCompleto());
        }
        this.markers.set(markers);
      }
      if (!temMarkersValidos) {
        // Encontra a maior duração entre todas as pistas carregadas (em segundos)
        this.markers.set([this.criarMarkerAudioCompleto()]);
      }
      this.trechoAtivo.set(this.markers()[0]);
      this.proximoTrecho.set(null);
      this.loopCount.set(0);
      this.isFullyLoaded.set(true);
      this.statusCarregamento.set(`Projeto "${projeto.nomeProjeto}" pronto!`);

    } catch (erro) {
      console.error('Erro na carga do projeto:', erro);
      this.statusCarregamento.set('Erro ao carregar projeto.');
      alert('Verifique a estrutura do seu arquivo JSON de projeto.');
    }
  }

  private criarMarkerAudioCompleto() {
    let maiorDuracaoSegundos = 0;
    this.canais().forEach(canal => {
      const duracaoPista = canal.player.buffer.duration;
      if (duracaoPista > maiorDuracaoSegundos) {
        maiorDuracaoSegundos = duracaoPista;
      }
    });

    // Se por algum motivo der zero (ex: arquivo corrompido), usa 3 minutos (180s) de segurança
    if (maiorDuracaoSegundos === 0) maiorDuracaoSegundos = 180;

    // Criamos o marcador usando o número puro (segundos) que o Tone.js aceita perfeitamente
    return {
      id: 'full-audio',
      nome: 'Áudio Completo (Automático)',
      inicio: '0m',
      maxPlays: 1,
      duracao: maiorDuracaoSegundos.toString()
    }
  }

  private configurarLoopDoTrecho() {
    // 1. Limpa completamente qualquer agendamento anterior para não encavalar
    if (this.loopId !== undefined && this.loopId !== null) {
      Tone.Transport.clear(this.loopId);
      this.loopId = null;
    }
    
    const atual = this.trechoAtivo();
    if (!atual) return;

    // Se o motor já estiver rodando (mudança em tempo real), pega o tempo de hardware atual.
    // Se veio do botão Play, começamos no zero absoluto do clock.
    const tempoDisparoInicial = this.isPlaying() ? Tone.context.currentTime : Tone.context.currentTime + 0.02;

    // Dispara a primeira engrenagem do carrossel
    this.executarCicloArranjador(tempoDisparoInicial);
  }

  private executarCicloArranjador(tempoDisparoCravado: number) {
    const atualAntesVirada = this.trechoAtivo();
    if (atualAntesVirada && atualAntesVirada.maxPlays) {
      if (atualAntesVirada.maxPlays - 1 < this.loopCount()) {        
        if (!this.proximoTrecho()) {
          if (atualAntesVirada.nextMarker) {
            this.agendarTrecho(atualAntesVirada.nextMarker);
          } else {
            this.togglePlay();
            return;
          }
        }
      }
    }
    // 1. Verifica se o usuário pediu para mudar de bloco na virada
    const proximo = this.proximoTrecho();
    if (proximo) {
      this.trechoAtivo.set(proximo);
      this.proximoTrecho.set(null); 
      this.loopCount.set(0); 
    }

    const atual = this.trechoAtivo();
    if (!atual) return;
    // 1. RESOLUÇÃO DOS PONTOS DE TEMPO
    const inicioAbsoluto = Tone.Time(atual.inicio).toSeconds();
    const duracaoDoLoopReal = Tone.Time(atual.duracao).toSeconds();
    
    let inicioSegundos = inicioAbsoluto;
    let duracaoSegundos = duracaoDoLoopReal;
    // Se já passou da primeira execução e existe um ponto específico de loop
    if (this.loopCount() > 0 && atual.loopStart) {
      inicioSegundos = Tone.Time(atual.loopStart).toSeconds(); // 🎯 Correção da sintaxe (=+)
      duracaoSegundos = duracaoDoLoopReal; // Usa a duração exata especificada para o loop
    } else if (atual.loopStart) {
      // 🎯 PRIMEIRA VOLTA: O áudio precisa tocar o trecho inteiro (Crash + Miolo)
      const loopStartSegundos = Tone.Time(atual.loopStart).toSeconds();
      const tamanhoDoPrefixo = loopStartSegundos - inicioAbsoluto;
      
      // A duração total da primeira vez será o tamanho do prefixo/crash + a duração do loop real
      duracaoSegundos = tamanhoDoPrefixo + duracaoDoLoopReal;
    }

    // 🎯 O PULO DO GATO DO OFFSET: 
    // Defina aqui um valor em segundos (positivo ou negativo) para testar o alinhamento.
    // Exemplo: se o áudio está entrando atrasado um tempo (num compasso 4/4 a 120 BPM, 1 tempo = 0.5s),
    // você pode subtrair ou somar esse valor para casar a cabeça do compasso perfeitamente.
    const offsetAjuste = this.offset || 0; // Altere para 0.5, -0.2, etc., para calibrar o "respiro"
    const inicioComOffset = Math.max(0, inicioSegundos + offsetAjuste);
    this.tempoInicioCicloTransport = Tone.Transport.getSecondsAtTime(tempoDisparoCravado);
    // 2. DISPARO CRÍTICO DE ÁUDIO
    this.canais().forEach(canal => {
      if (canal.player.loaded) {
        canal.player.stop(tempoDisparoCravado); 
        // Aplicamos o início corrigido com o seu offset de teste
        canal.player.start(tempoDisparoCravado, inicioComOffset, duracaoSegundos);
      }
    });

    // 3. MATEMÁTICA DA PRÓXIMA VIRADA (Régua de Hardware)
    const tempoProximaVirada = tempoDisparoCravado + duracaoSegundos;

    // 🎯 CORREÇÃO DO GAP: Em vez de usar Tone.Transport.seconds (que sofre delay da UI),
    // nós convertemos o tempo de hardware absoluto direto para o tempo do Transport.
    const tempoMusicalTransport = Tone.Transport.getSecondsAtTime(tempoProximaVirada);

    // 4. AGENDA A PRÓXIMA VOLTA
    this.loopId = Tone.Transport.schedule((time) => {
      
      if (!this.proximoTrecho()) {
        this.loopCount.update(c => c + 1);
      }

      // Passa o clock puro para manter a corrente contínua sem folga
      this.executarCicloArranjador(time);

    }, tempoMusicalTransport);
  }
  public obterProgressoEmSegundos(): number {
    if (!this.isPlaying()) return 0;
    
    // O tempo atual da agulha menos o segundo onde o ciclo começou
    const tempoDecorridoNoBloco = Tone.Transport.seconds - this.tempoInicioCicloTransport;
    
    return Math.max(0, tempoDecorridoNoBloco);
  }

  public alterarVolume(canal: CanalAudio, db: number) {
    canal.volumeSignal.set(db);
    // O Tone.js usa escala logarítmica para volume (dB). -60 é silêncio absoluto.
    canal.volumeNode.volume.rampTo(db, 0.05); // Suaviza em 50ms para não dar estalo (pop)
  }
  public alternarSolo(canal: CanalAudio) {
    const novoEstadoSolo = !canal.isSoloed();
    
    // 1. Atualiza o signal para refletir a cor ativa no botão da interface do Angular
    canal.isSoloed.set(novoEstadoSolo);
    
    // 2. 🎯 A MÁGICA DO TONE.JS: Ativa ou desativa o solo nativo no nó de áudio.
    // O Tone.js vai gerenciar o silêncio dos outros canais de forma cirúrgica.
    canal.channelNode.solo = novoEstadoSolo;
  }
  public alternarMute(canal: CanalAudio) {
    const novoEstado = !canal.isMuted();
    canal.isMuted.set(novoEstado);
    canal.channelNode.mute = novoEstado;
  }

  public alterarSaidaFisica(canal: CanalAudio, indiceSaida: number) {
    canal.saidaAtiva.set(`Saída ${indiceSaida + 1}`);
    
    // Desconecta das saídas atuais para não duplicar o som
    canal.channelNode.disconnect();
    
    // Cria um nó de split/routing para mandar para o canal específico da sua interface de som
    const panner = new Tone.Panner3D(); // Ou use Tone.Channel e mude o destino de hardware
    
    // Nota técnica: Para roteamento multicanais avançados (Ex: placas com 8 saídas),
    // o Tone.js se conecta ao nó nativo da Web Audio API (AudioDestinationNode).
    // Se sua interface tiver múltiplos canais, você faz assim:
    canal.channelNode.connect(Tone.Destination, 0, indiceSaida);
  }

  public agendarTrecho(markerId: string) {
    const selecionado = this.markers().find(m => m.id === markerId);
    if (!selecionado) return;

    if (this.isPlaying()) {
      this.proximoTrecho.set(selecionado);
    } else {
      this.trechoAtivo.set(selecionado);
    }
  }

  private destruirCanaisAtuais() {
    if (this.loopId) {
      this.loopId.stop();
      this.loopId.dispose();
      this.loopId = null;
    }
    this.canais().forEach(c => {
      c.player.stop();
      c.player.dispose(); 
    });
    this.canais.set([]);
  }

  async togglePlay() {
    if (this.canais().length === 0) {
      alert('Carregue um arquivo JSON de projeto primeiro!');
      return;
    }

    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }

    if (this.isPlaying()) {
      // 🎯 LIMPEZA COMPLETA DO AGENDADOR RECURSIVO:
      if (this.loopId !== undefined && this.loopId !== null) {
        Tone.Transport.clear(this.loopId);
        this.loopId = null;
      }

      Tone.Transport.stop();
      Tone.Transport.cancel(0); 
      
      this.canais().forEach(c => c.player.stop());
      this.isPlaying.set(false);
      this.loopCount.set(0);
      this.proximoTrecho.set(null);
      this.pararRelogioUI();
    } else {
      Tone.Transport.stop();
      Tone.Transport.cancel(0); 
      Tone.Transport.position = 0; // Garante que a agulha comece no segundo zero do Transport
      
      this.loopCount.set(0);
      Tone.Transport.start();
      this.isPlaying.set(true);
      this.iniciarRelogioUI();
      // Armas a automação baseada na linha do tempo contínua
      this.configurarLoopDoTrecho();
    }
  }
}