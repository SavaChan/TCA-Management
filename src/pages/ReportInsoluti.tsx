import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Euro, Calendar, Clock, Phone, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PrenotazioneInsoluta {
  id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  campo: number;
  importo: number;
  tipo_prenotazione: string;
  created_at: string;
  soci?: {
    nome: string;
    cognome: string;
    telefono: string | null;
  };
  ospiti?: {
    nome: string;
    cognome: string;
    telefono: string | null;
  };
}

interface ClienteTotale {
  nome: string;
  cognome: string;
  telefono: string | null;
  tipo: 'socio' | 'ospite';
  totale: number;
  prenotazioni: PrenotazioneInsoluta[];
}

const ReportInsoluti = () => {
  const [insoluti, setInsoluti] = useState<PrenotazioneInsoluta[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'cognome' | 'data' | 'tipo' | 'importo' | 'cliente_totale'>('cognome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'lista' | 'clienti'>('lista');

  useEffect(() => {
    loadInsoluti();
  }, []);

  const loadInsoluti = async () => {
    try {
      const { data, error } = await supabase
        .from('prenotazioni')
        .select(`
          id,
          data,
          ora_inizio,
          ora_fine,
          campo,
          importo,
          tipo_prenotazione,
          created_at,
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
        .eq('stato_pagamento', 'da_pagare')
        .order('data', { ascending: false });

      if (error) throw error;
      setInsoluti(data || []);
    } catch (error) {
      console.error('Error loading insoluti:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati degli insoluti",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNomeCliente = (prenotazione: PrenotazioneInsoluta) => {
    if (prenotazione.soci) {
      return `${prenotazione.soci.cognome} ${prenotazione.soci.nome}`;
    } else if (prenotazione.ospiti) {
      return `${prenotazione.ospiti.cognome} ${prenotazione.ospiti.nome}`;
    }
    return 'Nome non disponibile';
  };

  const getTelefono = (prenotazione: PrenotazioneInsoluta) => {
    if (prenotazione.soci?.telefono) {
      return prenotazione.soci.telefono;
    } else if (prenotazione.ospiti?.telefono) {
      return prenotazione.ospiti.telefono;
    }
    return 'Non disponibile';
  };

  const getWeekNumber = (date: string) => {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const getDateDetails = (date: string) => {
    const d = new Date(date);
    return {
      giorno: d.getDate(),
      mese: d.getMonth() + 1,
      anno: d.getFullYear(),
      settimana: getWeekNumber(date)
    };
  };

  const getClientiTotali = (): ClienteTotale[] => {
    const clientiMap = new Map<string, ClienteTotale>();
    
    insoluti.forEach(prenotazione => {
      let key = '';
      let cliente: ClienteTotale;
      
      if (prenotazione.soci) {
        key = `socio_${prenotazione.soci.cognome}_${prenotazione.soci.nome}`;
        if (!clientiMap.has(key)) {
          clientiMap.set(key, {
            nome: prenotazione.soci.nome,
            cognome: prenotazione.soci.cognome,
            telefono: prenotazione.soci.telefono,
            tipo: 'socio',
            totale: 0,
            prenotazioni: []
          });
        }
      } else if (prenotazione.ospiti) {
        key = `ospite_${prenotazione.ospiti.cognome}_${prenotazione.ospiti.nome}`;
        if (!clientiMap.has(key)) {
          clientiMap.set(key, {
            nome: prenotazione.ospiti.nome,
            cognome: prenotazione.ospiti.cognome,
            telefono: prenotazione.ospiti.telefono,
            tipo: 'ospite',
            totale: 0,
            prenotazioni: []
          });
        }
      }
      
      if (key && clientiMap.has(key)) {
        cliente = clientiMap.get(key)!;
        cliente.totale += prenotazione.importo;
        cliente.prenotazioni.push(prenotazione);
      }
    });
    
    return Array.from(clientiMap.values()).sort((a, b) => {
      const nomeA = `${a.cognome} ${a.nome}`;
      const nomeB = `${b.cognome} ${b.nome}`;
      return sortOrder === 'asc' ? nomeA.localeCompare(nomeB) : nomeB.localeCompare(nomeA);
    });
  };

  const sortedInsoluti = [...insoluti].sort((a, b) => {
    let valueA: any, valueB: any;

    switch (sortBy) {
      case 'cognome':
        valueA = getNomeCliente(a);
        valueB = getNomeCliente(b);
        break;
      case 'data':
        valueA = new Date(a.data);
        valueB = new Date(b.data);
        break;
      case 'tipo':
        valueA = a.tipo_prenotazione;
        valueB = b.tipo_prenotazione;
        break;
      case 'importo':
        valueA = a.importo;
        valueB = b.importo;
        break;
      default:
        return 0;
    }

    if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalInsoluti = insoluti.reduce((sum, item) => sum + item.importo, 0);

  if (loading) return <div>Caricamento report insoluti...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Report Insoluti</h1>
          <p className="text-muted-foreground">Elenco delle prenotazioni non ancora saldate</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Visualizza:</label>
            <Select value={viewMode} onValueChange={(value: 'lista' | 'clienti') => setViewMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lista">Lista Cronologica</SelectItem>
                <SelectItem value="clienti">Per Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {viewMode === 'lista' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Ordina per:</label>
              <Select value={sortBy} onValueChange={(value: 'cognome' | 'data' | 'tipo' | 'importo') => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cognome">Cognome</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="tipo">Tipo</SelectItem>
                  <SelectItem value="importo">Importo</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Insoluti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{insoluti.length}</div>
            <p className="text-xs text-muted-foreground">
              prenotazioni non pagate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Importo Totale</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">€{totalInsoluti.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              da incassare
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media per Prenotazione</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              €{insoluti.length > 0 ? (totalInsoluti / insoluti.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              importo medio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabella insoluti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>{viewMode === 'lista' ? 'Lista Cronologica' : 'Riepilogo per Cliente'}</span>
          </CardTitle>
          <CardDescription>
            {viewMode === 'lista' 
              ? 'Elenco completo delle prenotazioni in attesa di pagamento ordinato cronologicamente'
              : 'Totali per cliente con dettaglio delle prenotazioni'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insoluti.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna prenotazione insoluta trovata
            </div>
          ) : viewMode === 'lista' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Data Completa</TableHead>
                  <TableHead>Settimana</TableHead>
                  <TableHead>Anno</TableHead>
                  <TableHead>Ora</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInsoluti.map((prenotazione) => {
                  const dateDetails = getDateDetails(prenotazione.data);
                  return (
                    <TableRow key={prenotazione.id}>
                      <TableCell className="font-medium">
                        {getNomeCliente(prenotazione)}
                        {prenotazione.ospiti && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Ospite
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{getTelefono(prenotazione)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {dateDetails.giorno}/{dateDetails.mese}/{dateDetails.anno}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          #{dateDetails.settimana}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {dateDetails.anno}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {prenotazione.ora_inizio} - {prenotazione.ora_fine}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Campo {prenotazione.campo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className="capitalize"
                        >
                          {prenotazione.tipo_prenotazione.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        €{prenotazione.importo.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-4">
              {getClientiTotali().map((cliente, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {cliente.cognome} {cliente.nome}
                          <Badge variant="outline" className="ml-2">
                            {cliente.tipo === 'socio' ? 'Socio' : 'Ospite'}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{cliente.telefono || 'Non disponibile'}</span>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          €{cliente.totale.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {cliente.prenotazioni.length} prenotazion{cliente.prenotazioni.length === 1 ? 'e' : 'i'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {cliente.prenotazioni
                        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                        .map((prenotazione) => {
                          const dateDetails = getDateDetails(prenotazione.data);
                          return (
                            <div key={prenotazione.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                              <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span>{dateDetails.giorno}/{dateDetails.mese}/{dateDetails.anno}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span>{prenotazione.ora_inizio}-{prenotazione.ora_fine}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Campo {prenotazione.campo}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Sett. #{dateDetails.settimana}
                                </Badge>
                              </div>
                              <div className="font-semibold text-primary">
                                €{prenotazione.importo.toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportInsoluti;