import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Prenotazione, Socio, Ospite } from '@/types/database';
import { Repeat, Calendar, Clock, Hash, CheckCircle, XCircle, AlertCircle, Trash2, CreditCard } from 'lucide-react';
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
  prenotazioni: (Prenotazione & { soci: Socio | null, ospiti: Ospite | null })[];
}

const GestioneRicorrenti = () => {
  const [ricorrenti, setRicorrenti] = useState<RicorrenteSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<RicorrenteSeries | null>(null);

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

  const getStatusBadge = (series: RicorrenteSeries) => {
    if (series.isCompletelyPaid) {
      return <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={14} /> Saldato</Badge>;
    }
    if (series.isUnpaid) {
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle size={14} /> Da Pagare</Badge>;
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><AlertCircle size={14} /> Parziale ({series.lezioniPagate}/{series.numeroLezioni})</Badge>;
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ricorrenti.map((series) => (
              <Card key={series.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{series.nome}</CardTitle>
                      <CardDescription>{series.tipo.replace(/_/g, ' ')}</CardDescription>
                    </div>
                    {getStatusBadge(series)}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div className="flex items-center text-sm"><Calendar size={14} className="mr-2 text-muted-foreground" /><span>{series.giorno}, {series.dataInizio} - {series.dataFine}</span></div>
                  <div className="flex items-center text-sm"><Clock size={14} className="mr-2 text-muted-foreground" /><span>Ore {series.oraInizio}</span></div>
                  <div className="flex items-center text-sm"><Hash size={14} className="mr-2 text-muted-foreground" /><span>Campo {series.campo}</span></div>
                  {series.noteAggiuntive && (<div className="text-sm italic text-muted-foreground pt-2">Nota: {series.noteAggiuntive}</div>)}
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedSeries(series); setShowCancelDialog(true); }} disabled={isCanceling}><Trash2 size={14} className="mr-1" /> Annulla Serie</Button>
                  <Button size="sm" onClick={() => handlePaySeries(series)} disabled={isPaying || series.isCompletelyPaid}><CreditCard size={14} className="mr-1" /> Registra Pagamento</Button>
                </CardFooter>
              </Card>
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
