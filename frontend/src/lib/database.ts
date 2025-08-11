// Database abstraction layer - supports both Supabase and PocketBase
import { supabase } from '@/integrations/supabase/client';

// Database interface for easy switching between providers
export interface DatabaseProvider {
  // Prenotazioni
  getPrenotazioni(filters?: any): Promise<any[]>;
  createPrenotazione(data: any): Promise<any>;
  updatePrenotazione(id: string, data: any): Promise<any>;
  deletePrenotazione(id: string): Promise<void>;
  
  // Soci
  getSoci(): Promise<any[]>;
  createSocio(data: any): Promise<any>;
  updateSocio(id: string, data: any): Promise<any>;
  
  // Ospiti
  getOspiti(): Promise<any[]>;
  createOspite(data: any): Promise<any>;
  updateOspite(id: string, data: any): Promise<any>;
  
  // Pagamenti
  getPagamenti(): Promise<any[]>;
  createPagamento(data: any): Promise<any>;
  
  // Tariffe
  getTariffe(): Promise<any[]>;
  createTariffa(data: any): Promise<any>;
  updateTariffa(id: string, data: any): Promise<any>;
}

// Supabase implementation
class SupabaseProvider implements DatabaseProvider {
  async getPrenotazioni(filters?: any) {
    let query = supabase
      .from('prenotazioni')
      .select(`
        id, data, ora_inizio, ora_fine, campo, importo, tipo_prenotazione, 
        stato_pagamento, created_at, note, diurno, tipo_campo,
        soci (nome, cognome, telefono),
        ospiti (nome, cognome, telefono)
      `);

    if (filters?.stato_pagamento) {
      query = query.eq('stato_pagamento', filters.stato_pagamento);
    }
    if (filters?.data_from && filters?.data_to) {
      query = query.gte('data', filters.data_from).lte('data', filters.data_to);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createPrenotazione(data: any) {
    const { data: result, error } = await supabase
      .from('prenotazioni')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async updatePrenotazione(id: string, data: any) {
    const { data: result, error } = await supabase
      .from('prenotazioni')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async deletePrenotazione(id: string) {
    const { error } = await supabase
      .from('prenotazioni')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getSoci() {
    const { data, error } = await supabase
      .from('soci')
      .select('*')
      .order('cognome');
    if (error) throw error;
    return data || [];
  }

  async createSocio(data: any) {
    const { data: result, error } = await supabase
      .from('soci')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async updateSocio(id: string, data: any) {
    const { data: result, error } = await supabase
      .from('soci')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async getOspiti() {
    const { data, error } = await supabase
      .from('ospiti')
      .select('*')
      .order('cognome');
    if (error) throw error;
    return data || [];
  }

  async createOspite(data: any) {
    const { data: result, error } = await supabase
      .from('ospiti')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async updateOspite(id: string, data: any) {
    const { data: result, error } = await supabase
      .from('ospiti')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async getPagamenti() {
    const { data, error } = await supabase
      .from('pagamenti')
      .select('*')
      .order('data_pagamento', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createPagamento(data: any) {
    const { data: result, error } = await supabase
      .from('pagamenti')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async getTariffe() {
    const { data, error } = await supabase
      .from('tariffe')
      .select('*')
      .eq('attivo', true)
      .order('nome');
    if (error) throw error;
    return data || [];
  }

  async createTariffa(data: any) {
    const { data: result, error } = await supabase
      .from('tariffe')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async updateTariffa(id: string, data: any) {
    const { data: result, error } = await supabase
      .from('tariffe')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }
}

// PocketBase implementation (for local usage)
class PocketBaseProvider implements DatabaseProvider {
  private baseUrl = 'http://localhost:8090';
  
  private async request(endpoint: string, options?: RequestInit) {
    const url = `${this.baseUrl}/api/collections/${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`PocketBase error: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getPrenotazioni(filters?: any) {
    let query = 'prenotazioni/records?expand=socio_id,ospite_id';
    
    if (filters?.stato_pagamento) {
      query += `&filter=(stato_pagamento='${filters.stato_pagamento}')`;
    }
    if (filters?.data_from && filters?.data_to) {
      query += `&filter=(data>='${filters.data_from}' && data<='${filters.data_to}')`;
    }
    
    const result = await this.request(query);
    return result.items || [];
  }

  async createPrenotazione(data: any) {
    const result = await this.request('prenotazioni/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result;
  }

  async updatePrenotazione(id: string, data: any) {
    const result = await this.request(`prenotazioni/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return result;
  }

  async deletePrenotazione(id: string) {
    await this.request(`prenotazioni/records/${id}`, {
      method: 'DELETE',
    });
  }

  async getSoci() {
    const result = await this.request('soci/records?sort=cognome');
    return result.items || [];
  }

  async createSocio(data: any) {
    const result = await this.request('soci/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result;
  }

  async updateSocio(id: string, data: any) {
    const result = await this.request(`soci/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return result;
  }

  async getOspiti() {
    const result = await this.request('ospiti/records?sort=cognome');
    return result.items || [];
  }

  async createOspite(data: any) {
    const result = await this.request('ospiti/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result;
  }

  async updateOspite(id: string, data: any) {
    const result = await this.request(`ospiti/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return result;
  }

  async getPagamenti() {
    const result = await this.request('pagamenti/records?sort=-data_pagamento');
    return result.items || [];
  }

  async createPagamento(data: any) {
    const result = await this.request('pagamenti/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result;
  }

  async getTariffe() {
    const result = await this.request('tariffe/records?filter=(attivo=true)&sort=nome');
    return result.items || [];
  }

  async createTariffa(data: any) {
    const result = await this.request('tariffe/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result;
  }

  async updateTariffa(id: string, data: any) {
    const result = await this.request(`tariffe/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return result;
  }
}

// Configuration
const DB_PROVIDER = import.meta.env.VITE_DB_PROVIDER || 'supabase'; // 'supabase' or 'pocketbase'

// Export the current database provider
export const db: DatabaseProvider = DB_PROVIDER === 'pocketbase' 
  ? new PocketBaseProvider() 
  : new SupabaseProvider();

export { SupabaseProvider, PocketBaseProvider };