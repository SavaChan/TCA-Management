export type TipoSocio = 'frequentatore' | 'non_agonista' | 'agonista' | 'maestro';
export type StatoPagamento = 'pagato' | 'da_pagare';
export type TipoCampo = 'scoperto' | 'coperto';
export type TipoPrenotazione = 'singolare' | 'doppio' | 'corso' | 'lezione';

export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  ruolo: string;
  created_at: string;
  updated_at: string;
}

export interface Socio {
  id: string;
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  tipo_socio: TipoSocio;
  classifica_fitp?: string;
  certificato_medico_scadenza?: string;
  note?: string;
  attivo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tariffa {
  id: string;
  nome: string;
  tipo_prenotazione: TipoPrenotazione;
  tipo_campo: TipoCampo;
  diurno: boolean;
  soci: boolean;
  prezzo_ora: number;
  prezzo_mezz_ora: number;
  attivo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ospite {
  id: string;
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Prenotazione {
  id: string;
  socio_id?: string;
  ospite_id?: string;
  campo: number;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  tipo_prenotazione: TipoPrenotazione;
  tipo_campo: TipoCampo;
  diurno: boolean;
  importo: number;
  stato_pagamento: StatoPagamento;
  note?: string;
  annullata_pioggia?: boolean;
  data_annullamento_pioggia?: string;
  created_at: string;
  updated_at: string;
  soci?: Partial<Socio>;
  ospiti?: Partial<Ospite>;
}

export interface Pagamento {
  id: string;
  prenotazione_id: string;
  importo: number;
  data_pagamento: string;
  metodo_pagamento?: string;
  note?: string;
  created_at: string;
}