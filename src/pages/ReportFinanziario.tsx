import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Euro, Banknote, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [pagamentiGiornalieri, setPagamentiGiornalieri] = useState<PagamentoData[]>([]);
  const [pagamentiMensili, setPagamentiMensili] = useState<PagamentoData[]>([]);
  const [pagamentiAnnuali, setPagamentiAnnuali] = useState<PagamentoData[]>([]);
  const [pagamentiAnnoScorso, setPagamentiAnnoScorso] = useState<PagamentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());

  useEffect(() => {
    loadAllPagamenti();
  }, [dateFrom, dateTo]);

  const loadAllPagamenti = async () => {
    try {
      const fromDateStr = format(dateFrom, 'yyyy-MM-dd');
      const toDateStr = format(dateTo, 'yyyy-MM-dd');
      const currentYear = dateTo.getFullYear();
      const currentMonth = dateTo.getMonth();
      const previousYear = currentYear - 1;

      // Query per pagamenti nel periodo selezionato
      const { data: dataGiornalieri, error: errorGiornalieri } = await supabase
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
        .gte('data_pagamento', fromDateStr)
        .lte('data_pagamento', toDateStr + 'T23:59:59')
        .order('data_pagamento', { ascending: false });

      // Query per pagamenti mensili (mese corrente)
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      
      const { data: dataMensili, error: errorMensili } = await supabase
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
        .gte('data_pagamento', startOfMonth)
        .lte('data_pagamento', endOfMonth + 'T23:59:59')
        .order('data_pagamento', { ascending: false });

      // Query per pagamenti annuali (anno corrente)
      const startOfYear = new Date(currentYear, 0, 1).toISOString().split('T')[0];
      const endOfYear = new Date(currentYear, 11, 31).toISOString().split('T')[0];
      
      const { data: dataAnnuali, error: errorAnnuali } = await supabase
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
        .gte('data_pagamento', startOfYear)
        .lte('data_pagamento', endOfYear + 'T23:59:59')
        .order('data_pagamento', { ascending: false });

      // Query per stesso periodo anno precedente
      const startOfPreviousYear = new Date(previousYear, 0, 1).toISOString().split('T')[0];
      const endOfPreviousYear = new Date(previousYear, currentMonth + 1, 0).toISOString().split('T')[0];
      
      const { data: dataAnnoScorso, error: errorAnnoScorso } = await supabase
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
        .gte('data_pagamento', startOfPreviousYear)
        .lte('data_pagamento', endOfPreviousYear + 'T23:59:59')
        .order('data_pagamento', { ascending: false });

      if (errorGiornalieri || errorMensili || errorAnnuali || errorAnnoScorso) {
        throw new Error('Errore nel caricamento dei dati');
      }

      setPagamentiGiornalieri(dataGiornalieri || []);
      setPagamentiMensili(dataMensili || []);
      setPagamentiAnnuali(dataAnnuali || []);
      setPagamentiAnnoScorso(dataAnnoScorso || []);
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

  // Calcoli per pagamenti giornalieri
  const contanti = pagamentiGiornalieri.filter(p => p.metodo_pagamento_tipo === 'contanti');
  const pos = pagamentiGiornalieri.filter(p => p.metodo_pagamento_tipo === 'pos');
  const totaleContanti = contanti.reduce((sum, p) => sum + Number(p.importo), 0);
  const totalePOS = pos.reduce((sum, p) => sum + Number(p.importo), 0);
  const totaleBilancio = totaleContanti + totalePOS;

  // Calcoli per periodo mensile
  const totaleMensile = pagamentiMensili.reduce((sum, p) => sum + Number(p.importo), 0);
  const contantiMensili = pagamentiMensili.filter(p => p.metodo_pagamento_tipo === 'contanti').reduce((sum, p) => sum + Number(p.importo), 0);
  const posMensili = pagamentiMensili.filter(p => p.metodo_pagamento_tipo === 'pos').reduce((sum, p) => sum + Number(p.importo), 0);

  // Calcoli per periodo annuale
  const totaleAnnuale = pagamentiAnnuali.reduce((sum, p) => sum + Number(p.importo), 0);
  const contantiAnnuali = pagamentiAnnuali.filter(p => p.metodo_pagamento_tipo === 'contanti').reduce((sum, p) => sum + Number(p.importo), 0);
  const posAnnuali = pagamentiAnnuali.filter(p => p.metodo_pagamento_tipo === 'pos').reduce((sum, p) => sum + Number(p.importo), 0);

  // Calcoli per anno precedente (stesso periodo)
  const totaleAnnoScorso = pagamentiAnnoScorso.reduce((sum, p) => sum + Number(p.importo), 0);
  const crescitaAnnuale = totaleAnnoScorso > 0 ? ((totaleAnnuale - totaleAnnoScorso) / totaleAnnoScorso) * 100 : 0;

  // Separazione soci/ospiti per calcoli IVA
  const pagamentiSoci = pagamentiGiornalieri.filter(p => p.prenotazioni?.soci);
  const pagamentiOspiti = pagamentiGiornalieri.filter(p => p.prenotazioni?.ospiti);
  const incassoSoci = pagamentiSoci.reduce((sum, p) => sum + Number(p.importo), 0);
  const incassoOspiti = pagamentiOspiti.reduce((sum, p) => sum + Number(p.importo), 0);
  const incassoOspitiNettoIVA = incassoOspiti / 1.11;
  const ivaOspiti = incassoOspiti - incassoOspitiNettoIVA;

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
          <p className="text-muted-foreground">Report Finanziario</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Da:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : <span>Seleziona data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateFrom}
                onSelect={(date) => date && setDateFrom(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">A:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : <span>Seleziona data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateTo}
                onSelect={(date) => date && setDateTo(date)}
                initialFocus
                disabled={(date) => date < dateFrom}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      </div>

      {/* Summary Cards - Periodo Selezionato */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cassa Periodo</CardTitle>
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
            <CardTitle className="text-sm font-medium">POS Periodo</CardTitle>
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
            <CardTitle className="text-sm font-medium">Totale Periodo</CardTitle>
            <Euro className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">€{totaleBilancio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {pagamentiGiornalieri.length} transazioni totali
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Mensile e Annuale */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Incasso Mensile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">€{totaleMensile.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Contanti: €{contantiMensili.toFixed(2)} | POS: €{posMensili.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Incasso Annuale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">€{totaleAnnuale.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Contanti: €{contantiAnnuali.toFixed(2)} | POS: €{posAnnuali.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Anno Precedente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">€{totaleAnnoScorso.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Stesso periodo {dateTo.getFullYear() - 1}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crescita Annuale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${crescitaAnnuale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {crescitaAnnuale >= 0 ? '+' : ''}{crescitaAnnuale.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              vs stesso periodo anno scorso
            </div>
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
              Dal {format(dateFrom, 'dd/MM/yyyy')} al {format(dateTo, 'dd/MM/yyyy')}
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
              Dal {format(dateFrom, 'dd/MM/yyyy')} al {format(dateTo, 'dd/MM/yyyy')}
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