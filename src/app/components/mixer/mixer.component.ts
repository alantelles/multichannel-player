import { Component, inject, OnInit } from '@angular/core';
import { AudioEngineService } from '../../services/audio-engine.service'; // Ajuste o caminho se o seu arquivo tiver .service no nome
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mixer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mixer.component.html', // ou mixer.component.html dependendo de como foi gerado
  styleUrl: './mixer.component.scss'     // ou mixer.component.scss
})
export class MixerComponent implements OnInit {
  // Injeta o serviço corrigido usando a sintaxe moderna inject()
  protected audio = inject(AudioEngineService);

  // 🎯 NOVO: Lê o arquivo JSON de configuração mapeado pelo usuário
  onConfigSelecionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const arquivoConfig = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const conteudoTexto = e.target.result;
        this.audio.carregarProjetoPorJSON(conteudoTexto);
      };

      reader.readAsText(arquivoConfig);
    }
  }

  ngOnInit() {
    const savedAudioRepository = localStorage.getItem('audioRepository');
    this.audio.audioRepository.set(savedAudioRepository || 'audios/');
  }

  setAudioRepository(novaUrl: string) {
    this.audio.audioRepository.set(novaUrl);
    localStorage.setItem('audioRepository', novaUrl);
  }

  backgroundColorPlayButton(): string {
    if (this.audio.isFullyLoaded()) {
      return this.audio.isPlaying() ? '#dc3545' : '#28a745'
    }
    return '#818181'
  }

  // Inicializa o motor de áudio no primeiro clique/interação por segurança do browser
  async ligarMesa() {
    await this.audio.init();
  }
  // ... dentro da classe MixerComponent
  alternarPlay() {
    this.audio.togglePlay();
  }
  // ... dentro da classe MixerComponent
  selecionarTrecho(id: string) {
    this.audio.agendarTrecho(id);
  }  
  atualizarVolumeRange(canal: any, event: Event) {
    const input = event.target as HTMLInputElement;
    this.audio.alterarVolume(canal, Number(input.value));
  }

  selecionarSaidaFisica(canal: any, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.audio.alterarSaidaFisica(canal, Number(select.value));
  }
}