import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Euro, CloudRain, AlertTriangle, Trash2, MoreVertical, Pencil } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { Prenotazione } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import PrenotazioneDialog from '@/components/PrenotazioneDialog';
import PagamentoDialog from '@/components/PagamentoDialog';
import BookingDetailDialog from '@/components/BookingDetailDialog';
import { useWeather } from '@/hooks/useWeather';
import RecurringBookingDialog from '@/components/RecurringBookingDialog';
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

const Prenotazioni = () => {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    data: string;
    oraInizio: string;
    campo: number;
  } | null>(null);
  const [selectedPrenotazione, setSelectedPrenotazione] = useState<Prenotazione | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<{
    campo: number;
    data: string;
    ora: string;
  }[]>([]);
  const [selectionStart, setSelectionStart] = useState<{
    campo: number;
    data: string;
    ora: string;
  } | null>(null);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showDeleteWeekDialog, setShowDeleteWeekDialog] = useState(false);
  const [isDeletingWeek, setIsDeletingWeek] = useState(false);
  
  // Weather hook per Arenzano (44.4056, 8.9176)
  const { weatherData, loading: weatherLoading, getWeatherIcon, getWeatherForDate } = useWeather();

  useEffect(() => {
    loadPrenotazioni();
  }, [selectedWeek]);

  useEffect(() => {
    loadPagamentiCache();
  }, [prenotazioni]);

  useEffect(() => {
    // Carica logo salvato nel localStorage
    const savedLogo = localStorage.getItem('tennis-club-logo');
    if (savedLogo) {
      setLogoUrl(savedLogo);
    }
  }, []);

  const loadPrenotazioni = async () => {
    try {
      // Calcola inizio e fine settimana
      const startOfWeek = new Date(selectedWeek);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Lunedì
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Domenica

      const { data, error } = await supabase
        .from('prenotazioni')
        .select(`
          *,
          soci (
            nome,
            cognome,
            telefono
          ),
          ospiti (
            nome,
            cognome,
            telefono
          )
        `)
        .gte('data', startOfWeek.toISOString().split('T')[0])
        .lte('data', endOfWeek.toISOString().split('T')[0])
        .eq('annullata_pioggia', false)
        .order('data', { ascending: true })
        .order('ora_inizio', { ascending: true });

      console.log('Query range:', {
        startOfWeek: startOfWeek.toISOString().split('T')[0],
        endOfWeek: endOfWeek.toISOString().split('T')[0]
      });

      if (error) throw error;
      console.log('Loaded prenotazioni:', data?.length, data);
      setPrenotazioni(data || []);
    } catch (error) {
      console.error('Error loading prenotazioni:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le prenotazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPagamentiCache = async () => {
    try {
      const prenotazioniPagate = prenotazioni.filter(p => p.stato_pagamento === 'pagato');
      if (prenotazioniPagate.length === 0) return;

      const { data: pagamenti } = await supabase
        .from('pagamenti')
        .select('prenotazione_id, metodo_pagamento_tipo')
        .in('prenotazione_id', prenotazioniPagate.map(p => p.id));

      const cache: Record<string, string> = {};
      if (pagamenti) {
        pagamenti.forEach(pagamento => {
          if (pagamento.metodo_pagamento_tipo === 'contanti') {
            cache[pagamento.prenotazione_id] = 'bg-cash-payment/30 text-cash-payment border border-cash-payment/40';
          } else {
            cache[pagamento.prenotazione_id] = 'bg-pos-payment/30 text-pos-payment border border-pos-payment/40';
          }
        });
      }
      
      setPagamentiCache(cache);
    } catch (error) {
      console.error('Error loading pagamenti cache:', error);
    }
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedWeek);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    slots.push('23:00');
    return slots;
  };

  const handleMouseDown = (day: Date, time: string, campo: number, event: React.MouseEvent) => {
    const prenotazione = getPrenotazioneForSlot(day, time, campo);
    
    if (prenotazione) {
      setSelectedPrenotazione(prenotazione);
      setBookingDetailOpen(true);
      return;
    }

    const slotKey = { campo, data: day.toISOString().split('T')[0], ora: time };

    // Ctrl+click: aggiungi/rimuovi singolo slot dalla selezione
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const isAlreadySelected = selectedSlots.some(
        s => s.campo === campo && s.data === slotKey.data && s.ora === time
      );
      
      if (isAlreadySelected) {
        // Rimuovi slot dalla selezione
        setSelectedSlots(selectedSlots.filter(
          s => !(s.campo === campo && s.data === slotKey.data && s.ora === time)
        ));
      } else {
        // Aggiungi slot alla selezione
        setSelectedSlots([...selectedSlots, slotKey]);
      }
      return;
    }

    // Click normale: inizia selezione tramite trascinamento
    setIsSelecting(true);
    setSelectionStart(slotKey);
    setSelectedSlots([slotKey]);
  };

  const handleMouseEnter = (day: Date, time: string, campo: number) => {
    if (!isSelecting || !selectionStart) return;
    
    const prenotazione = getPrenotazioneForSlot(day, time, campo);
    if (prenotazione) return; // Non selezionare celle occupate
    
    if (campo !== selectionStart.campo || day.toISOString().split('T')[0] !== selectionStart.data) return;
    
    // Seleziona tutti gli slot tra l'inizio e la posizione corrente
    const startHour = parseInt(selectionStart.ora.split(':')[0]);
    const endHour = parseInt(time.split(':')[0]);
    const minHour = Math.min(startHour, endHour);
    const maxHour = Math.max(startHour, endHour);
    
    const newSelectedSlots = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
      const hourStr = `${hour.toString().padStart(2, '0')}:00`;
      const slotPrenotazione = getPrenotazioneForSlot(day, hourStr, campo);
      if (!slotPrenotazione) {
        newSelectedSlots.push({
          campo,
          data: day.toISOString().split('T')[0],
          ora: hourStr
        });
      }
    }
    setSelectedSlots(newSelectedSlots);
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      if (selectedSlots.length > 1) {
        // Apri dialog per prenotazione multipla con tutti gli slot selezionati
        setSelectedSlot({
          data: selectedSlots[0].data,
          oraInizio: selectedSlots[0].ora,
          campo: selectedSlots[0].campo,
          multipleSlots: selectedSlots // Passa tutti gli slot selezionati
        } as any);
        setDialogOpen(true);
      } else if (selectedSlots.length === 1) {
        // Se è solo uno slot, apri dialog per singola prenotazione
        setSelectedSlot({
          data: selectedSlots[0].data,
          oraInizio: selectedSlots[0].ora,
          campo: selectedSlots[0].campo
        });
        setDialogOpen(true);
      }
      
      // Clear selection state dopo aver aperto il dialog
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectedSlots([]);
    } else if (selectedSlots.length > 0) {
      // Se ci sono slot selezionati con Ctrl (senza trascinamento), apri il dialog
      setSelectedSlot({
        data: selectedSlots[0].data,
        oraInizio: selectedSlots[0].ora,
        campo: selectedSlots[0].campo,
        multipleSlots: selectedSlots.length > 1 ? selectedSlots : undefined
      } as any);
      setDialogOpen(true);
      setSelectedSlots([]);
    }
  };

  const isSlotSelected = (day: Date, time: string, campo: number) => {
    return selectedSlots.some(slot => 
      slot.campo === campo && 
      slot.data === day.toISOString().split('T')[0] && 
      slot.ora === time
    );
  };

  const handleAnnullaPioggia = async (prenotazione: Prenotazione, specificHour?: string) => {
    try {
      if (specificHour && isMultiHourBooking(prenotazione)) {
        // Annulla solo l'ora specifica, splitta la prenotazione
        await handleSplitForHourAction(prenotazione, specificHour, 'annulla');
      } else {
        // Annulla tutta la prenotazione
        const { error } = await supabase
          .from('prenotazioni')
          .update({
            annullata_pioggia: true,
            data_annullamento_pioggia: new Date().toISOString()
          })
          .eq('id', prenotazione.id);

        if (error) throw error;

        toast({
          title: "Prenotazione annullata",
          description: "La prenotazione è stata annullata per pioggia",
        });

        await loadPrenotazioni();
      }
    } catch (error) {
      console.error('Error cancelling for rain:', error);
      toast({
        title: "Errore",
        description: "Impossibile annullare la prenotazione",
        variant: "destructive",
      });
    }
  };

  const handleRipristinaPrenotazione = async (prenotazione: Prenotazione) => {
    try {
      const { error } = await supabase
        .from('prenotazioni')
        .update({
          annullata_pioggia: false,
          data_annullamento_pioggia: null
        })
        .eq('id', prenotazione.id);

      if (error) throw error;

      toast({
        title: "Prenotazione ripristinata",
        description: "La prenotazione è stata ripristinata",
      });

      await loadPrenotazioni();
    } catch (error) {
      console.error('Error restoring booking:', error);
      toast({
        title: "Errore",
        description: "Impossibile ripristinare la prenotazione",
        variant: "destructive",
      });
    }
  };

  const isMultiHourBooking = (prenotazione: Prenotazione) => {
    const start = parseInt(prenotazione.ora_inizio.substring(0, 2));
    const end = parseInt(prenotazione.ora_fine.substring(0, 2));
    return (end - start) > 1;
  };

  const handleSplitForHourAction = async (prenotazione: Prenotazione, specificHour: string, action: 'annulla' | 'elimina') => {
    try {
      const originalStart = prenotazione.ora_inizio;
      const originalEnd = prenotazione.ora_fine;
      const hourToHandle = parseInt(specificHour.substring(0, 2));
      const splitStartHour = `${hourToHandle.toString().padStart(2, '0')}:00`;
      const splitEndHour = `${(hourToHandle + 1).toString().padStart(2, '0')}:00`;
      
      // Elimina la prenotazione originale
      const { error: deleteError } = await supabase
        .from('prenotazioni')
        .delete()
        .eq('id', prenotazione.id);

      if (deleteError) throw deleteError;

      const bookingsToCreate = [];

      // Prima parte (se esiste - prima dell'ora specifica)
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
          importo: calculateProportionalImporto(prenotazione, originalStart, splitStartHour),
          stato_pagamento: prenotazione.stato_pagamento,
          note: prenotazione.note,
        });
      }

      // Ora specifica (se annullamento per pioggia, viene ricreata come annullata)
      if (action === 'annulla') {
        bookingsToCreate.push({
          socio_id: prenotazione.socio_id,
          ospite_id: prenotazione.ospite_id,
          campo: prenotazione.campo,
          data: prenotazione.data,
          ora_inizio: splitStartHour,
          ora_fine: splitEndHour,
          tipo_prenotazione: prenotazione.tipo_prenotazione,
          tipo_campo: prenotazione.tipo_campo,
          diurno: prenotazione.diurno,
          importo: calculateProportionalImporto(prenotazione, splitStartHour, splitEndHour),
          stato_pagamento: prenotazione.stato_pagamento,
          note: prenotazione.note,
          annullata_pioggia: true,
          data_annullamento_pioggia: new Date().toISOString(),
        });
      }
      // Se è 'elimina', non ricreiamo quest'ora

      // Seconda parte (se esiste - dopo l'ora specifica)
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
          importo: calculateProportionalImporto(prenotazione, splitEndHour, originalEnd),
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
        title: action === 'annulla' ? "Ora annullata" : "Ora eliminata",
        description: action === 'annulla' 
          ? "L'ora selezionata è stata annullata per pioggia" 
          : "L'ora selezionata è stata eliminata con successo",
      });

      await loadPrenotazioni();
    } catch (error) {
      console.error('Error handling hour action:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare l'operazione",
        variant: "destructive",
      });
    }
  };

  const calculateProportionalImporto = (prenotazione: Prenotazione, start: string, end: string) => {
    const startHour = parseInt(start.substring(0, 2));
    const endHour = parseInt(end.substring(0, 2));
    const hours = endHour - startHour;
    const originalStart = parseInt(prenotazione.ora_inizio.substring(0, 2));
    const originalEnd = parseInt(prenotazione.ora_fine.substring(0, 2));
    const originalHours = originalEnd - originalStart;
    return (prenotazione.importo / originalHours) * hours;
  };

  const handleDeleteHour = async (prenotazione: Prenotazione, specificHour: string) => {
    if (!isMultiHourBooking(prenotazione)) {
      // Se è una singola ora, elimina tutta la prenotazione
      try {
        const { error } = await supabase
          .from('prenotazioni')
          .delete()
          .eq('id', prenotazione.id);

        if (error) throw error;

        toast({
          title: "Prenotazione eliminata",
          description: "La prenotazione è stata eliminata con successo",
        });

        await loadPrenotazioni();
      } catch (error) {
        console.error('Error deleting booking:', error);
        toast({
          title: "Errore",
          description: "Impossibile eliminare la prenotazione",
          variant: "destructive",
        });
      }
    } else {
      // Se è multi-ora, splitta
      await handleSplitForHourAction(prenotazione, specificHour, 'elimina');
    }
  };

  const handlePrenotazioneSuccess = async () => {
    // Force refresh immediato delle prenotazioni e pulizia selezione
    setSelectedSlots([]);
    setIsSelecting(false);
    setSelectionStart(null);
    await loadPrenotazioni();
    await loadPagamentiCache();
  };

  const getNomePrenotazione = (prenotazione: Prenotazione) => {
    // Se è un corso, mostra "Corsi" e opzionalmente il nome del maestro
    if (prenotazione.tipo_prenotazione === 'corso') {
      if (prenotazione.note && prenotazione.note.includes(' - ')) {
        const parts = prenotazione.note.split(' - ');
        // Se c'è una nota aggiuntiva (es. nome maestro), la mostra
        if (parts.length > 2 && parts[2].trim()) {
          return `Corsi - ${parts[2].trim()}`;
        }
      }
      return 'Corsi';
    }

    // Per prenotazioni ricorrenti (non corsi), estrae il nome del socio dalla nota
    if (prenotazione.note && prenotazione.note.includes(' - ')) {
      const parts = prenotazione.note.split(' - ');
      if (parts.length >= 2) {
        const nomeFromNote = parts[1];
        if (nomeFromNote && nomeFromNote.trim()) {
          return nomeFromNote.trim();
        }
      }
    }
    
    // Fallback per prenotazioni singole o se la nota non è formattata correttamente
    if (prenotazione.soci) {
      return `${prenotazione.soci.nome} ${prenotazione.soci.cognome}`;
    } else if (prenotazione.ospiti) {
      return `${prenotazione.ospiti.nome} ${prenotazione.ospiti.cognome}`;
    }
    return 'Nome non disponibile';
  };

  const getPrenotazioneForSlot = (day: Date, time: string, campo: number) => {
    const dayStr = day.toISOString().split('T')[0];
    return prenotazioni.find(p => {
      if (p.data !== dayStr || p.campo !== campo) return false;
      
      // Check if the current time slot falls within the booking period
      const startTime = p.ora_inizio.substring(0, 5);
      const endTime = p.ora_fine.substring(0, 5);
      
      return time >= startTime && time < endTime;
    });
  };

  const isSlotContinuation = (day: Date, time: string, campo: number) => {
    const prenotazione = getPrenotazioneForSlot(day, time, campo);
    if (!prenotazione) return false;
    
    const startTime = prenotazione.ora_inizio.substring(0, 5);
    return time !== startTime;
  };

  const [pagamentiCache, setPagamentiCache] = useState<Record<string, string>>({});

  const getStatoPagamentoColor = (prenotazione: Prenotazione) => {
    // Se annullata per pioggia, usa uno stile specifico
    if (prenotazione.annullata_pioggia) {
      return 'bg-red-200 text-red-800 border border-red-400 opacity-70';
    }
    
    // Se è una prenotazione ricorrente (corso), usa un colore specifico
    if (prenotazione.note && (prenotazione.note.includes('corso_') || prenotazione.note.includes('abbonamento_'))) {
      if (prenotazione.stato_pagamento === 'pagato') {
        return 'bg-purple-200 text-purple-800 border border-purple-400';
      } else {
        return 'bg-orange-200 text-orange-800 border border-orange-400';
      }
    }
    
    if (prenotazione.stato_pagamento === 'da_pagare') {
      return 'bg-red-200 text-red-800 border border-red-400';
    }
    
    // Per prenotazioni pagate, usa sempre lo stesso verde della legenda
    return 'bg-green-500 text-green-900 border border-green-600';
  };

  const getStatoPagamentoColorWithPayment = async (prenotazione: Prenotazione) => {
    if (prenotazione.stato_pagamento === 'da_pagare') {
      return 'bg-red-200 text-red-800 border border-red-400';
    }
    
    // Se è pagata, usa verde
    return 'bg-green-500 text-green-900 border border-green-600';
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoUrl(result);
        localStorage.setItem('tennis-club-logo', result);
        toast({
          title: "Logo caricato",
          description: "Il logo è stato caricato con successo",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteWeek = async () => {
    setIsDeletingWeek(true);
    try {
      const weekDays = getWeekDays();
      const startDate = weekDays[0].toISOString().split('T')[0];
      const endDate = weekDays[6].toISOString().split('T')[0];

      const { error } = await supabase
        .from('prenotazioni')
        .delete()
        .gte('data', startDate)
        .lte('data', endDate);

      if (error) throw error;

      toast({
        title: 'Prenotazioni cancellate',
        description: 'Tutte le prenotazioni della settimana sono state cancellate.',
      });

      await loadPrenotazioni();
    } catch (error) {
      console.error('Error deleting week bookings:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile cancellare le prenotazioni.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingWeek(false);
      setShowDeleteWeekDialog(false);
    }
  };

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();

  if (loading) return <div>Caricamento prenotazioni...</div>;

  return (
    <div className="space-y-6">
      {/* Header con nome club e logo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-4 gap-4">
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="logo-upload"
            onChange={handleLogoUpload}
          />
          <label
            htmlFor="logo-upload"
            className="w-24 h-24 flex-shrink-0 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
            title="Clicca per caricare il logo"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
            ) : (
              <span className="text-xs text-muted-foreground">LOGO</span>
            )}
          </label>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Tennis Club Arenzano</h1>
            <p className="text-sm text-muted-foreground">Sistema gestione prenotazioni campi</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Button variant="outline" size="sm" onClick={() => {
            const prevWeek = new Date(selectedWeek);
            prevWeek.setDate(prevWeek.getDate() - 7);
            setSelectedWeek(prevWeek);
          }}>
            ← Prec
          </Button>
          <Button size="sm" onClick={() => setSelectedWeek(new Date())}>
            Oggi
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const nextWeek = new Date(selectedWeek);
            nextWeek.setDate(nextWeek.getDate() + 7);
            setSelectedWeek(nextWeek);
          }}>
            Succ →
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowRecurringDialog(true)}
          >
            📅 Ricorrenti
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteWeekDialog(true)}
          >
            <Trash2 size={16} className="mr-2" />
            Cancella
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Campo 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Campo 1</span>
            </CardTitle>
            <CardDescription>
              Settimana n.{getWeekNumber(weekDays[0])} - dal {weekDays[0].toLocaleDateString('it-IT')} al {weekDays[6].toLocaleDateString('it-IT')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium">Orario</th>
                    {weekDays.map((day, idx) => {
                      const dayStr = day.toISOString().split('T')[0];
                      const weather = getWeatherForDate(dayStr);
                      let WeatherIcon = LucideIcons.Sun;
                      
                      if (weather && !weatherLoading) {
                        const iconData = getWeatherIcon(weather.weather_code);
                        WeatherIcon = (LucideIcons as any)[iconData.icon] || LucideIcons.Sun;
                      }

                      const isToday = day.toDateString() === new Date().toDateString();
                      
                      return (
                        <th key={idx} className={`text-center p-2 font-medium min-w-24 ${isToday ? 'bg-primary/10 border-primary/30 rounded-t-lg' : ''}`}>
                          <div className="flex items-center justify-center space-x-2">
                            <span className={isToday ? 'text-primary font-semibold' : ''}>{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][idx]}</span>
                            {!weatherLoading && weather && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <WeatherIcon size={16} className="text-blue-500" />
                                <span className="text-xs">{weather.temperature_max}°C</span>
                              </div>
                            )}
                          </div>
                          <div className={`text-xs ${isToday ? 'text-primary/80' : 'text-muted-foreground'}`}>
                            {day.getDate()}/{day.getMonth() + 1}
                          </div>
                          {!weatherLoading && weather && weather.precipitation_probability > 30 && (
                            <div className="text-xs text-blue-600">
                              {weather.precipitation_probability}%
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="border-t">
                      <td className="p-2 font-mono text-xs">{time}</td>
                      {weekDays.map((day, dayIdx) => {
                        const prenotazione = getPrenotazioneForSlot(day, time, 1);
                        return (
                           <td key={dayIdx} className="p-1">
                                {prenotazione ? (
                                   <div className="relative group">
                                     <div 
                                       className={`p-1 rounded text-xs text-center cursor-pointer ${getStatoPagamentoColor(prenotazione)} ${isSlotContinuation(day, time, 1) ? 'border-t-0 rounded-t-none opacity-80' : ''}`}
                                       onMouseDown={(e) => handleMouseDown(day, time, 1, e)}
                                     >
                                      <div className="font-medium">
                                        {getNomePrenotazione(prenotazione)}
                                      </div>
                                      {!isSlotContinuation(day, time, 1) && (
                                        <div>€{prenotazione.importo}</div>
                                      )}
                                      {prenotazione.annullata_pioggia && (
                                        <div className="absolute -top-1 -right-1">
                                          <CloudRain size={12} className="text-blue-600" />
                                        </div>
                                      )}
                                    </div>
                                   
                                   {/* Menu contestuale con dropdown */}
                                   <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                     <DropdownMenu>
                                       <DropdownMenuTrigger asChild>
                                         <Button
                                           size="sm"
                                           variant="secondary"
                                           className="h-6 w-6 p-0"
                                           onClick={(e) => e.stopPropagation()}
                                         >
                                           <MoreVertical size={12} />
                                         </Button>
                                       </DropdownMenuTrigger>
                                       <DropdownMenuContent align="end">
                                         <DropdownMenuItem
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setSelectedPrenotazione(prenotazione);
                                             setBookingDetailOpen(true);
                                           }}
                                         >
                                           <Pencil size={14} className="mr-2" />
                                           Modifica
                                         </DropdownMenuItem>
                                         <DropdownMenuSeparator />
                                         {!prenotazione.annullata_pioggia ? (
                                           <DropdownMenuItem
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               handleAnnullaPioggia(prenotazione, time);
                                             }}
                                           >
                                             <CloudRain size={14} className="mr-2" />
                                             Annulla per pioggia
                                           </DropdownMenuItem>
                                         ) : (
                                           <DropdownMenuItem
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               handleRipristinaPrenotazione(prenotazione);
                                             }}
                                           >
                                             <AlertTriangle size={14} className="mr-2" />
                                             Ripristina
                                           </DropdownMenuItem>
                                         )}
                                         <DropdownMenuItem
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             handleDeleteHour(prenotazione, time);
                                           }}
                                           className="text-destructive"
                                         >
                                           <Trash2 size={14} className="mr-2" />
                                           Elimina ora
                                         </DropdownMenuItem>
                                       </DropdownMenuContent>
                                     </DropdownMenu>
                                   </div>
                                 </div>
                               ) : (
                                  <div 
                                    className={`p-1 rounded text-xs text-center cursor-pointer transition-colors ${
                                      isSlotSelected(day, time, 1) 
                                        ? 'bg-blue-300 text-blue-900 border-2 border-blue-500' 
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                                    onMouseDown={(e) => handleMouseDown(day, time, 1, e)}
                                    onMouseEnter={() => handleMouseEnter(day, time, 1)}
                                    onMouseUp={handleMouseUp}
                                  >
                                    Libero
                                  </div>
                               )}
                            </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Campo 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Campo 2</span>
            </CardTitle>
            <CardDescription>
              Settimana n.{getWeekNumber(weekDays[0])} - dal {weekDays[0].toLocaleDateString('it-IT')} al {weekDays[6].toLocaleDateString('it-IT')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium">Orario</th>
                    {weekDays.map((day, idx) => {
                      const dayStr = day.toISOString().split('T')[0];
                      const weather = getWeatherForDate(dayStr);
                      let WeatherIcon = LucideIcons.Sun;
                      
                      if (weather && !weatherLoading) {
                        const iconData = getWeatherIcon(weather.weather_code);
                        WeatherIcon = (LucideIcons as any)[iconData.icon] || LucideIcons.Sun;
                      }

                      const isToday = day.toDateString() === new Date().toDateString();
                      
                      return (
                        <th key={idx} className={`text-center p-2 font-medium min-w-24 ${isToday ? 'bg-primary/10 border-primary/30 rounded-t-lg' : ''}`}>
                          <div className="flex items-center justify-center space-x-2">
                            <span className={isToday ? 'text-primary font-semibold' : ''}>{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][idx]}</span>
                            {!weatherLoading && weather && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <WeatherIcon size={16} className="text-blue-500" />
                                <span className="text-xs">{weather.temperature_max}°C</span>
                              </div>
                            )}
                          </div>
                          <div className={`text-xs ${isToday ? 'text-primary/80' : 'text-muted-foreground'}`}>
                            {day.getDate()}/{day.getMonth() + 1}
                          </div>
                          {!weatherLoading && weather && weather.precipitation_probability > 30 && (
                            <div className="text-xs text-blue-600">
                              {weather.precipitation_probability}%
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="border-t">
                      <td className="p-2 font-mono text-xs">{time}</td>
                      {weekDays.map((day, dayIdx) => {
                        const prenotazione = getPrenotazioneForSlot(day, time, 2);
                        return (
                             <td key={dayIdx} className="p-1">
                                {prenotazione ? (
                                   <div className="relative group">
                                     <div 
                                       className={`p-1 rounded text-xs text-center cursor-pointer ${getStatoPagamentoColor(prenotazione)} ${isSlotContinuation(day, time, 2) ? 'border-t-0 rounded-t-none opacity-80' : ''}`}
                                       onMouseDown={(e) => handleMouseDown(day, time, 2, e)}
                                     >
                                      <div className="font-medium">
                                        {getNomePrenotazione(prenotazione)}
                                      </div>
                                      {!isSlotContinuation(day, time, 2) && (
                                        <div>€{prenotazione.importo}</div>
                                      )}
                                      {prenotazione.annullata_pioggia && (
                                        <div className="absolute -top-1 -right-1">
                                          <CloudRain size={12} className="text-blue-600" />
                                        </div>
                                      )}
                                    </div>
                                   
                                   {/* Menu contestuale con dropdown */}
                                   <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                     <DropdownMenu>
                                       <DropdownMenuTrigger asChild>
                                         <Button
                                           size="sm"
                                           variant="secondary"
                                           className="h-6 w-6 p-0"
                                           onClick={(e) => e.stopPropagation()}
                                         >
                                           <MoreVertical size={12} />
                                         </Button>
                                       </DropdownMenuTrigger>
                                       <DropdownMenuContent align="end">
                                         <DropdownMenuItem
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setSelectedPrenotazione(prenotazione);
                                             setBookingDetailOpen(true);
                                           }}
                                         >
                                           <Pencil size={14} className="mr-2" />
                                           Modifica
                                         </DropdownMenuItem>
                                         <DropdownMenuSeparator />
                                         {!prenotazione.annullata_pioggia ? (
                                           <DropdownMenuItem
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               handleAnnullaPioggia(prenotazione, time);
                                             }}
                                           >
                                             <CloudRain size={14} className="mr-2" />
                                             Annulla per pioggia
                                           </DropdownMenuItem>
                                         ) : (
                                           <DropdownMenuItem
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               handleRipristinaPrenotazione(prenotazione);
                                             }}
                                           >
                                             <AlertTriangle size={14} className="mr-2" />
                                             Ripristina
                                           </DropdownMenuItem>
                                         )}
                                         <DropdownMenuItem
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             handleDeleteHour(prenotazione, time);
                                           }}
                                           className="text-destructive"
                                         >
                                           <Trash2 size={14} className="mr-2" />
                                           Elimina ora
                                         </DropdownMenuItem>
                                       </DropdownMenuContent>
                                     </DropdownMenu>
                                   </div>
                                 </div>
                               ) : (
                                  <div 
                                    className={`p-1 rounded text-xs text-center cursor-pointer transition-colors ${
                                      isSlotSelected(day, time, 2) 
                                        ? 'bg-blue-300 text-blue-900 border-2 border-blue-500' 
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                                    onMouseDown={(e) => handleMouseDown(day, time, 2, e)}
                                    onMouseEnter={() => handleMouseEnter(day, time, 2)}
                                    onMouseUp={handleMouseUp}
                                  >
                                    Libero
                                  </div>
                               )}
                            </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle>Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-50 border rounded"></div>
              <span className="text-sm">Libero</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Pagato</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-400 rounded"></div>
              <span className="text-sm">Da Pagare</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-300 rounded border border-red-500"></div>
              <span className="text-sm">Annullata per pioggia</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-300 rounded border-2 border-blue-500"></div>
              <span className="text-sm">Selezione multipla (Ctrl+Click o trascina)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-400 rounded border border-purple-600"></div>
              <span className="text-sm">Corsi/Abbonamenti (pagati)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-400 rounded border border-orange-600"></div>
              <span className="text-sm">Corsi/Abbonamenti (da pagare)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pulsante floating per confermare selezione multipla con Ctrl */}
      {selectedSlots.length > 0 && !isSelecting && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4">
          <Card className="shadow-lg border-2 border-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <div className="font-semibold">{selectedSlots.length} slot selezionati</div>
                  <div className="text-muted-foreground">Premi per creare prenotazione</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSlots([])}
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedSlot({
                        data: selectedSlots[0].data,
                        oraInizio: selectedSlots[0].ora,
                        campo: selectedSlots[0].campo,
                        multipleSlots: selectedSlots.length > 1 ? selectedSlots : undefined
                      } as any);
                      setDialogOpen(true);
                    }}
                  >
                    Prenota
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Firma */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground">by Cesco</p>
      </div>

      {/* Dialog per nuova prenotazione */}
      {selectedSlot && (
        <PrenotazioneDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          data={selectedSlot.data}
          oraInizio={selectedSlot.oraInizio}
          campo={selectedSlot.campo}
          onSuccess={handlePrenotazioneSuccess}
          multipleSlots={(selectedSlot as any).multipleSlots}
        />
      )}

      {/* Dialog dettaglio prenotazione */}
      {selectedPrenotazione && (
        <BookingDetailDialog
          open={bookingDetailOpen}
          onOpenChange={setBookingDetailOpen}
          prenotazione={selectedPrenotazione}
          onSuccess={handlePrenotazioneSuccess}
          onOpenPayment={() => setPagamentoDialogOpen(true)}
        />
      )}

      {/* Dialog per pagamento */}
      {selectedPrenotazione && (
        <PagamentoDialog
          open={pagamentoDialogOpen}
          onOpenChange={setPagamentoDialogOpen}
          prenotazioneId={selectedPrenotazione.id}
          importoTotale={selectedPrenotazione.importo}
          nomeCliente={getNomePrenotazione(selectedPrenotazione)}
          onSuccess={handlePrenotazioneSuccess}
        />
      )}

      {/* Dialog per prenotazioni ricorrenti */}
      <RecurringBookingDialog
        open={showRecurringDialog}
        onOpenChange={setShowRecurringDialog}
        onSuccess={handlePrenotazioneSuccess}
      />

      {/* Dialog per cancellazione settimana */}
      <AlertDialog open={showDeleteWeekDialog} onOpenChange={setShowDeleteWeekDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cancellazione settimana</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler cancellare tutte le prenotazioni di questa settimana? Questa azione non può essere annullata e cancellerà {prenotazioni.length} prenotazioni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWeek} disabled={isDeletingWeek}>
              {isDeletingWeek ? 'Cancellazione...' : 'Conferma Cancellazione'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Prenotazioni;