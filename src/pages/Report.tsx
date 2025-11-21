import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Euro, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Prenotazione } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { it } from 'date-fns/locale';

type ViewMode = 'week' | 'month' | 'year';

const Report = () => {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadReport();
  }, [viewMode, selectedWeek, selectedMonth, selectedYear]);

  const getDateRange = () => {
    let startDate: Date;
    let endDate: Date;

    switch (viewMode) {
      case 'week':
        startDate = startOfWeek(selectedWeek, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedWeek, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 0);
        break;
      case 'year':
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31);
        break;
    }

    return { startDate, endDate };
  };

  const loadReport = async () => {
    try {
      const { startDate, endDate } = getDateRange();

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

  const getPeriodLabel = () => {
    switch (viewMode) {
      case 'week':
        const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
        return `${format(weekStart, 'dd MMM', { locale: it })} - ${format(weekEnd, 'dd MMM yyyy', { locale: it })}`;
      case 'month':
        return `${months[selectedMonth]} ${selectedYear}`;
      case 'year':
        return `${selectedYear}`;
    }
  };

  const getWeekOptions = () => {
    const weeks = [];
    const currentYear = selectedYear;
    let date = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    while (date <= endOfYear) {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      
      if (weekStart.getFullYear() === currentYear || weekEnd.getFullYear() === currentYear) {
        weeks.push({
          value: weekStart.toISOString(),
          label: `Settimana ${format(weekStart, 'dd MMM', { locale: it })} - ${format(weekEnd, 'dd MMM', { locale: it })}`
        });
      }
      
      date = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    return weeks;
  };

  const exportToExcel = () => {
    const data = daPagareReport.map(p => ({
      'Socio': `${p.soci?.cognome} ${p.soci?.nome}`,
      'Telefono': p.soci?.telefono || '-',
      'Data': new Date(p.data).toLocaleDateString('it-IT'),
      'Orario': `${p.ora_inizio} - ${p.ora_fine}`,
      'Campo': `Campo ${p.campo}`,
      'Tipo': p.tipo_prenotazione,
      'Importo': `€${p.importo.toFixed(2)}`
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Da Pagare');
    
    const fileName = `report_da_pagare_${viewMode}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Export completato",
      description: "Il file Excel è stato scaricato con successo",
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Report e Statistiche</h2>
          <p className="text-muted-foreground">
            Analisi dei pagamenti e delle prenotazioni
          </p>
        </div>
        <div className="flex flex-col items-end space-y-3">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="week">Settimana</TabsTrigger>
              <TabsTrigger value="month">Mese</TabsTrigger>
              <TabsTrigger value="year">Anno</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center space-x-2">
            {viewMode === 'week' && (
              <>
                <Select 
                  value={selectedWeek.toISOString()} 
                  onValueChange={(value) => setSelectedWeek(new Date(value))}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getWeekOptions().map((week) => (
                      <SelectItem key={week.value} value={week.value}>
                        {week.label}
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
              </>
            )}
            
            {viewMode === 'month' && (
              <>
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
              </>
            )}
            
            {viewMode === 'year' && (
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32">
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
            )}
          </div>
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
              {getPeriodLabel()}
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
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Esporta Excel
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