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
import { Calendar, Clock, MapPin, Euro, User, FileText, Trash2, Edit, CreditCard } from 'lucide-react';
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
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 size={16} className="mr-2" />
              Cancella
            </Button>
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
    </>
  );
};

export default BookingDetailDialog;
