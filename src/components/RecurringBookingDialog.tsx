import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Socio } from '@/types/database';

interface RecurringBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const RecurringBookingDialog = ({ open, onOpenChange, onSuccess }: RecurringBookingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [soci, setSoci] = useState<Socio[]>([]);
  const [selectedSocioId, setSelectedSocioId] = useState<string>('');
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    campo: 1,
    giornoSettimana: 1, // 1 = Lunedì
    oraInizio: '09:00',
    durata: 1, // ore
    dataInizio: '',
    dataFine: '',
    tipoCorso: 'corso_ragazzi',
    tariffaSpeciale: 20,
    note: ''
  });

  useEffect(() => {
    if (open) {
      loadSoci();
    }
  }, [open]);

  const loadSoci = async () => {
    try {
      const { data, error } = await supabase
        .from('soci')
        .select('*')
        .eq('attivo', true)
        .order('cognome', { ascending: true });
      
      if (error) throw error;
      setSoci(data || []);
    } catch (error) {
      console.error('Error loading soci:', error);
    }
  };

  const handleSocioSelect = (socioId: string) => {
    setSelectedSocioId(socioId);
    if (socioId === 'nuovo') {
      // Reset form per nuovo socio
      setFormData(prev => ({
        ...prev,
        nome: '',
        cognome: '',
        telefono: '',
        email: ''
      }));
    } else if (socioId) {
      const socio = soci.find(s => s.id === socioId);
      if (socio) {
        setFormData(prev => ({
          ...prev,
          nome: socio.nome,
          cognome: socio.cognome,
          telefono: socio.telefono || '',
          email: socio.email || ''
        }));
      }
    }
  };

  const mapTipoPrenotazione = (tipo: string) => {
    switch (tipo) {
      case 'corso_ragazzi':
      case 'corso_adulti':
        return 'corso';
      case 'lezioni_private':
        return 'lezione';
      case 'abbonamento_socio':
      case 'abbonamento_ospite':
        return 'singolare';
      default:
        return 'lezione';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.cognome || !formData.dataInizio || !formData.dataFine) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Prima crea o trova l'ospite per corsi ospiti
      let socioId = null;
      let ospiteId = null;

      if (formData.tipoCorso === 'corso_ospiti' || formData.tipoCorso === 'abbonamento_ospite') {
        const { data: ospite, error: ospiteError } = await supabase
          .from('ospiti')
          .insert({
            nome: formData.nome,
            cognome: formData.cognome,
            telefono: formData.telefono,
            email: formData.email,
            note: `Corso ricorrente: ${formData.tipoCorso}`
          })
          .select()
          .single();

        if (ospiteError) throw ospiteError;
        ospiteId = ospite.id;
      } else {
        // Per i soci, usa quello selezionato o creane uno nuovo
        if (selectedSocioId && selectedSocioId !== 'nuovo') {
          socioId = selectedSocioId;
        } else {
          const { data: socio, error: socioError } = await supabase
            .from('soci')
            .insert({
              nome: formData.nome,
              cognome: formData.cognome,
              telefono: formData.telefono,
              email: formData.email,
              tipo_socio: 'non_agonista',
              note: `Corso ricorrente: ${formData.tipoCorso}`
            })
            .select()
            .single();

          if (socioError) throw socioError;
          socioId = socio.id;
        }
      }

      // Genera le prenotazioni ricorrenti
      const prenotazioni = [];
      const dataInizio = new Date(formData.dataInizio);
      const dataFine = new Date(formData.dataFine);

      // Trova la prima occorrenza del giorno della settimana selezionato
      let currentDate = new Date(dataInizio);
      
      // Aggiusta il giorno della settimana (0=domenica, 1=lunedì, etc.)
      // formData.giornoSettimana usa 1=lunedì, quindi dobbiamo convertire
      const targetDayOfWeek = formData.giornoSettimana === 7 ? 0 : formData.giornoSettimana;
      
      // Trova il primo giorno della settimana target
      while (currentDate.getDay() !== targetDayOfWeek) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Genera una prenotazione per ogni settimana nel periodo
      while (currentDate <= dataFine) {
        // Calcola ora fine
        const [ore, minuti] = formData.oraInizio.split(':');
        const oraFine = `${(parseInt(ore) + formData.durata).toString().padStart(2, '0')}:${minuti}`;

        // Determina stato_pagamento: 'da_pagare' per abbonamenti, 'pagato' per corsi pre-pagati
        const statoPagamento = formData.tipoCorso.includes('abbonamento') ? 'da_pagare' : 'pagato';

        prenotazioni.push({
          socio_id: socioId,
          ospite_id: ospiteId,
          campo: formData.campo,
          data: currentDate.toISOString().split('T')[0],
          ora_inizio: formData.oraInizio,
          ora_fine: oraFine,
          tipo_prenotazione: mapTipoPrenotazione(formData.tipoCorso),
          tipo_campo: 'scoperto',
          diurno: parseInt(ore) < 18,
          importo: formData.tariffaSpeciale,
          stato_pagamento: statoPagamento,
          note: `Prenotazione ricorrente - ${formData.note}`,
          annullata_pioggia: false
        });

        // Vai alla settimana successiva
        currentDate.setDate(currentDate.getDate() + 7);
      }

      // Inserisci tutte le prenotazioni
      const { error: prenotazioniError } = await supabase
        .from('prenotazioni')
        .insert(prenotazioni);

      if (prenotazioniError) throw prenotazioniError;

      // Crea i pagamenti per le prenotazioni
      const { data: prenotazioniInserite } = await supabase
        .from('prenotazioni')
        .select('id')
        .eq('socio_id', socioId)
        .eq('ospite_id', ospiteId)
        .gte('data', formData.dataInizio)
        .lte('data', formData.dataFine);

      if (prenotazioniInserite) {
        const pagamenti = prenotazioniInserite.map(p => ({
          prenotazione_id: p.id,
          importo: formData.tariffaSpeciale,
          metodo_pagamento: 'Abbonamento/Corso',
          metodo_pagamento_tipo: 'abbonamento',
          note: `Pagamento corso ricorrente ${formData.tipoCorso}`
        }));

        await supabase.from('pagamenti').insert(pagamenti);
      }

      toast({
        title: "Prenotazioni ricorrenti create",
        description: `Create ${prenotazioni.length} prenotazioni per il corso ${formData.tipoCorso}`,
      });

      onSuccess();
      onOpenChange(false);
      setSelectedSocioId('');
      setFormData({
        nome: '',
        cognome: '',
        telefono: '',
        email: '',
        campo: 1,
        giornoSettimana: 1,
        oraInizio: '09:00',
        durata: 1,
        dataInizio: '',
        dataFine: '',
        tipoCorso: 'corso_ragazzi',
        tariffaSpeciale: 20,
        note: ''
      });
    } catch (error) {
      console.error('Error creating recurring bookings:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare le prenotazioni ricorrenti",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const giorniSettimana = [
    { value: 1, label: 'Lunedì' },
    { value: 2, label: 'Martedì' },
    { value: 3, label: 'Mercoledì' },
    { value: 4, label: 'Giovedì' },
    { value: 5, label: 'Venerdì' },
    { value: 6, label: 'Sabato' },
    { value: 0, label: 'Domenica' }
  ];

  const tipiCorso = [
    { value: 'corso_ragazzi', label: 'Corso Ragazzi', descrizione: 'Corso per giovani tennisti' },
    { value: 'corso_adulti', label: 'Corso Adulti', descrizione: 'Corso per adulti principianti/intermedi' },
    { value: 'abbonamento_socio', label: 'Abbonamento Socio', descrizione: 'Abbonamento settimanale per soci' },
    { value: 'abbonamento_ospite', label: 'Abbonamento Ospite', descrizione: 'Abbonamento settimanale per ospiti' },
    { value: 'lezioni_private', label: 'Lezioni Private', descrizione: 'Lezioni individuali ricorrenti' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-purple-600" />
            <span>Prenotazioni Ricorrenti</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informazioni cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Informazioni Cliente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="socioSelect">Seleziona Socio Esistente</Label>
                <Select value={selectedSocioId} onValueChange={handleSocioSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un socio o crea nuovo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuovo">+ Crea Nuovo Cliente</SelectItem>
                    {soci.map((socio) => (
                      <SelectItem key={socio.id} value={socio.id}>
                        {socio.cognome} {socio.nome} {socio.telefono ? `- ${socio.telefono}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    disabled={selectedSocioId && selectedSocioId !== 'nuovo'}
                  />
                </div>
                <div>
                  <Label htmlFor="cognome">Cognome *</Label>
                  <Input
                    id="cognome"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    required
                    disabled={selectedSocioId && selectedSocioId !== 'nuovo'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    disabled={selectedSocioId && selectedSocioId !== 'nuovo'}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={selectedSocioId && selectedSocioId !== 'nuovo'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dettagli corso/abbonamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Dettagli Corso/Abbonamento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tipoCorso">Tipo Corso/Abbonamento</Label>
                <Select 
                  value={formData.tipoCorso} 
                  onValueChange={(value) => setFormData({ ...formData, tipoCorso: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipiCorso.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div>
                          <div className="font-medium">{tipo.label}</div>
                          <div className="text-xs text-muted-foreground">{tipo.descrizione}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="campo">Campo</Label>
                  <Select 
                    value={formData.campo.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, campo: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Campo 1</SelectItem>
                      <SelectItem value="2">Campo 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="giornoSettimana">Giorno della Settimana</Label>
                  <Select 
                    value={formData.giornoSettimana.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, giornoSettimana: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {giorniSettimana.map((giorno) => (
                        <SelectItem key={giorno.value} value={giorno.value.toString()}>
                          {giorno.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="durata">Durata (ore)</Label>
                  <Select 
                    value={formData.durata.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, durata: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 ora</SelectItem>
                      <SelectItem value="2">2 ore</SelectItem>
                      <SelectItem value="3">3 ore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="oraInizio">Ora Inizio</Label>
                  <Input
                    type="time"
                    id="oraInizio"
                    value={formData.oraInizio}
                    onChange={(e) => setFormData({ ...formData, oraInizio: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tariffaSpeciale">Tariffa oraria (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="tariffaSpeciale"
                    value={formData.tariffaSpeciale}
                    onChange={(e) => setFormData({ ...formData, tariffaSpeciale: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Periodo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Periodo dell'Abbonamento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInizio">Data Inizio *</Label>
                  <Input
                    type="date"
                    id="dataInizio"
                    value={formData.dataInizio}
                    onChange={(e) => setFormData({ ...formData, dataInizio: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataFine">Data Fine *</Label>
                  <Input
                    type="date"
                    id="dataFine"
                    value={formData.dataFine}
                    onChange={(e) => setFormData({ ...formData, dataFine: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="note">Note</Label>
                <Input
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Note aggiuntive sul corso..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Anteprima */}
          {formData.dataInizio && formData.dataFine && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-700">Anteprima Prenotazioni</CardTitle>
                <CardDescription>
                  Verranno create prenotazioni ricorrenti ogni {giorniSettimana.find(g => g.value === formData.giornoSettimana)?.label} 
                  dalle {formData.oraInizio} per {formData.durata} ore sul Campo {formData.campo}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Periodo: {formData.dataInizio} - {formData.dataFine}
                  </Badge>
                  <Badge variant="secondary">
                    Tariffa oraria: €{formData.tariffaSpeciale}
                  </Badge>
                  <Badge variant="secondary">
                    Campo {formData.campo}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? 'Creazione...' : 'Crea Prenotazioni Ricorrenti'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecurringBookingDialog;