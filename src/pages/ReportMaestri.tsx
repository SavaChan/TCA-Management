import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Download, User, BookOpen, Clock, MoreHorizontal, Trash2, CreditCard, Undo2, Euro, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { db } from '@/lib/database';
import { supabase } from '@/integrations/supabase/client';
import { Prenotazione, Socio, Ospite } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface PrenotazioneConCliente extends Prenotazione {
  clienteNome: string;
  clienteCognome: string;
}

interface MaestroStats {
  maestro: Socio;
  oreCorsi: number;
  oreLezioni: number;
  importoCorsi: number;
  importoLezioni: number;
  importoTotale: number;
  importoCorsiPagato: number;
  importoLezioniPagato: number;
  importoCorsiDaPagare: number;
  importoLezioniDaPagare: number;
  prenotazioni: PrenotazioneConCliente[];
}

export default function ReportMaestri() {
  const [maestriStats, setMaestriStats] = useState<MaestroStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const { toast } = useToast();
  const [dialogState, setDialogState] = useState<{ open: boolean, bookingId: string | null }>({ open: false, bookingId: null });

  const loadMaestriData = async () => {
    try {
      setLoading(true);
      let startDate: string, endDate: string;
      
      if (viewMode === 'month') {
        const [year, month] = selectedMonth.split('-');
        startDate = `${year}-${month}-01`;
        // Calcola l'ultimo giorno del mese corretto
        const monthIndex = parseInt(month) - 1; // Converti a base 0 per Date
        const lastDay = new Date(parseInt(year), monthIndex + 1, 0).getDate();
        endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
      } else {
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      }

      console.log('Report Maestri - Loading data:', { viewMode, startDate, endDate });

      // Carica tutti i dati necessari in parallelo
      const [prenotazioni, allSoci, allOspiti] = await Promise.all([
        db.getPrenotazioni({ data_from: startDate, data_to: endDate }),
        db.getSoci(),
        db.getOspiti()
      ]);

      console.log('Report Maestri - Prenotazioni caricate:', prenotazioni.length);
      console.log('Report Maestri - Corsi/Lezioni:', prenotazioni.filter((p: any) => p.tipo_prenotazione === 'corso' || p.tipo_prenotazione === 'lezione').length);

      // Crea mappa per tutti i soci che fanno corsi/lezioni
      const maestriStatsMap = new Map<string, MaestroStats>();

      // Elabora le prenotazioni per trovare tutti i soci che fanno corsi/lezioni
      prenotazioni.forEach((p: any) => {
        if ((p.tipo_prenotazione === 'corso' || p.tipo_prenotazione === 'lezione') && p.socio_id) {
          const socio = allSoci.find(s => s.id === p.socio_id);
          if (socio && !maestriStatsMap.has(socio.id)) {
            maestriStatsMap.set(socio.id, {
              maestro: socio,
              oreCorsi: 0,
              oreLezioni: 0,
              importoCorsi: 0,
              importoLezioni: 0,
              importoTotale: 0,
              importoCorsiPagato: 0,
              importoLezioniPagato: 0,
              importoCorsiDaPagare: 0,
              importoLezioniDaPagare: 0,
              prenotazioni: []
            });
          }
        }
      });

      // Elabora le prenotazioni per calcolare le statistiche
      prenotazioni.forEach((p: any) => {
        if ((p.tipo_prenotazione === 'corso' || p.tipo_prenotazione === 'lezione') && p.socio_id && maestriStatsMap.has(p.socio_id)) {
          const stats = maestriStatsMap.get(p.socio_id)!;
          const oraInizio = new Date(`2000-01-01T${p.ora_inizio}`);
          const oraFine = new Date(`2000-01-01T${p.ora_fine}`);
          const ore = (oraFine.getTime() - oraInizio.getTime()) / (1000 * 60 * 60);

          if (p.tipo_prenotazione === 'corso') {
            stats.oreCorsi += ore;
            stats.importoCorsi += p.importo;
            if (p.stato_pagamento === 'pagato') {
              stats.importoCorsiPagato += p.importo;
            } else {
              stats.importoCorsiDaPagare += p.importo;
            }
          } else if (p.tipo_prenotazione === 'lezione') {
            stats.oreLezioni += ore;
            stats.importoLezioni += p.importo;
            if (p.stato_pagamento === 'pagato') {
              stats.importoLezioniPagato += p.importo;
            } else {
              stats.importoLezioniDaPagare += p.importo;
            }
          }
          stats.importoTotale += p.importo;
          
          const noteParts = p.note?.split(' - ') || [];
          const clienteNomeCompleto = noteParts.length > 1 ? noteParts[1] : 'Cliente non specificato';
          const [clienteCognome, clienteNome] = clienteNomeCompleto.split(' ');

          stats.prenotazioni.push({ ...p, clienteNome: clienteNome || '', clienteCognome: clienteCognome || '' });
        }
      });

      const finalStats = Array.from(maestriStatsMap.values()).filter(stats => 
        stats.oreCorsi > 0 || stats.oreLezioni > 0
      );
      
      console.log('Report Maestri - Statistiche finali:', finalStats.length, finalStats);
      setMaestriStats(finalStats);
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
  }, [selectedMonth, selectedYear, viewMode]);

  const handleUpdatePagamento = async (bookingId: string, newStatus: 'pagato' | 'da_pagare') => {
    try {
      if (newStatus === 'pagato') {
        const { data: booking } = await supabase.from('prenotazioni').select('importo, tipo_prenotazione').eq('id', bookingId).single();
        if (!booking) throw new Error("Prenotazione non trovata");

        await supabase.from('pagamenti').insert({ prenotazione_id: bookingId, importo: booking.importo, metodo_pagamento: 'Lezione Maestro', metodo_pagamento_tipo: 'altro' });
        await supabase.from('prenotazioni').update({ stato_pagamento: 'pagato' }).eq('id', bookingId);
      } else {
        await supabase.from('pagamenti').delete().eq('prenotazione_id', bookingId);
        await supabase.from('prenotazioni').update({ stato_pagamento: 'da_pagare' }).eq('id', bookingId);
      }
      toast({ title: 'Successo', description: 'Stato del pagamento aggiornato.' });
      loadMaestriData();
    } catch (error) {
      console.error('Errore aggiornamento pagamento:', error);
      toast({ title: 'Errore', description: 'Impossibile aggiornare il pagamento.', variant: 'destructive' });
    }
  };

  const handleDeleteBooking = async () => {
    if (!dialogState.bookingId) return;
    try {
      await supabase.from('prenotazioni').delete().eq('id', dialogState.bookingId);
      toast({ title: 'Successo', description: 'Prenotazione cancellata.' });
      loadMaestriData();
    } catch (error) {
      console.error('Errore cancellazione prenotazione:', error);
      toast({ title: 'Errore', description: 'Impossibile cancellare la prenotazione.', variant: 'destructive' });
    } finally {
      setDialogState({ open: false, bookingId: null });
    }
  };

  const exportToExcel = () => {
    const data = maestriStats.map(stats => ({
      'Maestro': `${stats.maestro.nome} ${stats.maestro.cognome}`,
      'Ore Corsi': stats.oreCorsi,
      'Importo Corsi (€)': stats.importoCorsi.toFixed(2),
      'Corsi Pagato (€)': stats.importoCorsiPagato.toFixed(2),
      'Corsi Da Pagare (€)': stats.importoCorsiDaPagare.toFixed(2),
      'Ore Lezioni': stats.oreLezioni,
      'Importo Lezioni (€)': stats.importoLezioni.toFixed(2),
      'Lezioni Pagato (€)': stats.importoLezioniPagato.toFixed(2),
      'Lezioni Da Pagare (€)': stats.importoLezioniDaPagare.toFixed(2),
      'Ore Totali': (stats.oreCorsi + stats.oreLezioni).toFixed(1),
      'Importo Totale (€)': stats.importoTotale.toFixed(2),
      'Telefono': stats.maestro.telefono || '',
      'Email': stats.maestro.email || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report Maestri');
    const fileName = viewMode === 'month' ? `report-maestri-${selectedMonth}.xlsx` : `report-maestri-${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getPeriodLabel = () => {
    if (viewMode === 'month') {
      const [year, month] = selectedMonth.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    }
    return selectedYear;
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  };


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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Report Maestri</h1>
          <p className="text-muted-foreground mt-1">Periodo: {getPeriodLabel()}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'month' | 'year')}>
            <TabsList>
              <TabsTrigger value="month">Mese</TabsTrigger>
              <TabsTrigger value="year">Anno</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {viewMode === 'month' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded px-3 py-2"
                aria-label="Seleziona mese"
              />
            ) : (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <Button onClick={exportToExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Esporta Excel
          </Button>
        </div>
      </div>

      {/* Report per Maestro */}
      <div className="space-y-4">
        {maestriStats.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nessun dato disponibile per i maestri nel mese selezionato.
            </CardContent>
          </Card>
        ) : (
          maestriStats.map((stats) => (
            <Card key={stats.maestro.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {stats.maestro.nome} {stats.maestro.cognome}
                </CardTitle>
                {stats.maestro.telefono && (
                  <p className="text-sm text-muted-foreground">Tel: {stats.maestro.telefono}</p>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Card riepilogo maestro */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Corsi</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.oreCorsi.toFixed(1)}h</div>
                      <p className="text-xs text-muted-foreground">€{stats.importoCorsi.toFixed(2)}</p>
                      <div className="mt-2 flex gap-2 text-xs">
                        <Badge variant="default" className="bg-green-600">€{stats.importoCorsiPagato.toFixed(2)}</Badge>
                        {stats.importoCorsiDaPagare > 0 && (
                          <Badge variant="destructive">€{stats.importoCorsiDaPagare.toFixed(2)}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Lezioni</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.oreLezioni.toFixed(1)}h</div>
                      <p className="text-xs text-muted-foreground">€{stats.importoLezioni.toFixed(2)}</p>
                      <div className="mt-2 flex gap-2 text-xs">
                        <Badge variant="default" className="bg-green-600">€{stats.importoLezioniPagato.toFixed(2)}</Badge>
                        {stats.importoLezioniDaPagare > 0 && (
                          <Badge variant="destructive">€{stats.importoLezioniDaPagare.toFixed(2)}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Totale Ore</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(stats.oreCorsi + stats.oreLezioni).toFixed(1)}</div>
                      <p className="text-xs text-muted-foreground">ore lavorate</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Totale Incasso</CardTitle>
                      <Euro className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">€{stats.importoTotale.toFixed(2)}</div>
                      <div className="mt-2 flex gap-2 text-xs">
                        <Badge variant="default" className="bg-green-600">
                          €{(stats.importoCorsiPagato + stats.importoLezioniPagato).toFixed(2)}
                        </Badge>
                        {(stats.importoCorsiDaPagare + stats.importoLezioniDaPagare) > 0 && (
                          <Badge variant="destructive">
                            €{(stats.importoCorsiDaPagare + stats.importoLezioniDaPagare).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabella dettaglio prenotazioni */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Dettaglio Prenotazioni</h3>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Orario</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                      <TableHead className="text-center">Stato Pagamento</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.prenotazioni.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.data).toLocaleDateString('it-IT')}</TableCell>
                        <TableCell>{p.ora_inizio.substring(0,5)} - {p.ora_fine.substring(0,5)}</TableCell>
                        <TableCell>{p.clienteCognome} {p.clienteNome}</TableCell>
                        <TableCell><Badge variant="outline">{p.tipo_prenotazione}</Badge></TableCell>
                        <TableCell className="text-right">€{p.importo.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.stato_pagamento === 'pagato' ? 'success' : 'destructive'}>
                            {p.stato_pagamento === 'pagato' ? 'Pagato' : 'Da Pagare'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" title="Azioni"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {p.stato_pagamento === 'da_pagare' ? (
                                <DropdownMenuItem onClick={() => handleUpdatePagamento(p.id, 'pagato')}><CreditCard className="mr-2 h-4 w-4" />Segna come Pagato</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUpdatePagamento(p.id, 'da_pagare')}><Undo2 className="mr-2 h-4 w-4" />Segna come Da Pagare</DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-600" onClick={() => setDialogState({ open: true, bookingId: p.id })}><Trash2 className="mr-2 h-4 w-4" />Annulla Prenotazione</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <AlertDialog open={dialogState.open} onOpenChange={(open) => setDialogState({ open, bookingId: open ? dialogState.bookingId : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione è irreversibile e cancellerà permanentemente la prenotazione.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBooking} className="bg-red-600 hover:bg-red-700">Cancella</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}