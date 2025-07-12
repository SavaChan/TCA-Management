import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Socio, Ospite, TipoPrenotazione, TipoCampo } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PrenotazioneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: string;
  oraInizio: string;
  campo: number;
  onSuccess: () => void;
}

const PrenotazioneDialog = ({ 
  open, 
  onOpenChange, 
  data, 
  oraInizio, 
  campo, 
  onSuccess 
}: PrenotazioneDialogProps) => {
  const [tipoCliente, setTipoCliente] = useState<'socio' | 'ospite'>('socio');
  const [soci, setSoci] = useState<Socio[]>([]);
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [socioSearch, setSocioSearch] = useState('');
  const [openSocioCombobox, setOpenSocioCombobox] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Dati ospite
  const [ospiteNome, setOspiteNome] = useState('');
  const [ospiteCognome, setOspiteCognome] = useState('');
  const [ospiteTelefono, setOspiteTelefono] = useState('');
  
  // Dati prenotazione
  const [tipoPrenotazione, setTipoPrenotazione] = useState<TipoPrenotazione>('singolare');
  const [importo, setImporto] = useState<number>(0);

  useEffect(() => {
    if (open) {
      loadSoci();
      calculateTariff();
    }
  }, [open, tipoPrenotazione]);

  const loadSoci = async () => {
    try {
      const { data: sociData, error } = await supabase
        .from('soci')
        .select('*')
        .eq('attivo', true)
        .order('cognome', { ascending: true });

      if (error) throw error;
      setSoci(sociData || []);
    } catch (error) {
      console.error('Error loading soci:', error);
    }
  };

  const calculateTariff = async () => {
    try {
      const ora = parseInt(oraInizio.split(':')[0]);
      const isDiurno = ora >= 8 && ora < 20;
      const isSocio = tipoCliente === 'socio';

      const { data: tariffaData, error } = await supabase
        .from('tariffe')
        .select('*')
        .eq('tipo_prenotazione', tipoPrenotazione)
        .eq('tipo_campo', 'scoperto') // Assumo campo scoperto per ora
        .eq('diurno', isDiurno)
        .eq('soci', isSocio)
        .eq('attivo', true)
        .single();

      if (error || !tariffaData) {
        // Se non trova tariffa specifica, usa una di default
        setImporto(isSocio ? 15 : 20);
      } else {
        setImporto(tariffaData.prezzo_ora);
      }
    } catch (error) {
      console.error('Error calculating tariff:', error);
      setImporto(15);
    }
  };

  const filteredSoci = soci.filter(socio =>
    `${socio.nome} ${socio.cognome}`.toLowerCase().includes(socioSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (tipoCliente === 'socio' && !selectedSocio) {
      toast({
        title: "Errore",
        description: "Seleziona un socio",
        variant: "destructive",
      });
      return;
    }

    if (tipoCliente === 'ospite' && (!ospiteNome || !ospiteCognome)) {
      toast({
        title: "Errore",
        description: "Inserisci nome e cognome dell'ospite",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Prima controlla se lo slot è già occupato
      const { data: existingPrenotazione, error: checkError } = await supabase
        .from('prenotazioni')
        .select('id')
        .eq('data', data)
        .eq('ora_inizio', oraInizio)
        .eq('campo', campo)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 significa "no rows found", che è quello che vogliamo
        throw checkError;
      }

      if (existingPrenotazione) {
        toast({
          title: "Errore",
          description: "Quest'ora è già prenotata",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let socioId = null;
      let ospiteId = null;

      if (tipoCliente === 'ospite') {
        // Crea ospite
        const { data: ospiteData, error: ospiteError } = await supabase
          .from('ospiti')
          .insert([{
            nome: ospiteNome,
            cognome: ospiteCognome,
            telefono: ospiteTelefono || null,
          }])
          .select()
          .single();

        if (ospiteError) throw ospiteError;
        ospiteId = ospiteData.id;
      } else {
        socioId = selectedSocio!.id;
      }

      // Calcola ora fine (1 ora dopo)
      const oraFine = `${(parseInt(oraInizio.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;

      // Crea prenotazione
      const { error: prenotazioneError } = await supabase
        .from('prenotazioni')
        .insert([{
          socio_id: socioId,
          ospite_id: ospiteId,
          campo,
          data,
          ora_inizio: oraInizio,
          ora_fine: oraFine,
          tipo_prenotazione: tipoPrenotazione,
          tipo_campo: 'scoperto',
          diurno: parseInt(oraInizio.split(':')[0]) >= 8 && parseInt(oraInizio.split(':')[0]) < 20,
          importo,
          stato_pagamento: 'da_pagare',
        }]);

      if (prenotazioneError) {
        // Se è un errore di vincolo univoco
        if (prenotazioneError.code === '23505') {
          toast({
            title: "Errore",
            description: "Quest'ora è già prenotata",
            variant: "destructive",
          });
        } else {
          throw prenotazioneError;
        }
        setLoading(false);
        return;
      }

      toast({
        title: "Successo",
        description: "Prenotazione creata con successo",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating prenotazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la prenotazione",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTipoCliente('socio');
    setSelectedSocio(null);
    setSocioSearch('');
    setOspiteNome('');
    setOspiteCognome('');
    setOspiteTelefono('');
    setTipoPrenotazione('singolare');
    setImporto(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Nuova Prenotazione - Campo {campo}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(data).toLocaleDateString('it-IT')} alle {oraInizio}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo Cliente */}
          <div className="space-y-2">
            <Label>Tipo Cliente</Label>
            <RadioGroup value={tipoCliente} onValueChange={(value: 'socio' | 'ospite') => setTipoCliente(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="socio" id="socio" />
                <Label htmlFor="socio">Socio</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ospite" id="ospite" />
                <Label htmlFor="ospite">Ospite</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Selezione Socio */}
          {tipoCliente === 'socio' && (
            <div className="space-y-2">
              <Label>Socio</Label>
              <Popover open={openSocioCombobox} onOpenChange={setOpenSocioCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSocioCombobox}
                    className="w-full justify-between"
                  >
                    {selectedSocio
                      ? `${selectedSocio.nome} ${selectedSocio.cognome}`
                      : "Seleziona socio..."
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Cerca socio..." 
                      value={socioSearch}
                      onValueChange={setSocioSearch}
                    />
                    <CommandEmpty>Nessun socio trovato.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {filteredSoci.map((socio) => (
                          <CommandItem
                            key={socio.id}
                            value={`${socio.nome} ${socio.cognome}`}
                            onSelect={() => {
                              setSelectedSocio(socio);
                              setOpenSocioCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSocio?.id === socio.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {socio.nome} {socio.cognome}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {socio.tipo_socio}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Dati Ospite */}
          {tipoCliente === 'ospite' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={ospiteNome}
                    onChange={(e) => setOspiteNome(e.target.value)}
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <Label htmlFor="cognome">Cognome *</Label>
                  <Input
                    id="cognome"
                    value={ospiteCognome}
                    onChange={(e) => setOspiteCognome(e.target.value)}
                    placeholder="Cognome"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  value={ospiteTelefono}
                  onChange={(e) => setOspiteTelefono(e.target.value)}
                  placeholder="Telefono (opzionale)"
                />
              </div>
            </div>
          )}

          {/* Tipo Prenotazione */}
          <div className="space-y-2">
            <Label>Tipo Prenotazione</Label>
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

          {/* Importo */}
          <div className="space-y-2">
            <Label htmlFor="importo">Importo (€)</Label>
            <Input
              id="importo"
              type="number"
              step="0.01"
              value={importo}
              onChange={(e) => setImporto(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Pulsanti */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Crea Prenotazione'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrenotazioneDialog;