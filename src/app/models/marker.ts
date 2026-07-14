export interface Marker {
  id: string;
  nome: string;
  inicio: string;   
  duracao: string;
  maxPlays?: number;
  nextMarker?: string;
  loopStart?: string;
  referencia?: string;
}