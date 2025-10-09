import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Prenotazione, Socio, Ospite } from '@/types/database';
import { Calendar, Clock, MapPin, Euro, User, FileText, Trash2, Edit, CreditCard, Scissors } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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

interface BookingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prenotazione: Prenotazione & { soci?: Partial<Socio> | null; ospiti?: Partial<Ospite> | null };
  onSuccess: () => void;
  onOpenPayment: () => void;
}

const BookingDetailDialog = ({
  open,
  onOpenChange,
  prenotazione,
  onSuccess,
  onOpenPayment,
}: BookingDetailDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitStartHour, setSplitStartHour] = useState<string>('');
  const [splitEndHour, setSplitEndHour] = useState<string>('');

  const getNomeCliente = () => {
    if (prenotazione.soci) {
      return `${prenotazione.soci.nome} ${prenotazione.soci.cognome}`;
    } else if (prenotazione.ospiti) {
      return `${prenotazione.ospiti.nome} ${prenotazione.ospiti.cognome} (Ospite)`;
    }
    return 'Nome non disponibile';
  };

  const getTipoPrenotazione = () => {
    const tipi: Record<string, string> = {
      corso: 'Corso',
      lezione: 'Lezione',
      singolare: 'Singolare',
    };
    return tipi[prenotazione.tipo_prenotazione] || prenotazione.tipo_prenotazione;
  };

  const getAvailableHours = () => {
    const start = parseInt(prenotazione.ora_inizio.substring(0, 2));
    const end = parseInt(prenotazione.ora_fine.substring(0, 2));
    const hours = [];
    for (let i = start; i < end; i++) {
      hours.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return hours;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('prenotazioni')
        .delete()
        .eq('id', prenotazione.id);

      if (error) throw error;

      toast({
        title: 'Prenotazione cancellata',
        description: 'La prenotazione è stata cancellata con successo.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile cancellare la prenotazione.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSplitBooking = async () => {
    if (!splitStartHour || !splitEndHour) {
      toast({
        title: 'Errore',
        description: 'Seleziona l\'orario da eliminare.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const originalStart = prenotazione.ora_inizio;
      const originalEnd = prenotazione.ora_fine;
      
      // Elimina la prenotazione originale
      const { error: deleteError } = await supabase
        .from('prenotazioni')
        .delete()
        .eq('id', prenotazione.id);

      if (deleteError) throw deleteError;

      // Crea le prenotazioni rimanenti
      const bookingsToCreate = [];

      // Prima parte (se esiste)
      if (splitStartHour > originalStart) {
        bookingsToCreate.push({
          socio_id: prenotazione.socio_id,
          ospite_id: prenotazione.ospite_id,
          campo: prenotazione.campo,
          data: prenotazione.data,
          ora_inizio: originalStart,
          ora_fine: splitStartHour,
          tipo_prenotazione: prenotazione.tipo_prenotazione,
          tipo_campo: prenotazione.tipo_campo,
          diurno: prenotazione.diurno,
          importo: calculateSplitImporto(originalStart, splitStartHour),
          stato_pagamento: prenotazione.stato_pagamento,
          note: prenotazione.note,
        });
      }

      // Seconda parte (se esiste)
      if (splitEndHour < originalEnd) {
        bookingsToCreate.push({
          socio_id: prenotazione.socio_id,
          ospite_id: prenotazione.ospite_id,
          campo: prenotazione.campo,
          data: prenotazione.data,
          ora_inizio: splitEndHour,
          ora_fine: originalEnd,
          tipo_prenotazione: prenotazione.tipo_prenotazione,
          tipo_campo: prenotazione.tipo_campo,
          diurno: prenotazione.diurno,
          importo: calculateSplitImporto(splitEndHour, originalEnd),
          stato_pagamento: prenotazione.stato_pagamento,
          note: prenotazione.note,
        });
      }

      if (bookingsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('prenotazioni')
          .insert(bookingsToCreate);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Prenotazione modificata',
        description: 'L\'ora selezionata è stata eliminata con successo.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error splitting booking:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile modificare la prenotazione.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowSplitDialog(false);
    }
  };

  const calculateSplitImporto = (start: string, end: string) => {
    const startHour = parseInt(start.substring(0, 2));
    const endHour = parseInt(end.substring(0, 2));
    const hours = endHour - startHour;
    const originalStart = parseInt(prenotazione.ora_inizio.substring(0, 2));
    const originalEnd = parseInt(prenotazione.ora_fine.substring(0, 2));
    const originalHours = originalEnd - originalStart;
    return (prenotazione.importo / originalHours) * hours;
  };

  const isMultiHourBooking = () => {
    const start = parseInt(prenotazione.ora_inizio.substring(0, 2));
    const end = parseInt(prenotazione.ora_fine.substring(0, 2));
    return (end - start) > 1;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Dettaglio Prenotazione
              <Badge variant={prenotazione.stato_pagamento === 'pagato' ? 'default' : 'destructive'}>
                {prenotazione.stato_pagamento === 'pagato' ? 'Pagato' : 'Da Pagare'}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Informazioni complete sulla prenotazione
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente */}
            <div className="flex items-center gap-3">
              <User className="text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{getNomeCliente()}</p>
              </div>
            </div>

            {/* Data e Ora */}
            <div className="flex items-center gap-3">
              <Calendar className="text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">
                  {new Date(prenotazione.data).toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Orario</p>
                <p className="font-medium">
                  {prenotazione.ora_inizio.substring(0, 5)} - {prenotazione.ora_fine.substring(0, 5)}
                </p>
              </div>
            </div>

            {/* Campo */}
            <div className="flex items-center gap-3">
              <MapPin className="text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Campo</p>
                <p className="font-medium">
                  Campo {prenotazione.campo} - {prenotazione.tipo_campo === 'coperto' ? 'Coperto' : 'Scoperto'}
                </p>
              </div>
            </div>

            {/* Tipo Prenotazione */}
            <div className="flex items-center gap-3">
              <FileText className="text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Tipo Prenotazione</p>
                <p className="font-medium">{getTipoPrenotazione()}</p>
              </div>
            </div>

            {/* Importo */}
            <div className="flex items-center gap-3">
              <Euro className="text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Importo</p>
                <p className="font-medium text-lg">€ {prenotazione.importo}</p>
              </div>
            </div>

            {/* Note */}
            {prenotazione.note && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Note</p>
                <p className="text-sm">{prenotazione.note}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 size={16} className="mr-2" />
                Cancella Tutto
              </Button>
              {isMultiHourBooking() && (
                <Button
                  variant="outline"
                  onClick={() => setShowSplitDialog(true)}
                  disabled={isDeleting}
                >
                  <Scissors size={16} className="mr-2" />
                  Elimina Ore
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {prenotazione.stato_pagamento === 'da_pagare' && (
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onOpenPayment();
                  }}
                >
                  <CreditCard size={16} className="mr-2" />
                  Registra Pagamento
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Chiudi
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cancellazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler cancellare questa prenotazione? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Cancellazione...' : 'Conferma'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Ore Specifiche</AlertDialogTitle>
            <AlertDialogDescription>
              Seleziona l'intervallo orario da eliminare. Le ore rimanenti verranno mantenute.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Ora Inizio</label>
              <Select value={splitStartHour} onValueChange={setSplitStartHour}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ora inizio" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableHours().map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Ora Fine</label>
              <Select value={splitEndHour} onValueChange={setSplitEndHour}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ora fine" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableHours().slice(1).map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                  <SelectItem value={prenotazione.ora_fine}>
                    {prenotazione.ora_fine.substring(0, 5)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleSplitBooking} disabled={isDeleting}>
              {isDeleting ? 'Elaborazione...' : 'Conferma'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BookingDetailDialog;
