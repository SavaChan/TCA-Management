import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Socio } from '@/types/database';
import { toast } from '@/hooks/use-toast';

const Soci = () => {
  const [soci, setSoci] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSoci();
  }, []);

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
      toast({
        title: "Errore",
        description: "Impossibile caricare i soci",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSoci = soci.filter(socio =>
    `${socio.nome} ${socio.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    socio.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoSocioColor = (tipo: string) => {
    switch (tipo) {
      case 'frequentatore': return 'secondary';
      case 'non_agonista': return 'default';
      case 'agonista': return 'destructive';
      case 'maestro': return 'default';
      default: return 'secondary';
    }
  };

  const getTipoSocioLabel = (tipo: string) => {
    switch (tipo) {
      case 'frequentatore': return 'Frequentatore';
      case 'non_agonista': return 'Non Agonista';
      case 'agonista': return 'Agonista';
      case 'maestro': return 'Maestro';
      default: return tipo;
    }
  };

  if (loading) return <div>Caricamento soci...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestione Soci</h2>
          <p className="text-muted-foreground">
            Gestisci i soci del tennis club
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Socio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Elenco Soci ({soci.length})</CardTitle>
          <CardDescription>
            Tutti i soci attivi del club
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, cognome o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filteredSoci.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {soci.length === 0 ? 'Nessun socio registrato' : 'Nessun socio trovato'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contatto</TableHead>
                  <TableHead>Classifica FITP</TableHead>
                  <TableHead>Certificato Medico</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSoci.map((socio) => (
                  <TableRow key={socio.id}>
                    <TableCell className="font-medium">
                      {socio.nome} {socio.cognome}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTipoSocioColor(socio.tipo_socio)}>
                        {getTipoSocioLabel(socio.tipo_socio)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{socio.email}</div>
                        <div className="text-muted-foreground">{socio.telefono}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {socio.classifica_fitp || '-'}
                    </TableCell>
                    <TableCell>
                      {socio.certificato_medico_scadenza ? (
                        <div className="text-sm">
                          {new Date(socio.certificato_medico_scadenza).toLocaleDateString('it-IT')}
                        </div>
                      ) : (
                        socio.tipo_socio === 'frequentatore' ? 'Non richiesto' : 'Mancante'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Modifica
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Soci;