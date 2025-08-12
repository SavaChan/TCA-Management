import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Euro, CloudRain, AlertTriangle, Thermometer, Wind } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Prenotazione } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import PrenotazioneDialog from '@/components/PrenotazioneDialog';
import PagamentoDialog from '@/components/PagamentoDialog';
import { useWeather } from '@/hooks/useWeather';
import RecurringBookingDialog from '@/components/RecurringBookingDialog';

const Prenotazioni = () => {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
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
  
  // Weather hook per Arenzano (44.4056, 8.9176)
  const { weatherData, loading: weatherLoading, getWeatherIcon, getWeatherForDate, getWindDirection } = useWeather();

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
      if (prenotazione.stato_pagamento === 'da_pagare') {
        setSelectedPrenotazione(prenotazione);
        setPagamentoDialogOpen(true);
      } else {
        toast({
          title: "Prenotazione già pagata",
          description: "Questa prenotazione è già stata saldata",
        });
      }
      return;
    }

    // Inizia selezione multipla solo se la cella è libera
    if (event.shiftKey || event.ctrlKey) {
      const slotKey = { campo, data: day.toISOString().split('T')[0], ora: time };
      setIsSelecting(true);
      setSelectionStart(slotKey);
      setSelectedSlots([slotKey]);
    } else {
      // Clic normale per singola prenotazione
      setSelectedSlot({
        data: day.toISOString().split('T')[0],
        oraInizio: time,
        campo
      });
      setDialogOpen(true);
    }
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
    if (isSelecting && selectedSlots.length > 1) {
      // Apri dialog per prenotazione multipla con tutti gli slot selezionati
      setSelectedSlot({
        data: selectedSlots[0].data,
        oraInizio: selectedSlots[0].ora,
        campo: selectedSlots[0].campo,
        multipleSlots: selectedSlots // Passa tutti gli slot selezionati
      } as any);
      setDialogOpen(true);
    }
    
    // Clear selection state immediately and properly
    const clearSelection = () => {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectedSlots([]);
    };
    
    // Use requestAnimationFrame for proper cleanup
    requestAnimationFrame(clearSelection);
  };

  const isSlotSelected = (day: Date, time: string, campo: number) => {
    return selectedSlots.some(slot => 
      slot.campo === campo && 
      slot.data === day.toISOString().split('T')[0] && 
      slot.ora === time
    );
  };

  const handleAnnullaPioggia = async (prenotazione: Prenotazione) => {
    try {
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

  const handlePrenotazioneSuccess = async () => {
    // Force refresh immediato delle prenotazioni
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
      return 'bg-red-100/50 text-red-700 border border-red-300/50 opacity-60';
    }
    
    // Se è una prenotazione ricorrente (corso), usa un colore specifico
    if (prenotazione.note && (prenotazione.note.includes('corso_') || prenotazione.note.includes('abbonamento_'))) {
      if (prenotazione.stato_pagamento === 'pagato') {
        return 'bg-purple-100/50 text-purple-700 border border-purple-300/50';
      } else {
        return 'bg-orange-100/50 text-orange-700 border border-orange-300/50';
      }
    }
    
    if (prenotazione.stato_pagamento === 'da_pagare') {
      return 'bg-unpaid/30 text-unpaid border border-unpaid/40';
    }
    
    // Se è pagata, usa la cache dei pagamenti se disponibile
    const cachedColor = pagamentiCache[prenotazione.id];
    if (cachedColor) {
      return cachedColor;
    }
    
    // Default per prenotazioni pagate senza info sul tipo di pagamento
    return 'bg-pos-payment/30 text-pos-payment border border-pos-payment/40';
  };

  const getStatoPagamentoColorWithPayment = async (prenotazione: Prenotazione) => {
    if (prenotazione.stato_pagamento === 'da_pagare') {
      return 'bg-unpaid/30 text-unpaid border border-unpaid/40';
    }
    
    // Se è pagata, controlla il tipo di pagamento
    try {
      const { data: pagamenti } = await supabase
        .from('pagamenti')
        .select('metodo_pagamento_tipo')
        .eq('prenotazione_id', prenotazione.id);
      
      if (pagamenti && pagamenti.length > 0) {
        const hasContanti = pagamenti.some(p => p.metodo_pagamento_tipo === 'contanti');
        if (hasContanti) {
          return 'bg-cash-payment/30 text-cash-payment border border-cash-payment/40';
        } else {
          return 'bg-pos-payment/30 text-pos-payment border border-pos-payment/40';
        }
      }
    } catch (error) {
      console.error('Error checking payment type:', error);
    }
    
    return 'bg-pos-payment/30 text-pos-payment border border-pos-payment/40';
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

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();

  if (loading) return <div>Caricamento prenotazioni...</div>;

  return (
    <div className="space-y-6">
      {/* Header con nome club e logo */}
      <div className="flex justify-between items-center border-b pb-4">
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
            className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
            title="Clicca per caricare il logo"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
            ) : (
              <span className="text-xs text-muted-foreground">LOGO</span>
            )}
          </label>
          <div>
            <h1 className="text-3xl font-bold">Tennis Club Arenzano</h1>
            <p className="text-muted-foreground">Sistema gestione prenotazioni campi</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => {
            const prevWeek = new Date(selectedWeek);
            prevWeek.setDate(prevWeek.getDate() - 7);
            setSelectedWeek(prevWeek);
          }}>
            ← Settimana Precedente
          </Button>
          <Button onClick={() => setSelectedWeek(new Date())}>
            Oggi
          </Button>
          <Button variant="outline" onClick={() => {
            const nextWeek = new Date(selectedWeek);
            nextWeek.setDate(nextWeek.getDate() + 7);
            setSelectedWeek(nextWeek);
          }}>
            Settimana Successiva →
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowRecurringDialog(true)}
          >
            📅 Prenotazioni Ricorrenti
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
                        <th key={idx} className={`text-center p-2 font-medium min-w-32 ${isToday ? 'bg-primary/10 border-primary/30 rounded-t-lg' : ''}`}>
                          <div className="flex flex-col items-center space-y-1">
                            {/* Nome giorno e data */}
                            <div className="flex items-center justify-center space-x-1">
                              <span className={isToday ? 'text-primary font-semibold' : ''}>{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][idx]}</span>
                              {!weatherLoading && weather && (
                                <WeatherIcon size={16} className="text-blue-500" />
                              )}
                            </div>
                            <div className={`text-xs ${isToday ? 'text-primary/80' : 'text-muted-foreground'}`}>
                              {day.getDate()}/{day.getMonth() + 1}
                            </div>
                            
                            {/* Informazioni meteo aggiuntive */}
                            {!weatherLoading && weather && (
                              <div className="text-xs space-y-1">
                                {/* Temperatura */}
                                <div className="flex items-center justify-center space-x-1 text-orange-600">
                                  <Thermometer size={10} />
                                  <span>{weather.temperature_max}°/{weather.temperature_min}°</span>
                                </div>
                                
                                {/* Vento */}
                                {weather.wind_speed_max > 5 && (
                                  <div className="flex items-center justify-center space-x-1 text-blue-600">
                                    <Wind size={10} />
                                    <span>{weather.wind_speed_max}km/h {getWindDirection(weather.wind_direction)}</span>
                                  </div>
                                )}
                                
                                {/* Probabilità pioggia */}
                                {weather.precipitation_probability > 30 && (
                                  <div className="text-xs text-blue-600">
                                    {weather.precipitation_probability}%
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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
                                   
                                   {/* Menu contestuale per annullamento pioggia */}
                                   <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                     {!prenotazione.annullata_pioggia ? (
                                       <Button
                                         size="sm"
                                         variant="destructive"
                                         className="h-6 w-6 p-0"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleAnnullaPioggia(prenotazione);
                                         }}
                                         title="Annulla per pioggia"
                                       >
                                         <CloudRain size={12} />
                                       </Button>
                                     ) : (
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         className="h-6 w-6 p-0 bg-green-50"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleRipristinaPrenotazione(prenotazione);
                                         }}
                                         title="Ripristina prenotazione"
                                       >
                                         <AlertTriangle size={12} />
                                       </Button>
                                     )}
                                   </div>
                                 </div>
                               ) : (
                                 <div 
                                   className={`p-1 rounded text-xs text-center cursor-pointer transition-colors ${
                                     isSlotSelected(day, time, 1) 
                                       ? 'bg-blue-200 text-blue-800 border-2 border-blue-400' 
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
                        <th key={idx} className={`text-center p-2 font-medium min-w-32 ${isToday ? 'bg-primary/10 border-primary/30 rounded-t-lg' : ''}`}>
                          <div className="flex flex-col items-center space-y-1">
                            {/* Nome giorno e data */}
                            <div className="flex items-center justify-center space-x-1">
                              <span className={isToday ? 'text-primary font-semibold' : ''}>{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][idx]}</span>
                              {!weatherLoading && weather && (
                                <WeatherIcon size={16} className="text-blue-500" />
                              )}
                            </div>
                            <div className={`text-xs ${isToday ? 'text-primary/80' : 'text-muted-foreground'}`}>
                              {day.getDate()}/{day.getMonth() + 1}
                            </div>
                            
                            {/* Informazioni meteo aggiuntive */}
                            {!weatherLoading && weather && (
                              <div className="text-xs space-y-1">
                                {/* Temperatura */}
                                <div className="flex items-center justify-center space-x-1 text-orange-600">
                                  <Thermometer size={10} />
                                  <span>{weather.temperature_max}°/{weather.temperature_min}°</span>
                                </div>
                                
                                {/* Vento */}
                                {weather.wind_speed_max > 5 && (
                                  <div className="flex items-center justify-center space-x-1 text-blue-600">
                                    <Wind size={10} />
                                    <span>{weather.wind_speed_max}km/h {getWindDirection(weather.wind_direction)}</span>
                                  </div>
                                )}
                                
                                {/* Probabilità pioggia */}
                                {weather.precipitation_probability > 30 && (
                                  <div className="text-xs text-blue-600">
                                    {weather.precipitation_probability}%
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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
                                   
                                   {/* Menu contestuale per annullamento pioggia */}
                                   <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                     {!prenotazione.annullata_pioggia ? (
                                       <Button
                                         size="sm"
                                         variant="destructive"
                                         className="h-6 w-6 p-0"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleAnnullaPioggia(prenotazione);
                                         }}
                                         title="Annulla per pioggia"
                                       >
                                         <CloudRain size={12} />
                                       </Button>
                                     ) : (
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         className="h-6 w-6 p-0 bg-green-50"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleRipristinaPrenotazione(prenotazione);
                                         }}
                                         title="Ripristina prenotazione"
                                       >
                                         <AlertTriangle size={12} />
                                       </Button>
                                     )}
                                   </div>
                                 </div>
                               ) : (
                                 <div 
                                   className={`p-1 rounded text-xs text-center cursor-pointer transition-colors ${
                                     isSlotSelected(day, time, 2) 
                                       ? 'bg-blue-200 text-blue-800 border-2 border-blue-400' 
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
              <div className="w-4 h-4 bg-blue-100 rounded"></div>
              <span className="text-sm">Pagato</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span className="text-sm">Da Pagare</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100/50 rounded border border-red-300"></div>
              <span className="text-sm">Annullata per pioggia</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-200 rounded border-2 border-blue-400"></div>
              <span className="text-sm">Selezione multipla (Shift+Click e trascina)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 rounded border border-purple-300"></div>
              <span className="text-sm">Corsi/Abbonamenti (pagati)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 rounded border border-orange-300"></div>
              <span className="text-sm">Corsi/Abbonamenti (da pagare)</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default Prenotazioni;