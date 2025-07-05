import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Prenotazione } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import PrenotazioneDialog from '@/components/PrenotazioneDialog';

const Prenotazioni = () => {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    data: string;
    oraInizio: string;
    campo: number;
  } | null>(null);

  useEffect(() => {
    loadPrenotazioni();
  }, [selectedWeek]);

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
        .order('data', { ascending: true })
        .order('ora_inizio', { ascending: true });

      if (error) throw error;
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

  const handleCellClick = (day: Date, time: string, campo: number) => {
    const prenotazione = getPrenotazioneForSlot(day, time, campo);
    
    if (prenotazione) {
      // Esistente prenotazione - potremmo aprire un dialog di modifica in futuro
      toast({
        title: "Prenotazione esistente",
        description: "Funzionalità di modifica in sviluppo",
      });
    } else {
      // Nuova prenotazione
      setSelectedSlot({
        data: day.toISOString().split('T')[0],
        oraInizio: time,
        campo
      });
      setDialogOpen(true);
    }
  };

  const handlePrenotazioneSuccess = () => {
    loadPrenotazioni();
  };

  const getNomePrenotazione = (prenotazione: Prenotazione) => {
    if (prenotazione.soci) {
      return `${prenotazione.soci.nome} ${prenotazione.soci.cognome}`;
    } else if (prenotazione.ospiti) {
      return `${prenotazione.ospiti.nome} ${prenotazione.ospiti.cognome}`;
    }
    return 'Nome non disponibile';
  };

  const getPrenotazioneForSlot = (day: Date, time: string, campo: number) => {
    const dayStr = day.toISOString().split('T')[0];
    return prenotazioni.find(p => 
      p.data === dayStr && 
      p.ora_inizio === time && 
      p.campo === campo
    );
  };

  const getStatoPagamentoColor = (stato: string) => {
    switch (stato) {
      case 'pagato': return 'bg-blue-100 text-blue-800';
      case 'da_pagare': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();

  if (loading) return <div>Caricamento prenotazioni...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Prenotazioni</h2>
          <p className="text-muted-foreground">
            Gestione settimanale delle prenotazioni dei campi
          </p>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    {weekDays.map((day, idx) => (
                      <th key={idx} className="text-center p-2 font-medium min-w-24">
                        <div>{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][idx]}</div>
                        <div className="text-xs text-muted-foreground">
                          {day.getDate()}/{day.getMonth() + 1}
                        </div>
                      </th>
                    ))}
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
                               <div 
                                 className={`p-1 rounded text-xs text-center cursor-pointer ${getStatoPagamentoColor(prenotazione.stato_pagamento)}`}
                                 onClick={() => handleCellClick(day, time, 1)}
                               >
                                  <div className="font-medium">
                                    {getNomePrenotazione(prenotazione)}
                                  </div>
                                 <div>€{prenotazione.importo}</div>
                               </div>
                             ) : (
                               <div 
                                 className="p-1 rounded text-xs text-center bg-gray-50 text-gray-400 cursor-pointer hover:bg-gray-100"
                                 onClick={() => handleCellClick(day, time, 1)}
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
                    {weekDays.map((day, idx) => (
                      <th key={idx} className="text-center p-2 font-medium min-w-24">
                        <div>{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][idx]}</div>
                        <div className="text-xs text-muted-foreground">
                          {day.getDate()}/{day.getMonth() + 1}
                        </div>
                      </th>
                    ))}
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
                               <div 
                                 className={`p-1 rounded text-xs text-center cursor-pointer ${getStatoPagamentoColor(prenotazione.stato_pagamento)}`}
                                 onClick={() => handleCellClick(day, time, 2)}
                               >
                                  <div className="font-medium">
                                    {getNomePrenotazione(prenotazione)}
                                  </div>
                                 <div>€{prenotazione.importo}</div>
                               </div>
                             ) : (
                               <div 
                                 className="p-1 rounded text-xs text-center bg-gray-50 text-gray-400 cursor-pointer hover:bg-gray-100"
                                 onClick={() => handleCellClick(day, time, 2)}
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
        />
      )}
    </div>
  );
};

export default Prenotazioni;