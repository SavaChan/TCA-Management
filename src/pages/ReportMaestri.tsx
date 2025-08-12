import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, User, BookOpen, Clock, ChevronDown, MoreHorizontal, Trash2, CreditCard, Undo2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  prenotazioni: PrenotazioneConCliente[];
}

export default function ReportMaestri() {
  const [maestriStats, setMaestriStats] = useState<MaestroStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const { toast } = useToast();
  const [dialogState, setDialogState] = useState<{ open: boolean, bookingId: string | null }>({ open: false, bookingId: null });

  const loadMaestriData = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Carica tutti i dati necessari in parallelo
      const [prenotazioni, allSoci, allOspiti] = await Promise.all([
        db.getPrenotazioni({ data_from: startDate, data_to: endDate }),
        db.getSoci(),
        db.getOspiti()
      ]);

      const maestri = allSoci.filter(socio => socio.tipo_socio === 'maestro');
      const sociMap = new Map(allSoci.map(s => [s.id, s]));
      const ospitiMap = new Map(allOspiti.map(o => [o.id, o]));

      const maestriStatsMap = new Map<string, MaestroStats>();
      maestri.forEach(maestro => {
        maestriStatsMap.set(maestro.id, {
          maestro,
          oreCorsi: 0, oreLezioni: 0, importoCorsi: 0, importoLezioni: 0, importoTotale: 0, prenotazioni: []
        });
      });

      // Elabora le prenotazioni per associare i clienti
      prenotazioni.forEach((p: any) => {
        // Questa logica assume che le lezioni/corsi siano prenotate A NOME del maestro.
        // Il cliente della lezione è nella nota.
        // Es. nota: "corso_adulti - Mario Rossi - Lezione con maestro"
        // Mario Rossi è il cliente, non il socio_id della prenotazione (che è il maestro).
        if ((p.tipo_prenotazione === 'corso' || p.tipo_prenotazione === 'lezione') && p.socio_id && maestriStatsMap.has(p.socio_id)) {
          const stats = maestriStatsMap.get(p.socio_id)!;
          const oraInizio = new Date(`2000-01-01T${p.ora_inizio}`);
          const oraFine = new Date(`2000-01-01T${p.ora_fine}`);
          const ore = (oraFine.getTime() - oraInizio.getTime()) / (1000 * 60 * 60);

          if (p.tipo_prenotazione === 'corso') {
            stats.oreCorsi += ore;
            stats.importoCorsi += p.importo;
          } else if (p.tipo_prenotazione === 'lezione') {
            stats.oreLezioni += ore;
            stats.importoLezioni += p.importo;
          }
          stats.importoTotale += p.importo;
          
          const noteParts = p.note?.split(' - ') || [];
          const clienteNomeCompleto = noteParts.length > 1 ? noteParts[1] : 'Cliente non specificato';
          const [clienteCognome, clienteNome] = clienteNomeCompleto.split(' ');

          stats.prenotazioni.push({ ...p, clienteNome: clienteNome || '', clienteCognome: clienteCognome || '' });
        }
      });

      setMaestriStats(Array.from(maestriStatsMap.values()));
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
    <>
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
                aria-label="Seleziona mese"
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

        {/* Dettaglio per Maestro */}
        <div className="space-y-4">
          {maestriStats.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nessun dato disponibile per i maestri nel mese selezionato.
              </CardContent>
            </Card>
          ) : (
            maestriStats.map((stats) => (
              <Collapsible key={stats.maestro.id} className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <button
                    className="w-full p-4 flex justify-between items-center bg-muted/20 hover:bg-muted/40 transition-colors text-left data-[state=open]:bg-muted/50"
                    title={`Mostra/Nascondi dettagli per ${stats.maestro.nome} ${stats.maestro.cognome}`}
                  >
                    <div className="font-bold text-lg">{stats.maestro.nome} {stats.maestro.cognome}</div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">Ore Totali: {(stats.oreCorsi + stats.oreLezioni).toFixed(1)}</span>
                      <span className="text-sm font-semibold">Totale: €{stats.importoTotale.toFixed(2)}</span>
                      <ChevronDown className="h-5 w-5 transition-transform data-[state=open]:rotate-180" />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4">
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
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
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
    </>
  );
}