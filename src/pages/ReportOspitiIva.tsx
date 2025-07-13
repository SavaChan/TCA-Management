import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Phone, Receipt, Euro, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PrenotazioneOspitePagata {
  id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  campo: number;
  importo: number;
  tipo_prenotazione: string;
  created_at: string;
  ospiti?: {
    nome: string;
    cognome: string;
    telefono: string | null;
  };
  pagamenti: {
    id: string;
    importo: number;
    data_pagamento: string;
    metodo_pagamento: string;
  }[];
}

const ReportOspitiIva = () => {
  const [prenotazioniPagate, setPrenotazioniPagate] = useState<PrenotazioneOspitePagata[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'data' | 'cognome' | 'importo'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const IVA_PERCENTAGE = 0.11; // 11%

  useEffect(() => {
    loadPrenotazioniOspitiPagate();
  }, []);

  const loadPrenotazioniOspitiPagate = async () => {
    try {
      const { data, error } = await supabase
        .from('prenotazioni')
        .select(`
          id,
          data,
          ora_inizio,
          ora_fine,
          campo,
          importo,
          tipo_prenotazione,
          created_at,
          ospiti (
            nome,
            cognome,
            telefono
          ),
          pagamenti!inner (
            id,
            importo,
            data_pagamento,
            metodo_pagamento
          )
        `)
        .eq('stato_pagamento', 'pagato')
        .not('ospite_id', 'is', null)
        .order('data', { ascending: false });

      if (error) throw error;
      setPrenotazioniPagate(data || []);
    } catch (error) {
      console.error('Error loading prenotazioni ospiti pagate:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati delle prenotazioni ospiti pagate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNomeCliente = (prenotazione: PrenotazioneOspitePagata) => {
    if (prenotazione.ospiti) {
      return `${prenotazione.ospiti.cognome} ${prenotazione.ospiti.nome}`;
    }
    return 'Nome non disponibile';
  };

  const getTelefono = (prenotazione: PrenotazioneOspitePagata) => {
    return prenotazione.ospiti?.telefono || 'Non disponibile';
  };

  const getWeekNumber = (date: string) => {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const getDateDetails = (date: string) => {
    const d = new Date(date);
    return {
      giorno: d.getDate(),
      mese: d.getMonth() + 1,
      anno: d.getFullYear(),
      settimana: getWeekNumber(date)
    };
  };

  const calcolaIva = (importo: number) => {
    const imponibile = importo / (1 + IVA_PERCENTAGE);
    const iva = importo - imponibile;
    return {
      totale: importo,
      imponibile: imponibile,
      iva: iva
    };
  };

  const sortedPrenotazioni = [...prenotazioniPagate].sort((a, b) => {
    let valueA: any, valueB: any;

    switch (sortBy) {
      case 'cognome':
        valueA = getNomeCliente(a);
        valueB = getNomeCliente(b);
        break;
      case 'data':
        valueA = new Date(a.data);
        valueB = new Date(b.data);
        break;
      case 'importo':
        valueA = a.importo;
        valueB = b.importo;
        break;
      default:
        return 0;
    }

    if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totaliGenerali = prenotazioniPagate.reduce((acc, prenotazione) => {
    const calcoli = calcolaIva(prenotazione.importo);
    return {
      totale: acc.totale + calcoli.totale,
      imponibile: acc.imponibile + calcoli.imponibile,
      iva: acc.iva + calcoli.iva
    };
  }, { totale: 0, imponibile: 0, iva: 0 });

  if (loading) return <div>Caricamento report IVA ospiti...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Report IVA Ospiti</h1>
          <p className="text-muted-foreground">Prenotazioni ospiti pagate con calcolo IVA (11%)</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Ordina per:</label>
            <Select value={sortBy} onValueChange={(value: 'data' | 'cognome' | 'importo') => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data">Data</SelectItem>
                <SelectItem value="cognome">Cognome</SelectItem>
                <SelectItem value="importo">Importo</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Prenotazioni</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{prenotazioniPagate.length}</div>
            <p className="text-xs text-muted-foreground">
              prenotazioni ospiti pagate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Incassato</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">€{totaliGenerali.totale.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              importo totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imponibile</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totaliGenerali.imponibile.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              senza IVA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA da Versare (11%)</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{totaliGenerali.iva.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              IVA totale
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabella dettagliata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Dettaglio Prenotazioni Ospiti con IVA</span>
          </CardTitle>
          <CardDescription>
            Tutte le prenotazioni di ospiti pagate con calcolo dell'IVA al 11%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedPrenotazioni.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna prenotazione ospite pagata trovata
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Settimana</TableHead>
                  <TableHead>Ora</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead className="text-right">Imponibile</TableHead>
                  <TableHead className="text-right">IVA (11%)</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPrenotazioni.map((prenotazione) => {
                  const dateDetails = getDateDetails(prenotazione.data);
                  const calcoli = calcolaIva(prenotazione.importo);
                  const ultimoPagamento = prenotazione.pagamenti[prenotazione.pagamenti.length - 1];
                  
                  return (
                    <TableRow key={prenotazione.id}>
                      <TableCell className="font-medium">
                        {getNomeCliente(prenotazione)}
                        <Badge variant="outline" className="ml-2 text-xs">
                          Ospite
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{getTelefono(prenotazione)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {dateDetails.giorno}/{dateDetails.mese}/{dateDetails.anno}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          #{dateDetails.settimana}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {prenotazione.ora_inizio} - {prenotazione.ora_fine}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Campo {prenotazione.campo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        €{calcoli.totale.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        €{calcoli.imponibile.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        €{calcoli.iva.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>{new Date(ultimoPagamento.data_pagamento).toLocaleDateString('it-IT')}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {ultimoPagamento.metodo_pagamento}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportOspitiIva;