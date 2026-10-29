export interface Marker {
  id: string;
  nome: string;
  inicio: string;   
  duracao: string;
  maxPlays?: number;
  nextMarker?: string;
  loopStart?: string;
  referencia?: string;
  // 🎯 Define se o clique simples vai direto no próximo compasso ou espera o fim do bloco
  modoDisparo?: 'compasso' | 'bloco';
}