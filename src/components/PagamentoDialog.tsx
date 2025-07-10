import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Banknote } from 'lucide-react';

interface PagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prenotazioneId: string;
  importoTotale: number;
  nomeCliente: string;
  onSuccess: () => void;
}

const PagamentoDialog = ({ open, onOpenChange, prenotazioneId, importoTotale, nomeCliente, onSuccess }: PagamentoDialogProps) => {
  const [metodoPagamento, setMetodoPagamento] = useState<'contanti' | 'pos'>('contanti');
  const [importo, setImporto] = useState(importoTotale.toString());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!importo || parseFloat(importo) <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci un importo valido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Registra il pagamento
      const { error: pagamentoError } = await supabase
        .from('pagamenti')
        .insert({
          prenotazione_id: prenotazioneId,
          importo: parseFloat(importo),
          metodo_pagamento_tipo: metodoPagamento,
          metodo_pagamento: metodoPagamento === 'contanti' ? 'Contanti' : 'POS',
          note: note || undefined,
        });

      if (pagamentoError) throw pagamentoError;

      // Aggiorna lo stato della prenotazione a pagato
      const { error: prenotazioneError } = await supabase
        .from('prenotazioni')
        .update({ stato_pagamento: 'pagato' })
        .eq('id', prenotazioneId);

      if (prenotazioneError) throw prenotazioneError;

      toast({
        title: "Pagamento registrato",
        description: `Pagamento di €${importo} registrato con successo ${metodoPagamento === 'contanti' ? 'in cassa' : 'via POS'}`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Errore",
        description: "Impossibile registrare il pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMetodoPagamento('contanti');
    setImporto(importoTotale.toString());
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registra Pagamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium">Cliente: {nomeCliente}</p>
            <p className="text-sm text-muted-foreground">Importo totale: €{importoTotale}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodo">Metodo di Pagamento</Label>
            <Select value={metodoPagamento} onValueChange={(value: 'contanti' | 'pos') => setMetodoPagamento(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contanti">
                  <div className="flex items-center space-x-2">
                    <Banknote className="h-4 w-4" />
                    <span>Contanti (va in cassa)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pos">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>POS (bilancio elettronico)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {metodoPagamento === 'contanti' && (
              <p className="text-xs text-muted-foreground">
                💰 I contanti andranno nella cassa fisica del club
              </p>
            )}
            {metodoPagamento === 'pos' && (
              <p className="text-xs text-muted-foreground">
                💳 Il pagamento POS andrà nel bilancio ma non nella cassa fisica
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="importo">Importo</Label>
            <Input
              id="importo"
              type="number"
              step="0.01"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (opzionale)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note aggiuntive sul pagamento..."
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Registrando..." : "Registra Pagamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PagamentoDialog;