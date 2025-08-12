import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, User, BookOpen, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface MaestroStats {
  maestro: {
    id: string;
    nome: string;
    cognome: string;
    telefono?: string;
    email?: string;
    tipo_socio: string;
  };
  oreCorsi: number;
  oreLezioni: number;
  importoCorsi: number;
  importoLezioni: number;
  importoTotale: number;
  prenotazioni: Array<{
    id: string;
    socio_id?: string;
    campo: number;
    data: string;
    ora_inizio: string;
    ora_fine: string;
    tipo_prenotazione: string;
    importo: number;
    stato_pagamento: string;
  }>;
}

export default function ReportMaestri() {
  const [maestriStats, setMaestriStats] = useState<MaestroStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const loadMaestriData = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Carica prenotazioni del mese per maestri
      const { data: prenotazioni, error: prenotazioniError } = await supabase
        .from('prenotazioni')
        .select(`
          id, socio_id, campo, data, ora_inizio, ora_fine, 
          tipo_prenotazione, importo, stato_pagamento
        `)
        .gte('data', startDate)
        .lte('data', endDate)
        .not('socio_id', 'is', null);

      if (prenotazioniError) throw prenotazioniError;

      // Carica tutti i soci per filtrare i maestri
      const { data: soci, error: sociError } = await supabase
        .from('soci')
        .select('id, nome, cognome, telefono, email, tipo_socio')
        .eq('tipo_socio', 'maestro')
        .eq('attivo', true);

      if (sociError) throw sociError;

      const maestriStatsMap = new Map<string, MaestroStats>();

      (soci || []).forEach(maestro => {
        maestriStatsMap.set(maestro.id, {
          maestro,
          oreCorsi: 0,
          oreLezioni: 0,
          importoCorsi: 0,
          importoLezioni: 0,
          importoTotale: 0,
          prenotazioni: []
        });
      });

      // Elabora le prenotazioni dei maestri
      (prenotazioni || []).forEach((prenotazione) => {
        if (prenotazione.socio_id && maestriStatsMap.has(prenotazione.socio_id)) {
          const stats = maestriStatsMap.get(prenotazione.socio_id)!;
          
          // Calcola ore
          const oraInizio = new Date(`2000-01-01T${prenotazione.ora_inizio}`);
          const oraFine = new Date(`2000-01-01T${prenotazione.ora_fine}`);
          const ore = (oraFine.getTime() - oraInizio.getTime()) / (1000 * 60 * 60);

          if (prenotazione.tipo_prenotazione === 'corso') {
            stats.oreCorsi += ore;
            stats.importoCorsi += Number(prenotazione.importo);
          } else if (prenotazione.tipo_prenotazione === 'lezione') {
            stats.oreLezioni += ore;
            stats.importoLezioni += Number(prenotazione.importo);
          }

          stats.importoTotale += Number(prenotazione.importo);
          stats.prenotazioni.push(prenotazione);
          
          maestriStatsMap.set(prenotazione.socio_id, stats);
        }
      });

      setMaestriStats(Array.from(maestriStatsMap.values()).filter(stats => 
        stats.oreCorsi > 0 || stats.oreLezioni > 0
      ));
    } catch (error) {
      console.error('Errore nel caricamento dati maestri:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati dei maestri",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaestriData();
  }, [selectedMonth]);

  const exportToExcel = () => {
    const data = maestriStats.map(stats => ({
      'Maestro': `${stats.maestro.nome} ${stats.maestro.cognome}`,
      'Ore Corsi': stats.oreCorsi,
      'Importo Corsi (€)': stats.importoCorsi.toFixed(2),
      'Ore Lezioni': stats.oreLezioni,
      'Importo Lezioni (€)': stats.importoLezioni.toFixed(2),
      'Ore Totali': (stats.oreCorsi + stats.oreLezioni).toFixed(1),
      'Importo Totale (€)': stats.importoTotale.toFixed(2),
      'Telefono': stats.maestro.telefono || '',
      'Email': stats.maestro.email || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report Maestri');
    XLSX.writeFile(wb, `report-maestri-${selectedMonth}.xlsx`);
  };

  const getTotali = () => {
    return maestriStats.reduce((acc, stats) => ({
      oreCorsi: acc.oreCorsi + stats.oreCorsi,
      oreLezioni: acc.oreLezioni + stats.oreLezioni,
      importoCorsi: acc.importoCorsi + stats.importoCorsi,
      importoLezioni: acc.importoLezioni + stats.importoLezioni,
      importoTotale: acc.importoTotale + stats.importoTotale
    }), {
      oreCorsi: 0,
      oreLezioni: 0,
      importoCorsi: 0,
      importoLezioni: 0,
      importoTotale: 0
    });
  };

  const totali = getTotali();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Caricamento report maestri...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Report Maestri</h1>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <Button onClick={exportToExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Esporta Excel
          </Button>
        </div>
      </div>

      {/* Cards riassunto */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maestri Attivi</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maestriStats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ore Corsi</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totali.oreCorsi.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">€{totali.importoCorsi.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ore Lezioni</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totali.oreLezioni.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">€{totali.importoLezioni.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Fatturato</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totali.importoTotale.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{(totali.oreCorsi + totali.oreLezioni).toFixed(1)} ore</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabella maestri */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio Maestri - {selectedMonth}</CardTitle>
        </CardHeader>
        <CardContent>
          {maestriStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun maestro ha registrato ore nel mese selezionato
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Maestro</TableHead>
                  <TableHead>Contatti</TableHead>
                  <TableHead className="text-center">Ore Corsi</TableHead>
                  <TableHead className="text-center">Importo Corsi</TableHead>
                  <TableHead className="text-center">Ore Lezioni</TableHead>
                  <TableHead className="text-center">Importo Lezioni</TableHead>
                  <TableHead className="text-center">Totale Ore</TableHead>
                  <TableHead className="text-center">Totale Importo</TableHead>
                  <TableHead className="text-center">Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maestriStats.map((stats) => {
                  const oreTotali = stats.oreCorsi + stats.oreLezioni;
                  const hasInsoluti = stats.prenotazioni.some(p => p.stato_pagamento === 'da_pagare');
                  
                  return (
                    <TableRow key={stats.maestro.id}>
                      <TableCell className="font-medium">
                        {stats.maestro.nome} {stats.maestro.cognome}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {stats.maestro.telefono && <div>{stats.maestro.telefono}</div>}
                          {stats.maestro.email && <div className="text-muted-foreground">{stats.maestro.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{stats.oreCorsi.toFixed(1)}</TableCell>
                      <TableCell className="text-center">€{stats.importoCorsi.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{stats.oreLezioni.toFixed(1)}</TableCell>
                      <TableCell className="text-center">€{stats.importoLezioni.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-medium">{oreTotali.toFixed(1)}</TableCell>
                      <TableCell className="text-center font-medium">€{stats.importoTotale.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={hasInsoluti ? "destructive" : "default"}>
                          {hasInsoluti ? "Insoluto" : "Pagato"}
                        </Badge>
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
}