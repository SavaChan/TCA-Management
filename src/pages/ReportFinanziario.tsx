import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Euro, Banknote, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PagamentoData {
  id: string;
  importo: number;
  metodo_pagamento_tipo: string;
  metodo_pagamento: string;
  note: string;
  data_pagamento: string;
  prenotazioni: {
    soci?: { nome: string; cognome: string };
    ospiti?: { nome: string; cognome: string };
    campo: number;
    data: string;
    ora_inizio: string;
  };
}

const ReportFinanziario = () => {
  const [pagamenti, setPagamenti] = useState<PagamentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadPagamenti();
  }, [selectedDate]);

  const loadPagamenti = async () => {
    try {
      const { data, error } = await supabase
        .from('pagamenti')
        .select(`
          *,
          prenotazioni (
            campo,
            data,
            ora_inizio,
            soci (nome, cognome),
            ospiti (nome, cognome)
          )
        `)
        .gte('data_pagamento', selectedDate)
        .lte('data_pagamento', selectedDate + 'T23:59:59')
        .order('data_pagamento', { ascending: false });

      if (error) throw error;
      setPagamenti(data || []);
    } catch (error) {
      console.error('Error loading pagamenti:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i pagamenti",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNomeCliente = (pagamento: PagamentoData) => {
    if (pagamento.prenotazioni?.soci) {
      return `${pagamento.prenotazioni.soci.nome} ${pagamento.prenotazioni.soci.cognome}`;
    } else if (pagamento.prenotazioni?.ospiti) {
      return `${pagamento.prenotazioni.ospiti.nome} ${pagamento.prenotazioni.ospiti.cognome}`;
    }
    return 'Cliente non disponibile';
  };

  const contanti = pagamenti.filter(p => p.metodo_pagamento_tipo === 'contanti');
  const pos = pagamenti.filter(p => p.metodo_pagamento_tipo === 'pos');
  
  const totaleContanti = contanti.reduce((sum, p) => sum + p.importo, 0);
  const totalePOS = pos.reduce((sum, p) => sum + p.importo, 0);
  const totaleBilancio = totaleContanti + totalePOS;

  if (loading) return <div>Caricamento report...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/20">
            <span className="text-xs text-muted-foreground">LOGO</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Tennis Club Arenzano</h1>
            <p className="text-muted-foreground">Report Finanziario Giornaliero</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cassa (Contanti)</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totaleContanti.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {contanti.length} transazioni in contanti
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">POS (Elettronico)</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">€{totalePOS.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {pos.length} transazioni con POS
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bilancio Totale</CardTitle>
            <Euro className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">€{totaleBilancio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {pagamenti.length} transazioni totali
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dettaglio Transazioni */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pagamenti in Contanti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Banknote className="h-5 w-5 text-green-600" />
              <span>Pagamenti in Contanti</span>
            </CardTitle>
            <CardDescription>
              Movimenti di cassa del {new Date(selectedDate).toLocaleDateString('it-IT')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contanti.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nessun pagamento in contanti oggi</p>
            ) : (
              <div className="space-y-3">
                {contanti.map((pagamento) => (
                  <div key={pagamento.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="font-medium">{getNomeCliente(pagamento)}</div>
                      <div className="text-sm text-muted-foreground">
                        Campo {pagamento.prenotazioni?.campo} - {pagamento.prenotazioni?.ora_inizio}
                      </div>
                      {pagamento.note && (
                        <div className="text-xs text-muted-foreground italic">{pagamento.note}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">€{pagamento.importo.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(pagamento.data_pagamento).toLocaleTimeString('it-IT', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagamenti POS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>Pagamenti POS</span>
            </CardTitle>
            <CardDescription>
              Movimenti elettronici del {new Date(selectedDate).toLocaleDateString('it-IT')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pos.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nessun pagamento POS oggi</p>
            ) : (
              <div className="space-y-3">
                {pos.map((pagamento) => (
                  <div key={pagamento.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="font-medium">{getNomeCliente(pagamento)}</div>
                      <div className="text-sm text-muted-foreground">
                        Campo {pagamento.prenotazioni?.campo} - {pagamento.prenotazioni?.ora_inizio}
                      </div>
                      {pagamento.note && (
                        <div className="text-xs text-muted-foreground italic">{pagamento.note}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-blue-600">€{pagamento.importo.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(pagamento.data_pagamento).toLocaleTimeString('it-IT', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Firma */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground">by Cesco</p>
      </div>
    </div>
  );
};

export default ReportFinanziario;