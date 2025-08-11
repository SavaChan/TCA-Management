import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tariffa, TipoPrenotazione, TipoCampo } from '@/types/database';

interface TariffaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tariffa?: Tariffa | null;
  onSuccess: () => void;
}

const TariffaDialog = ({ open, onOpenChange, tariffa, onSuccess }: TariffaDialogProps) => {
  const [nome, setNome] = useState('');
  const [tipoPrenotazione, setTipoPrenotazione] = useState<TipoPrenotazione>('singolare');
  const [tipoCampo, setTipoCampo] = useState<TipoCampo>('scoperto');
  const [diurno, setDiurno] = useState(true);
  const [soci, setSoci] = useState(true);
  const [prezzoOra, setPrezzoOra] = useState('');
  const [prezzoMezzOra, setPrezzoMezzOra] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!tariffa;

  useEffect(() => {
    if (tariffa) {
      setNome(tariffa.nome);
      setTipoPrenotazione(tariffa.tipo_prenotazione);
      setTipoCampo(tariffa.tipo_campo);
      setDiurno(tariffa.diurno);
      setSoci(tariffa.soci);
      setPrezzoOra(tariffa.prezzo_ora.toString());
      setPrezzoMezzOra(tariffa.prezzo_mezz_ora.toString());
    } else {
      resetForm();
    }
  }, [tariffa, open]);

  const resetForm = () => {
    setNome('');
    setTipoPrenotazione('singolare');
    setTipoCampo('scoperto');
    setDiurno(true);
    setSoci(true);
    setPrezzoOra('');
    setPrezzoMezzOra('');
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !prezzoOra || !prezzoMezzOra) {
      toast({
        title: "Errore",
        description: "Nome tariffa e prezzi sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    const prezzoOraNum = parseFloat(prezzoOra);
    const prezzoMezzOraNum = parseFloat(prezzoMezzOra);

    if (isNaN(prezzoOraNum) || isNaN(prezzoMezzOraNum) || prezzoOraNum <= 0 || prezzoMezzOraNum <= 0) {
      toast({
        title: "Errore",
        description: "I prezzi devono essere numeri validi maggiori di zero",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const tariffaData = {
        nome: nome.trim(),
        tipo_prenotazione: tipoPrenotazione,
        tipo_campo: tipoCampo,
        diurno,
        soci,
        prezzo_ora: prezzoOraNum,
        prezzo_mezz_ora: prezzoMezzOraNum,
        attivo: true,
      };

      if (isEdit && tariffa) {
        const { error } = await supabase
          .from('tariffe')
          .update(tariffaData)
          .eq('id', tariffa.id);

        if (error) throw error;

        toast({
          title: "Tariffa aggiornata",
          description: `${nome} è stata aggiornata con successo`,
        });
      } else {
        const { error } = await supabase
          .from('tariffe')
          .insert(tariffaData);

        if (error) throw error;

        toast({
          title: "Tariffa aggiunta",
          description: `${nome} è stata aggiunta con successo`,
        });
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tariffa:', error);
      toast({
        title: "Errore",
        description: `Impossibile ${isEdit ? 'aggiornare' : 'aggiungere'} la tariffa`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifica Tariffa' : 'Aggiungi Nuova Tariffa'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Tariffa *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="es. Tariffa Soci Diurna Scoperto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo-prenotazione">Tipo Prenotazione</Label>
              <Select value={tipoPrenotazione} onValueChange={(value: TipoPrenotazione) => setTipoPrenotazione(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="singolare">Singolare</SelectItem>
                  <SelectItem value="doppio">Doppio</SelectItem>
                  <SelectItem value="corso">Corso</SelectItem>
                  <SelectItem value="lezione">Lezione</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-campo">Tipo Campo</Label>
              <Select value={tipoCampo} onValueChange={(value: TipoCampo) => setTipoCampo(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scoperto">Scoperto</SelectItem>
                  <SelectItem value="coperto">Coperto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="diurno"
                checked={diurno}
                onCheckedChange={setDiurno}
              />
              <Label htmlFor="diurno">Orario Diurno</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="soci"
                checked={soci}
                onCheckedChange={setSoci}
              />
              <Label htmlFor="soci">Per Soci</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prezzo-ora">Prezzo per Ora (€) *</Label>
              <Input
                id="prezzo-ora"
                type="number"
                step="0.01"
                min="0"
                value={prezzoOra}
                onChange={(e) => setPrezzoOra(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prezzo-mezz-ora">Prezzo per Mezz'ora (€) *</Label>
              <Input
                id="prezzo-mezz-ora"
                type="number"
                step="0.01"
                min="0"
                value={prezzoMezzOra}
                onChange={(e) => setPrezzoMezzOra(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : (isEdit ? "Aggiorna" : "Aggiungi")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TariffaDialog;