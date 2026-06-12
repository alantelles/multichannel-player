import { Injectable, signal } from '@angular/core';
import * as Tone from 'tone';

export const AUDIO_REPO = 'http://localhost/static/audios/';

export interface Marker {
  id: string;
  nome: string;
  inicio: string;   
  duracao: string;  
}

export interface CanalAudio {
  id: string;
  nome: string;
  player: Tone.Player;
  volumeNode: Tone.Volume;
  channelNode: Tone.Channel;
  
  // Signals para atualizar a interface do Angular em tempo real
  volumeSignal: any;  // Armazena o valor em dB (-60 a +6)
  isMuted: any;       // Booleano para o botão de Mute
  saidaAtiva: any;    // String ou número indicando o canal de saída física
}

@Injectable({
  providedIn: 'root'
})
export class AudioEngineService {
  public isReady = signal<boolean>(false);
  public isPlaying = signal<boolean>(false);
  public loopCount = signal<number>(0);
  public statusCarregamento = signal<string>('Aguardando projeto JSON...');
  
  public bpmAtual = signal<number>(120);
  public markers = signal<Marker[]>([]);
  public trechoAtivo = signal<Marker | null>(null);
  public proximoTrecho = signal<Marker | null>(null);
  
  public canais = signal<CanalAudio[]>([]);
  private loopId!: any;

  async init() {
    if (this.isReady()) return;

    await Tone.start();
    Tone.Transport.bpm.value = this.bpmAtual();
    this.isReady.set(true);
  }

  public async carregarProjetoPorJSON(jsonTexto: string) {
    if (!this.isReady()) await this.init();
    if (this.isPlaying()) this.togglePlay();

    try {
      this.statusCarregamento.set('Carregando pistas do repositório...');
      this.destruirCanaisAtuais();

      const projeto = JSON.parse(jsonTexto);


      // Configurações Globais de Tempo
      this.bpmAtual.set(projeto.bpm);
      Tone.Transport.bpm.value = projeto.bpm;
      Tone.Transport.timeSignature = projeto.timeSignature || 4;

      // Montagem da mesa de som multicanal
      const novosCanais: CanalAudio[] = [];

      projeto.canais.forEach((canal: any) => {
        const urlCompleta = `${AUDIO_REPO}${projeto.pastaBase}${canal.arquivo}`;

        // 1. Cria os nós de áudio para este canal
        const player = new Tone.Player({ url: urlCompleta, autostart: false });
        const volumeNode = new Tone.Volume(0); // 0dB = Volume original
        const channelNode = new Tone.Channel();
        player.chain(volumeNode, channelNode, Tone.Destination);

        novosCanais.push({
          id: canal.id,
          nome: canal.nome,
          player: player,
          volumeNode: volumeNode,
          channelNode: channelNode,
          volumeSignal: signal(0),       // Slider começa no meio (0 dB)
          isMuted: signal(false),        // Desmutado por padrão
          saidaAtiva: signal('Master')   // Roteamento padrão
        });
      });

      this.canais.set(novosCanais);

      // Aguarda o download e decodificação em lote dos MP3s na RAM
      await Tone.loaded();
      // 🎯 AGORA SIM: Se não houver markers no JSON, calculamos dinamicamente baseados na maior pista
      const temMarkersValidos = projeto.markers && Array.isArray(projeto.markers) && projeto.markers.length > 0;

      if (temMarkersValidos) {
        this.markers.set(projeto.markers);
      } else {
        // Encontra a maior duração entre todas as pistas carregadas (em segundos)
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
        const markerFull = { 
          id: 'full-audio', 
          nome: 'Áudio Completo (Automático)', 
          inicio: '0m', 
          duracao: maiorDuracaoSegundos.toString() 
        };

        this.markers.set([markerFull]);
      }
      this.trechoAtivo.set(this.markers()[0]);
      this.proximoTrecho.set(null);
      this.loopCount.set(0);
      this.statusCarregamento.set(`Projeto "${projeto.nomeProjeto}" pronto!`);

    } catch (erro) {
      console.error('Erro na carga do projeto:', erro);
      this.statusCarregamento.set('Erro ao carregar projeto.');
      alert('Verifique a estrutura do seu arquivo JSON de projeto.');
    }
  }

  private configurarLoopDoTrecho() {
    if (this.loopId !== undefined && this.loopId !== null) {
      Tone.Transport.clear(this.loopId);
    }
    
    const primeiroTrecho = this.trechoAtivo();
    if (!primeiroTrecho) return;

    // Agenda a repetição amarrada ao início zero do Transport
    this.loopId = Tone.Transport.scheduleRepeat((time) => {
      if (this.canais().length === 0) return;

      const proximo = this.proximoTrecho();
      if (proximo) {
        this.trechoAtivo.set(proximo);
        this.proximoTrecho.set(null); 
        this.loopCount.set(0);
        this.configurarLoopDoTrecho();
        return; 
      }

      const atual = this.trechoAtivo();
      if (!atual) return;

      // Dispara a reprodução síncrona de todas as pistas
      this.canais().forEach(canal => {
        if (canal.player.loaded) {
          canal.player.start(time, atual.inicio, atual.duracao);
        }
      });
      
      this.loopCount.update(c => c + 1);
    }, primeiroTrecho.duracao, 0); 
  }

  // 🎯 MÉTODOS DE CONTROLE DA MESA DE SOM (AÇÕES DOS SLIDERS E BOTÕES)

  public alterarVolume(canal: CanalAudio, db: number) {
    canal.volumeSignal.set(db);
    // O Tone.js usa escala logarítmica para volume (dB). -60 é silêncio absoluto.
    canal.volumeNode.volume.rampTo(db, 0.05); // Suaviza em 50ms para não dar estalo (pop)
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
    if (this.loopId !== undefined && this.loopId !== null) {
      Tone.Transport.clear(this.loopId);
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
      Tone.Transport.stop();
      Tone.Transport.cancel(); 
      
      this.canais().forEach(c => c.player.stop());
      this.isPlaying.set(false);
      this.loopCount.set(0);
      this.proximoTrecho.set(null);
    } else {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.position = 0;
      
      // Armamos o loop fixo segundos antes da partida do motor
      this.configurarLoopDoTrecho();

      // Microdelay de estabilização do relógio de hardware
      setTimeout(() => {
        Tone.Transport.start();
        this.isPlaying.set(true);
      }, 10);
    }
  }
}