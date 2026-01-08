import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Prenotazione, Socio, Ospite } from '@/types/database';
import { Repeat, Calendar, Clock, Hash, CheckCircle, XCircle, AlertCircle, Trash2, CreditCard, ChevronDown, ChevronUp, Euro } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RicorrenteSeries {
  id: string;
  nome: string;
  tipo: string;
  campo: number;
  oraInizio: string;
  giorno: string;
  dataInizio: string;
  dataFine: string;
  numeroLezioni: number;
  lezioniPagate: number;
  isCompletelyPaid: boolean;
  isUnpaid: boolean;
  noteAggiuntive: string;
  importoTotale: number;
  importoPagato: number;
  importoDaPagare: number;
  prenotazioni: (Prenotazione & { soci: Socio | null, ospiti: Ospite | null })[];
}

const GestioneRicorrenti = () => {
  const [ricorrenti, setRicorrenti] = useState<RicorrenteSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<RicorrenteSeries | null>(null);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRicorrenti();
  }, []);

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return correctedDate.toLocaleDateString('it-IT', { weekday: 'long' });
  };

  const loadRicorrenti = async () => {
    setLoading(true);
    try {
      // Carica tutte le prenotazioni con note
      const { data, error } = await supabase
        .from('prenotazioni')
        .select(`*, soci (nome, cognome), ospiti (nome, cognome)`)
        .not('note', 'is', null)
        .order('data', { ascending: true });

      if (error) throw error;

      // Filtra sul client le prenotazioni ricorrenti (note che contengono " - ")
      const ricorrentiData = data.filter(p => p.note && p.note.includes(' - '));

      const groupedByNote = ricorrentiData.reduce((acc, p) => {
        if (!p.note) return acc;
        if (!acc[p.note]) acc[p.note] = [];
        acc[p.note].push(p as any);
        return acc;
      }, {} as Record<string, any[]>);

      // Filtra solo i gruppi con più di una prenotazione (serie ricorrenti)
      const filteredGroups = Object.values(groupedByNote).filter(group => group.length > 1);

      const series = filteredGroups.map((group): RicorrenteSeries => {
        const first = group[0];
        const last = group[group.length - 1];
        const parts = first.note!.split(' - ');
        const totalPaid = group.filter(p => p.stato_pagamento === 'pagato').length;
        const importoTotale = group.reduce((sum, p) => sum + Number(p.importo), 0);
        const importoPagato = group.filter(p => p.stato_pagamento === 'pagato').reduce((sum, p) => sum + Number(p.importo), 0);

        return {
          id: first.note!,
          nome: parts.length > 1 ? parts[1] : 'Sconosciuto',
          tipo: parts[0],
          campo: first.campo,
          oraInizio: first.ora_inizio.substring(0, 5),
          giorno: getDayOfWeek(first.data),
          dataInizio: new Date(first.data).toLocaleDateString('it-IT'),
          dataFine: new Date(last.data).toLocaleDateString('it-IT'),
          numeroLezioni: group.length,
          lezioniPagate: totalPaid,
          isCompletelyPaid: totalPaid === group.length,
          isUnpaid: totalPaid === 0,
          noteAggiuntive: parts.length > 2 ? parts[2] : '',
          importoTotale,
          importoPagato,
          importoDaPagare: importoTotale - importoPagato,
          prenotazioni: group,
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome));

      setRicorrenti(series);
    } catch (err) {
      console.error("Error loading recurring bookings:", err);
      toast({ title: "Errore", description: "Impossibile caricare le prenotazioni ricorrenti.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSeries = async () => {
    if (!selectedSeries) return;
    setIsCanceling(true);
    try {
      const idsToDelete = selectedSeries.prenotazioni.map(p => p.id);
      const { error } = await supabase.from('prenotazioni').delete().in('id', idsToDelete);
      if (error) throw error;
      toast({ title: "Successo", description: `La serie di ${selectedSeries.nome} è stata annullata.` });
      loadRicorrenti();
    } catch (err) {
      console.error("Error canceling series:", err);
      toast({ title: "Errore", description: "Impossibile annullare la serie.", variant: "destructive" });
    } finally {
      setIsCanceling(false);
      setShowCancelDialog(false);
      setSelectedSeries(null);
    }
  };

  const handlePaySeries = async (series: RicorrenteSeries) => {
    setIsPaying(true);
    try {
      const unpaidBookings = series.prenotazioni.filter(p => p.stato_pagamento === 'da_pagare');
      if (unpaidBookings.length === 0) {
        toast({ title: "Attenzione", description: "Questa serie è già stata completamente pagata." });
        return;
      }

      const idsToUpdate = unpaidBookings.map(p => p.id);
      const { error: updateError } = await supabase.from('prenotazioni').update({ stato_pagamento: 'pagato' }).in('id', idsToUpdate);
      if (updateError) throw updateError;

      const paymentsToInsert = unpaidBookings.map(p => ({
        prenotazione_id: p.id,
        importo: p.importo,
        metodo_pagamento: `Pagamento ${series.tipo}`,
        metodo_pagamento_tipo: 'altro',
        note: `Pagamento saldo per serie ricorrente`
      }));

      const { error: insertError } = await supabase.from('pagamenti').insert(paymentsToInsert);
      if (insertError) throw insertError;

      toast({ title: "Successo", description: `Pagamento per la serie di ${series.nome} registrato.` });
      loadRicorrenti();

    } catch (err) {
      console.error("Error paying series:", err);
      toast({ title: "Errore", description: "Impossibile registrare il pagamento.", variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  const handleToggleLessonPayment = async (prenotazione: Prenotazione & { soci: Socio | null, ospiti: Ospite | null }) => {
    try {
      const newStatus = prenotazione.stato_pagamento === 'pagato' ? 'da_pagare' : 'pagato';
      
      // Update the booking status
      const { error: updateError } = await supabase
        .from('prenotazioni')
        .update({ stato_pagamento: newStatus })
        .eq('id', prenotazione.id);
      
      if (updateError) throw updateError;

      // If marking as paid, create a payment record
      if (newStatus === 'pagato') {
        const { error: insertError } = await supabase
          .from('pagamenti')
          .insert({
            prenotazione_id: prenotazione.id,
            importo: prenotazione.importo,
            metodo_pagamento: 'Pagamento singola lezione',
            metodo_pagamento_tipo: 'altro',
            note: 'Pagamento registrato da gestione ricorrenti'
          });
        
        if (insertError) throw insertError;
      } else {
        // If marking as unpaid, remove the payment record
        await supabase
          .from('pagamenti')
          .delete()
          .eq('prenotazione_id', prenotazione.id);
      }

      toast({ 
        title: "Stato aggiornato", 
        description: `Lezione segnata come ${newStatus === 'pagato' ? 'pagata' : 'da pagare'}` 
      });
      loadRicorrenti();
    } catch (err) {
      console.error("Error toggling lesson payment:", err);
      toast({ title: "Errore", description: "Impossibile aggiornare lo stato del pagamento.", variant: "destructive" });
    }
  };

  const getStatusBadge = (series: RicorrenteSeries) => {
    if (series.isCompletelyPaid) {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><CheckCircle size={14} /> Saldato</Badge>;
    }
    if (series.isUnpaid) {
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle size={14} /> Da Pagare</Badge>;
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><AlertCircle size={14} /> Parziale ({series.lezioniPagate}/{series.numeroLezioni})</Badge>;
  };

  const toggleExpanded = (seriesId: string) => {
    setExpandedSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesId)) {
        newSet.delete(seriesId);
      } else {
        newSet.add(seriesId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return <div className="text-center p-8">Caricamento gestione ricorrenti...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Repeat /> Gestione Ricorrenti</h1>
            <p className="text-muted-foreground">Visualizza e gestisci tutti i corsi e gli abbonamenti attivi.</p>
          </div>
        </div>

        {ricorrenti.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nessuna prenotazione ricorrente trovata.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {ricorrenti.map((series) => (
              <Collapsible key={series.id} open={expandedSeries.has(series.id)} onOpenChange={() => toggleExpanded(series.id)}>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl">{series.nome}</CardTitle>
                          {getStatusBadge(series)}
                        </div>
                        <CardDescription className="mt-1">{series.tipo.replace(/_/g, ' ').toUpperCase()}</CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandedSeries.has(series.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center text-sm">
                        <Calendar size={16} className="mr-2 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{series.giorno}</div>
                          <div className="text-xs text-muted-foreground">{series.dataInizio} - {series.dataFine}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock size={16} className="mr-2 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Ore {series.oraInizio}</div>
                          <div className="text-xs text-muted-foreground">Campo {series.campo}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-sm">
                        <Hash size={16} className="mr-2 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{series.numeroLezioni} lezioni</div>
                          <div className="text-xs text-muted-foreground">{series.lezioniPagate} pagate</div>
                        </div>
                      </div>
                      <div className="flex items-center text-sm">
                        <Euro size={16} className="mr-2 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{formatCurrency(series.importoTotale)}</div>
                          <div className="text-xs text-muted-foreground">
                            {series.importoDaPagare > 0 ? `${formatCurrency(series.importoDaPagare)} da pagare` : 'Saldato'}
                          </div>
                        </div>
                      </div>
                    </div>
                    {series.noteAggiuntive && (
                      <div className="text-sm italic text-muted-foreground bg-muted/50 p-3 rounded-md">
                        Note: {series.noteAggiuntive}
                      </div>
                    )}
                    
                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-3">Dettaglio Lezioni</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Orario</TableHead>
                                <TableHead>Campo</TableHead>
                                <TableHead>Importo</TableHead>
                                <TableHead>Stato</TableHead>
                                <TableHead className="text-right">Azioni</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {series.prenotazioni.map((prenotazione) => (
                                <TableRow key={prenotazione.id}>
                                  <TableCell>{new Date(prenotazione.data).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                                  <TableCell>{prenotazione.ora_inizio.substring(0, 5)} - {prenotazione.ora_fine.substring(0, 5)}</TableCell>
                                  <TableCell>Campo {prenotazione.campo}</TableCell>
                                  <TableCell>{formatCurrency(Number(prenotazione.importo))}</TableCell>
                                  <TableCell>
                                    {prenotazione.stato_pagamento === 'pagato' ? (
                                      <Badge variant="default" className="bg-green-600">
                                        <CheckCircle size={12} className="mr-1" /> Pagato
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        <XCircle size={12} className="mr-1" /> Da Pagare
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant={prenotazione.stato_pagamento === 'pagato' ? 'outline' : 'default'}
                                      onClick={() => handleToggleLessonPayment(prenotazione)}
                                    >
                                      {prenotazione.stato_pagamento === 'pagato' ? (
                                        <><XCircle size={14} className="mr-1" /> Segna non pagato</>
                                      ) : (
                                        <><CheckCircle size={14} className="mr-1" /> Segna pagato</>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 bg-muted/30">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSeries(series); setShowCancelDialog(true); }} disabled={isCanceling}>
                      <Trash2 size={14} className="mr-1" /> Annulla Serie
                    </Button>
                    {!series.isCompletelyPaid && (
                      <Button size="sm" onClick={() => handlePaySeries(series)} disabled={isPaying}>
                        <CreditCard size={14} className="mr-1" /> Registra Pagamento ({formatCurrency(series.importoDaPagare)})
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler annullare?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Verranno eliminate tutte le {selectedSeries?.numeroLezioni} prenotazioni per la serie di {selectedSeries?.nome}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedSeries(null)}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSeries} disabled={isCanceling}>
              {isCanceling ? 'Annullamento...' : 'Conferma Annullamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GestioneRicorrenti;
