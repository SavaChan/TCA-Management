import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Euro, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [stats, setStats] = useState({
    soci: 0,
    prenotazioniOggi: 0,
    incassiMese: 0,
    daPagare: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Conta soci attivi
      const { count: sociCount } = await supabase
        .from('soci')
        .select('*', { count: 'exact', head: true })
        .eq('attivo', true);

      // Prenotazioni oggi
      const oggi = new Date().toISOString().split('T')[0];
      const { count: prenotazioniOggi } = await supabase
        .from('prenotazioni')
        .select('*', { count: 'exact', head: true })
        .eq('data', oggi)
        .eq('annullata_pioggia', false);

      // Incassi del mese corrente
      const inizioMese = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const fineMese = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data: incassiMese } = await supabase
        .from('pagamenti')
        .select('importo')
        .gte('data_pagamento', inizioMese)
        .lte('data_pagamento', fineMese);

      // Prenotazioni da pagare
      const { data: daPagare } = await supabase
        .from('prenotazioni')
        .select('importo')
        .eq('stato_pagamento', 'da_pagare')
        .eq('annullata_pioggia', false);

      const totalIncassi = incassiMese?.reduce((sum, p) => sum + Number(p.importo), 0) || 0;
      const totalDaPagare = daPagare?.reduce((sum, p) => sum + Number(p.importo), 0) || 0;

      setStats({
        soci: sociCount || 0,
        prenotazioniOggi: prenotazioniOggi || 0,
        incassiMese: totalIncassi,
        daPagare: totalDaPagare
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Panoramica del tennis club
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Soci Totali
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.soci}</div>
            <p className="text-xs text-muted-foreground">
              {stats.soci === 0 ? 'Nessun socio registrato' : `${stats.soci > 1 ? 'soci attivi' : 'socio attivo'}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prenotazioni Oggi
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prenotazioniOggi}</div>
            <p className="text-xs text-muted-foreground">
              {stats.prenotazioniOggi === 0 ? 'Nessuna prenotazione' : `${stats.prenotazioniOggi > 1 ? 'prenotazioni oggi' : 'prenotazione oggi'}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Incassi Mese
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.incassiMese.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.incassiMese === 0 ? 'Nessun incasso' : 'Incassi del mese corrente'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Da Pagare
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.daPagare.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.daPagare === 0 ? 'Nessun credito' : 'Importi da incassare'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
            <CardDescription>
              Inizia gestendo i tuoi soci e le tariffe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Aggiungi i primi soci del club
            </p>
            <p className="text-sm text-muted-foreground">
              • Configura le tariffe per i campi
            </p>
            <p className="text-sm text-muted-foreground">
              • Inizia a gestire le prenotazioni
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stato Sistema</CardTitle>
            <CardDescription>
              Database configurato e pronto all'uso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Sistema operativo</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;