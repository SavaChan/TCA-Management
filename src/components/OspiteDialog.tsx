import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Ospite } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface OspiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ospite?: Ospite;
  onSuccess: () => void;
}

const OspiteDialog = ({ open, onOpenChange, ospite, onSuccess }: OspiteDialogProps) => {
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!ospite;

  useEffect(() => {
    if (ospite) {
      setNome(ospite.nome);
      setCognome(ospite.cognome);
      setTelefono(ospite.telefono || '');
      setEmail(ospite.email || '');
      setNote(ospite.note || '');
    } else {
      resetForm();
    }
  }, [ospite]);

  const resetForm = () => {
    setNome('');
    setCognome('');
    setTelefono('');
    setEmail('');
    setNote('');
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !cognome.trim()) {
      toast({
        title: "Errore",
        description: "Nome e cognome sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const ospiteData = {
        nome: nome.trim(),
        cognome: cognome.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        note: note.trim() || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('ospiti')
          .update(ospiteData)
          .eq('id', ospite.id);

        if (error) throw error;

        toast({
          title: "Successo",
          description: "Ospite aggiornato con successo",
        });
      } else {
        const { error } = await supabase
          .from('ospiti')
          .insert([ospiteData]);

        if (error) throw error;

        toast({
          title: "Successo",
          description: "Ospite creato con successo",
        });
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Error saving ospite:', error);
      toast({
        title: "Errore",
        description: `Impossibile ${isEditing ? 'aggiornare' : 'creare'} l'ospite`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifica Ospite' : 'Nuovo Ospite'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome *</Label>
              <Input
                id="cognome"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                placeholder="Cognome"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Numero di telefono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Indirizzo email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note aggiuntive sull'ospite..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {loading ? (isEditing ? 'Aggiornando...' : 'Creando...') : (isEditing ? 'Aggiorna' : 'Crea')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OspiteDialog;