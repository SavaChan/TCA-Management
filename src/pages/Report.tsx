import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Euro, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Prenotazione } from '@/types/database';
import { toast } from '@/hooks/use-toast';

const Report = () => {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadReport();
  }, [selectedMonth, selectedYear]);

  const loadReport = async () => {
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);

      const { data, error } = await supabase
        .from('prenotazioni')
        .select(`
          *,
          soci (
            nome,
            cognome,
            telefono
          )
        `)
        .gte('data', startDate.toISOString().split('T')[0])
        .lte('data', endDate.toISOString().split('T')[0])
        .order('data', { ascending: true });

      if (error) throw error;
      setPrenotazioni(data || []);
    } catch (error) {
      console.error('Error loading report:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMonthStats = () => {
    const pagate = prenotazioni.filter(p => p.stato_pagamento === 'pagato');
    const daPagare = prenotazioni.filter(p => p.stato_pagamento === 'da_pagare');
    
    return {
      totalePrenotazioni: prenotazioni.length,
      prenotazioniPagate: pagate.length,
      prenotazioniDaPagare: daPagare.length,
      incassoTotale: pagate.reduce((sum, p) => sum + p.importo, 0),
      creditiDaRiscuotere: daPagare.reduce((sum, p) => sum + p.importo, 0),
    };
  };

  const getDaPagareReport = () => {
    return prenotazioni
      .filter(p => p.stato_pagamento === 'da_pagare')
      .sort((a, b) => {
        const nomeA = `${a.soci?.cognome} ${a.soci?.nome}`;
        const nomeB = `${b.soci?.cognome} ${b.soci?.nome}`;
        return nomeA.localeCompare(nomeB);
      });
  };

  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const stats = getMonthStats();
  const daPagareReport = getDaPagareReport();

  if (loading) return <div>Caricamento report...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Report e Statistiche</h2>
          <p className="text-muted-foreground">
            Analisi dei pagamenti e delle prenotazioni
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistiche mensili */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prenotazioni Totali
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalePrenotazioni}</div>
            <p className="text-xs text-muted-foreground">
              {months[selectedMonth]} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prenotazioni Pagate
            </CardTitle>
            <div className="h-4 w-4 bg-blue-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.prenotazioniPagate}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalePrenotazioni > 0 ? Math.round((stats.prenotazioniPagate / stats.totalePrenotazioni) * 100) : 0}% del totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Da Pagare
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.prenotazioniDaPagare}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalePrenotazioni > 0 ? Math.round((stats.prenotazioniDaPagare / stats.totalePrenotazioni) * 100) : 0}% del totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Incassi
            </CardTitle>
            <Euro className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{stats.incassoTotale.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Pagamenti ricevuti
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Crediti
            </CardTitle>
            <Euro className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">€{stats.creditiDaRiscuotere.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Da riscuotere
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report prenotazioni da pagare */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Prenotazioni da Pagare</CardTitle>
              <CardDescription>
                Elenco dettagliato ordinato alfabeticamente per cognome
              </CardDescription>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Esporta PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {daPagareReport.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nessuna prenotazione da pagare</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Socio</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Orario</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daPagareReport.map((prenotazione) => (
                  <TableRow key={prenotazione.id}>
                    <TableCell className="font-medium">
                      {prenotazione.soci?.cognome} {prenotazione.soci?.nome}
                    </TableCell>
                    <TableCell>{prenotazione.soci?.telefono || '-'}</TableCell>
                    <TableCell>
                      {new Date(prenotazione.data).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {prenotazione.ora_inizio} - {prenotazione.ora_fine}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Campo {prenotazione.campo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {prenotazione.tipo_prenotazione}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      €{prenotazione.importo.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Report;