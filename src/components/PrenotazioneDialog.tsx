import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Socio, Ospite, TipoPrenotazione, TipoCampo, Tariffa } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import SocioDialog from './SocioDialog';
import OspiteDialog from './OspiteDialog';

interface PrenotazioneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: string;
  oraInizio: string;
  campo: number;
  onSuccess: () => void;
  multipleSlots?: { campo: number; data: string; ora: string; }[];
}

const PrenotazioneDialog = ({ 
  open, 
  onOpenChange, 
  data, 
  oraInizio, 
  campo, 
  onSuccess,
  multipleSlots 
}: PrenotazioneDialogProps) => {
  const [tipoCliente, setTipoCliente] = useState<'socio' | 'ospite'>('socio');
  const [soci, setSoci] = useState<Socio[]>([]);
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [socioSearch, setSocioSearch] = useState('');
  const [openSocioCombobox, setOpenSocioCombobox] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Gestione ospiti esistenti
  const [ospiti, setOspiti] = useState<Ospite[]>([]);
  const [selectedOspite, setSelectedOspite] = useState<Ospite | null>(null);
  const [ospiteSearch, setOspiteSearch] = useState('');
  const [openOspiteCombobox, setOpenOspiteCombobox] = useState(false);
  
  // Dati ospite
  const [ospiteNome, setOspiteNome] = useState('');
  const [ospiteCognome, setOspiteCognome] = useState('');
  const [ospiteTelefono, setOspiteTelefono] = useState('');
  const [ospiteEmail, setOspiteEmail] = useState('');
  
  // Dati prenotazione
  const [tipoPrenotazione, setTipoPrenotazione] = useState<TipoPrenotazione>('singolare');
  const [importo, setImporto] = useState<number>(0);
  const [tariffe, setTariffe] = useState<Tariffa[]>([]);
  const [selectedTariffaId, setSelectedTariffaId] = useState<string>('manuale');
  const [note, setNote] = useState<string>('');
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  // Stati per dialog di creazione
  const [showSocioDialog, setShowSocioDialog] = useState(false);
  const [showOspiteDialog, setShowOspiteDialog] = useState(false);
  useEffect(() => {
    if (open) {
      loadSoci();
      loadOspiti();
      loadTariffe();
    }
  }, [open]);

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

  const loadOspiti = async () => {
    try {
      const { data: ospitiData, error } = await supabase
        .from('ospiti')
        .select('*')
        .order('cognome', { ascending: true });

      if (error) throw error;
      setOspiti(ospitiData || []);
    } catch (error) {
      console.error('Error loading ospiti:', error);
    }
  };

  const loadTariffe = async () => {
    try {
      const { data: tariffeData, error } = await supabase
        .from('tariffe')
        .select('*')
        .eq('attivo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      
      setTariffe(tariffeData || []);
      
      // Non selezioniamo automaticamente una tariffa, lasciamo scegliere l'utente
      setSelectedTariffaId('manuale');
      setImporto(0);
    } catch (error) {
      console.error('Error loading tariffe:', error);
      setSelectedTariffaId('manuale');
      setImporto(0);
    }
  };

  const handleTariffaChange = (tariffaId: string) => {
    setSelectedTariffaId(tariffaId);
    
    if (tariffaId === 'manuale') {
      // Mantieni l'importo corrente per modifica manuale
      return;
    }
    
    const tariffa = tariffe.find(t => t.id === tariffaId);
    if (tariffa) {
      setImporto(tariffa.prezzo_ora);
    }
  };

  const filteredSoci = soci.filter(socio =>
    `${socio.nome} ${socio.cognome}`.toLowerCase().includes(socioSearch.toLowerCase())
  );

  const filteredOspiti = ospiti.filter(ospite =>
    `${ospite.nome} ${ospite.cognome}`.toLowerCase().includes(ospiteSearch.toLowerCase())
  );

  // Effetto per compilare automaticamente i campi quando si seleziona un ospite esistente
  useEffect(() => {
    if (selectedOspite) {
      setOspiteNome(selectedOspite.nome);
      setOspiteCognome(selectedOspite.cognome);
      setOspiteTelefono(selectedOspite.telefono || '');
      setOspiteEmail(selectedOspite.email || '');
    }
  }, [selectedOspite]);

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
        if (selectedOspite) {
          // Usa ospite esistente
          ospiteId = selectedOspite.id;
          
          // Aggiorna i dati dell'ospite se sono stati modificati
          if (ospiteNome !== selectedOspite.nome || 
              ospiteCognome !== selectedOspite.cognome || 
              ospiteTelefono !== (selectedOspite.telefono || '') ||
              ospiteEmail !== (selectedOspite.email || '')) {
            await supabase
              .from('ospiti')
              .update({
                nome: ospiteNome,
                cognome: ospiteCognome,
                telefono: ospiteTelefono || null,
                email: ospiteEmail || null,
              })
              .eq('id', selectedOspite.id);
          }
        } else {
          // Crea nuovo ospite
          const { data: ospiteData, error: ospiteError } = await supabase
            .from('ospiti')
            .insert([{
              nome: ospiteNome,
              cognome: ospiteCognome,
              telefono: ospiteTelefono || null,
              email: ospiteEmail || null,
            }])
            .select()
            .single();

          if (ospiteError) throw ospiteError;
          ospiteId = ospiteData.id;
        }
      } else {
        socioId = selectedSocio!.id;
      }

      // Se è selezione multipla, crea una prenotazione per ogni slot
      if (multipleSlots && multipleSlots.length > 1) {
        const prenotazioni = multipleSlots.map((slot, index) => {
          const oraFine = `${(parseInt(slot.ora.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
          return {
            socio_id: socioId,
            ospite_id: ospiteId,
            campo: slot.campo,
            data: slot.data,
            ora_inizio: slot.ora,
            ora_fine: oraFine,
            tipo_prenotazione: tipoPrenotazione,
            tipo_campo: 'scoperto' as const,
            diurno: parseInt(slot.ora.split(':')[0]) >= 8 && parseInt(slot.ora.split(':')[0]) < 20,
            importo,
            stato_pagamento: 'da_pagare' as const,
            note: note || null,
          };
        });

        const { error: prenotazioneError } = await supabase
          .from('prenotazioni')
          .insert(prenotazioni);

        if (prenotazioneError) throw prenotazioneError;
      } else {
        // Prenotazione singola
        const oraFine = `${(parseInt(oraInizio.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;

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
            tipo_campo: 'scoperto' as const,
            diurno: parseInt(oraInizio.split(':')[0]) >= 8 && parseInt(oraInizio.split(':')[0]) < 20,
            importo,
            stato_pagamento: 'da_pagare' as const,
            note: note || null,
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
      }


      toast({
        title: "Successo",
        description: "Prenotazione creata con successo",
      });

      // Chiudi il dialog prima di chiamare onSuccess per evitare problemi di rendering
      onOpenChange(false);
      resetForm();
      
      // Usa setTimeout per dare tempo al dialog di chiudersi completamente
      setTimeout(() => {
        onSuccess();
      }, 100);
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
    setSelectedOspite(null);
    setOspiteSearch('');
    setOspiteNome('');
    setOspiteCognome('');
    setOspiteTelefono('');
    setOspiteEmail('');
    setTipoPrenotazione('singolare');
    setImporto(0);
    setTariffe([]);
    setSelectedTariffaId('manuale');
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={(node) => setPortalContainer(node as unknown as HTMLElement | null)} className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nuova Prenotazione - Campo {campo}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {multipleSlots && multipleSlots.length > 1 
              ? `${new Date(data).toLocaleDateString('it-IT')} dalle ${multipleSlots[0].ora} alle ${(parseInt(multipleSlots[multipleSlots.length - 1].ora.split(':')[0]) + 1).toString().padStart(2, '0')}:00 (${multipleSlots.length} ore)`
              : `${new Date(data).toLocaleDateString('it-IT')} alle ${oraInizio}`
            }
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
                <PopoverContent container={portalContainer} className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border z-50" style={{ overflowY: 'auto', maxHeight: '300px' }}>
                  <Command className="bg-background">
                    <CommandInput 
                      placeholder="Cerca socio..." 
                      value={socioSearch}
                      onValueChange={setSocioSearch}
                      className="bg-background"
                    />
                    <CommandEmpty>Nessun socio trovato.</CommandEmpty>
                    <CommandList className="bg-background overflow-y-auto max-h-[250px]" style={{ overflowY: 'auto' }}>
                      <CommandGroup className="bg-background">
                        <CommandItem
                          onSelect={() => {
                            setOpenSocioCombobox(false);
                            setShowSocioDialog(true);
                          }}
                          className="bg-background hover:bg-accent cursor-pointer border-b mb-1 font-medium"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Crea nuovo socio
                        </CommandItem>
                        {filteredSoci.map((socio) => (
                          <CommandItem
                            key={socio.id}
                            value={`${socio.nome} ${socio.cognome}`}
                            onSelect={() => {
                              setSelectedSocio(socio);
                              setOpenSocioCombobox(false);
                            }}
                            className="bg-background hover:bg-accent cursor-pointer"
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
              {/* Selezione Ospite Esistente */}
              <div className="space-y-2">
                <Label>Ospite Esistente (opzionale)</Label>
                <Popover open={openOspiteCombobox} onOpenChange={setOpenOspiteCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openOspiteCombobox}
                      className="w-full justify-between"
                    >
                      {selectedOspite
                        ? `${selectedOspite.nome} ${selectedOspite.cognome}`
                        : "Cerca ospite esistente..."
                      }
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent container={portalContainer} className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border z-50" style={{ overflowY: 'auto', maxHeight: '300px' }}>
                    <Command className="bg-background">
                      <CommandInput 
                        placeholder="Cerca ospite..." 
                        value={ospiteSearch}
                        onValueChange={setOspiteSearch}
                        className="bg-background"
                      />
                      <CommandEmpty>Nessun ospite trovato.</CommandEmpty>
                      <CommandList className="bg-background overflow-y-auto max-h-[250px]" style={{ overflowY: 'auto' }}>
                        <CommandGroup className="bg-background">
                          <CommandItem
                            onSelect={() => {
                              setOpenOspiteCombobox(false);
                              setShowOspiteDialog(true);
                            }}
                            className="bg-background hover:bg-accent cursor-pointer border-b mb-1 font-medium"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Crea nuovo ospite
                          </CommandItem>
                          {filteredOspiti.map((ospite) => (
                            <CommandItem
                              key={ospite.id}
                              value={`${ospite.nome} ${ospite.cognome}`}
                              onSelect={() => {
                                setSelectedOspite(ospite);
                                setOpenOspiteCombobox(false);
                              }}
                              className="bg-background hover:bg-accent cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedOspite?.id === ospite.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{ospite.nome} {ospite.cognome}</span>
                                {ospite.telefono && (
                                  <span className="text-xs text-muted-foreground">{ospite.telefono}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedOspite && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOspite(null);
                        setOspiteNome('');
                        setOspiteCognome('');
                        setOspiteTelefono('');
                        setOspiteEmail('');
                      }}
                    >
                      Cancella selezione
                    </Button>
                  </div>
                )}
              </div>

              {/* Campi per i dati ospite */}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={ospiteTelefono}
                    onChange={(e) => setOspiteTelefono(e.target.value)}
                    placeholder="Telefono (opzionale)"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={ospiteEmail}
                    onChange={(e) => setOspiteEmail(e.target.value)}
                    placeholder="Email (opzionale)"
                  />
                </div>
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

          {/* Tariffa */}
          <div className="space-y-2">
            <Label>Tariffa</Label>
            <Select value={selectedTariffaId} onValueChange={handleTariffaChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manuale">Importo Manuale</SelectItem>
                {tariffe.map((tariffa) => (
                  <SelectItem key={tariffa.id} value={tariffa.id}>
                    {tariffa.nome} - €{tariffa.prezzo_ora.toFixed(2)}/ora
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importo - visibile solo se modalità manuale */}
          {selectedTariffaId === 'manuale' && (
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
          )}

          {/* Mostra importo anche quando è selezionata una tariffa */}
          {selectedTariffaId !== 'manuale' && (
            <div className="space-y-2">
              <Label>Importo Totale</Label>
              <div className="text-2xl font-bold">€{importo.toFixed(2)}</div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (opzionale)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Aggiungi note sulla prenotazione..."
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

      {/* Dialog per creare nuovo socio */}
      <SocioDialog
        open={showSocioDialog}
        onOpenChange={setShowSocioDialog}
        onSuccess={() => {
          loadSoci();
          setShowSocioDialog(false);
        }}
      />

      {/* Dialog per creare nuovo ospite */}
      <OspiteDialog
        open={showOspiteDialog}
        onOpenChange={setShowOspiteDialog}
        onSuccess={() => {
          loadOspiti();
          setShowOspiteDialog(false);
        }}
      />
    </Dialog>
  );
};

export default PrenotazioneDialog;