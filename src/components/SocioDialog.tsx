import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Socio, TipoSocio } from '@/types/database';

interface SocioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socio?: Socio | null;
  onSuccess: () => void;
}

const SocioDialog = ({ open, onOpenChange, socio, onSuccess }: SocioDialogProps) => {
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [tipoSocio, setTipoSocio] = useState<TipoSocio>('frequentatore');
  const [classificaFitp, setClassificaFitp] = useState('');
  const [certificatoMedico, setCertificatoMedico] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!socio;

  useEffect(() => {
    if (socio) {
      setNome(socio.nome);
      setCognome(socio.cognome);
      setTelefono(socio.telefono || '');
      setEmail(socio.email || '');
      setTipoSocio(socio.tipo_socio);
      setClassificaFitp(socio.classifica_fitp || '');
      setCertificatoMedico(socio.certificato_medico_scadenza || '');
      setNote(socio.note || '');
    } else {
      resetForm();
    }
  }, [socio, open]);

  const resetForm = () => {
    setNome('');
    setCognome('');
    setTelefono('');
    setEmail('');
    setTipoSocio('frequentatore');
    setClassificaFitp('');
    setCertificatoMedico('');
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
      const socioData = {
        nome: nome.trim(),
        cognome: cognome.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        tipo_socio: tipoSocio,
        classifica_fitp: classificaFitp.trim() || null,
        certificato_medico_scadenza: certificatoMedico ? certificatoMedico : null,
        note: note.trim() || null,
        attivo: true,
      };

      if (isEdit && socio) {
        const { error } = await supabase
          .from('soci')
          .update(socioData)
          .eq('id', socio.id);

        if (error) throw error;

        toast({
          title: "Socio aggiornato",
          description: `${nome} ${cognome} è stato aggiornato con successo`,
        });
      } else {
        const { error } = await supabase
          .from('soci')
          .insert(socioData);

        if (error) throw error;

        toast({
          title: "Socio aggiunto",
          description: `${nome} ${cognome} è stato aggiunto con successo`,
        });
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving socio:', error);
      toast({
        title: "Errore",
        description: `Impossibile ${isEdit ? 'aggiornare' : 'aggiungere'} il socio`,
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
            {isEdit ? 'Modifica Socio' : 'Aggiungi Nuovo Socio'}
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
                placeholder="Nome del socio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome *</Label>
              <Input
                id="cognome"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                placeholder="Cognome del socio"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo Socio</Label>
            <Select value={tipoSocio} onValueChange={(value: TipoSocio) => setTipoSocio(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frequentatore">Frequentatore</SelectItem>
                <SelectItem value="non_agonista">Non Agonista</SelectItem>
                <SelectItem value="agonista">Agonista</SelectItem>
                <SelectItem value="maestro">Maestro</SelectItem>
              </SelectContent>
            </Select>
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
            <Label htmlFor="classifica">Classifica FITP</Label>
            <Input
              id="classifica"
              value={classificaFitp}
              onChange={(e) => setClassificaFitp(e.target.value)}
              placeholder="es. 3.2, 4.1, NC"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificato">
              Scadenza Certificato Medico
              {tipoSocio !== 'frequentatore' && ' *'}
            </Label>
            <Input
              id="certificato"
              type="date"
              value={certificatoMedico}
              onChange={(e) => setCertificatoMedico(e.target.value)}
            />
            {tipoSocio === 'frequentatore' && (
              <p className="text-xs text-muted-foreground">
                Non richiesto per i frequentatori
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note aggiuntive..."
              rows={3}
            />
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

export default SocioDialog;