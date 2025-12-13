import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award, Crown, Star, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SocioRanking {
  id: string;
  nome: string;
  cognome: string;
  ore: number;
}

const ClassificaMVP = () => {
  const [ranking, setRanking] = useState<SocioRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      // Carica tutte le prenotazioni dell'anno corrente con soci
      const { data: prenotazioni, error } = await supabase
        .from('prenotazioni')
        .select(`
          id, socio_id, ora_inizio, ora_fine, annullata_pioggia,
          soci (id, nome, cognome, tipo_socio)
        `)
        .gte('data', startDate)
        .lte('data', endDate)
        .not('socio_id', 'is', null)
        .eq('annullata_pioggia', false);

      if (error) throw error;

      // Calcola le ore per ogni socio (esclusi i maestri)
      const socioHours: Record<string, SocioRanking> = {};

      prenotazioni?.forEach((p: any) => {
        if (p.soci && p.soci.tipo_socio !== 'maestro') {
          const socioId = p.socio_id;
          const oraInizio = parseInt(p.ora_inizio.split(':')[0]);
          const oraFine = parseInt(p.ora_fine.split(':')[0]);
          const ore = oraFine - oraInizio;

          if (!socioHours[socioId]) {
            socioHours[socioId] = {
              id: socioId,
              nome: p.soci.nome,
              cognome: p.soci.cognome,
              ore: 0
            };
          }
          socioHours[socioId].ore += ore;
        }
      });

      // Ordina per ore decrescenti
      const sortedRanking = Object.values(socioHours).sort((a, b) => b.ore - a.ore);
      setRanking(sortedRanking);
    } catch (error) {
      console.error('Errore nel caricamento della classifica:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPodiumStyle = (position: number) => {
    switch (position) {
      case 0:
        return 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 text-black shadow-[0_0_30px_rgba(234,179,8,0.5)]';
      case 1:
        return 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-black shadow-[0_0_20px_rgba(148,163,184,0.4)]';
      case 2:
        return 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white shadow-[0_0_20px_rgba(180,83,9,0.4)]';
      default:
        return 'bg-card border border-border';
    }
  };

  const getPodiumIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Crown className="h-12 w-12 text-yellow-900 drop-shadow-lg" />;
      case 1:
        return <Medal className="h-10 w-10 text-slate-700 drop-shadow-lg" />;
      case 2:
        return <Award className="h-10 w-10 text-amber-200 drop-shadow-lg" />;
      default:
        return null;
    }
  };

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 0:
        return 'h-48';
      case 1:
        return 'h-36';
      case 2:
        return 'h-28';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-xl">Caricamento classifica...</div>
      </div>
    );
  }

  const podium = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="h-10 w-10 text-yellow-500 animate-pulse" />
          <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
            CLASSIFICA MVP {currentYear}
          </h1>
          <Trophy className="h-10 w-10 text-yellow-500 animate-pulse" />
        </div>
        <p className="text-muted-foreground">I campioni del nostro circolo</p>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-4 pt-8">
          {/* 2° Posto */}
          {podium[1] && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className={`w-36 ${getPodiumHeight(1)} ${getPodiumStyle(1)} rounded-t-xl flex flex-col items-center justify-center p-4 transition-all hover:scale-105`}>
                {getPodiumIcon(1)}
                <span className="text-4xl font-black mt-2">2°</span>
              </div>
              <div className="bg-slate-600 w-36 py-4 text-center text-white rounded-b-lg">
                <div className="font-bold text-lg truncate px-2">{podium[1].nome}</div>
                <div className="font-bold truncate px-2">{podium[1].cognome}</div>
                <div className="flex items-center justify-center gap-1 mt-2 text-xl font-black">
                  <Flame className="h-5 w-5 text-orange-400" />
                  {podium[1].ore}h
                </div>
              </div>
            </div>
          )}

          {/* 1° Posto */}
          {podium[0] && (
            <div className="flex flex-col items-center animate-fade-in z-10">
              <Star className="h-8 w-8 text-yellow-400 animate-bounce mb-2" />
              <div className={`w-44 ${getPodiumHeight(0)} ${getPodiumStyle(0)} rounded-t-xl flex flex-col items-center justify-center p-4 transition-all hover:scale-105`}>
                {getPodiumIcon(0)}
                <span className="text-5xl font-black mt-2">1°</span>
              </div>
              <div className="bg-yellow-600 w-44 py-4 text-center text-black rounded-b-lg">
                <div className="font-bold text-xl truncate px-2">{podium[0].nome}</div>
                <div className="font-bold text-lg truncate px-2">{podium[0].cognome}</div>
                <div className="flex items-center justify-center gap-1 mt-2 text-2xl font-black">
                  <Flame className="h-6 w-6 text-red-600" />
                  {podium[0].ore}h
                </div>
              </div>
            </div>
          )}

          {/* 3° Posto */}
          {podium[2] && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className={`w-32 ${getPodiumHeight(2)} ${getPodiumStyle(2)} rounded-t-xl flex flex-col items-center justify-center p-4 transition-all hover:scale-105`}>
                {getPodiumIcon(2)}
                <span className="text-3xl font-black mt-2">3°</span>
              </div>
              <div className="bg-amber-800 w-32 py-4 text-center text-white rounded-b-lg">
                <div className="font-bold truncate px-2">{podium[2].nome}</div>
                <div className="font-bold text-sm truncate px-2">{podium[2].cognome}</div>
                <div className="flex items-center justify-center gap-1 mt-2 text-lg font-black">
                  <Flame className="h-4 w-4 text-orange-400" />
                  {podium[2].ore}h
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rest of ranking */}
      {restOfRanking.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5" />
              Classifica Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {restOfRanking.map((socio, index) => (
                <div
                  key={socio.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors animate-fade-in"
                  style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg">
                      {index + 4}°
                    </span>
                    <div>
                      <span className="font-semibold">{socio.nome} {socio.cognome}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-lg font-bold">
                    <Flame className="h-5 w-5 text-orange-500" />
                    {socio.ore}h
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ranking.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">
              Nessuna prenotazione trovata per l'anno {currentYear}
            </p>
            <p className="text-muted-foreground mt-2">
              Le classifiche si aggiorneranno automaticamente con le nuove prenotazioni
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassificaMVP;
