import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tariffa } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import TariffaDialog from '@/components/TariffaDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Tariffe = () => {
  const [tariffe, setTariffe] = useState<Tariffa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTariffa, setSelectedTariffa] = useState<Tariffa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tariffaToDelete, setTariffaToDelete] = useState<Tariffa | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    loadTariffe();
  }, []);

  const loadTariffe = async () => {
    try {
      const { data, error } = await supabase
        .from('tariffe')
        .select('*')
        .eq('attivo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      setTariffe(data || []);
    } catch (error) {
      console.error('Error loading tariffe:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le tariffe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'singolare': return 'Singolare';
      case 'doppio': return 'Doppio';
      case 'corso': return 'Corso';
      case 'lezione': return 'Lezione';
      default: return tipo;
    }
  };

  const getCampoLabel = (campo: string) => {
    switch (campo) {
      case 'scoperto': return 'Scoperto';
      case 'coperto': return 'Coperto';
      default: return campo;
    }
  };

  const isAdmin = profile?.ruolo === 'admin';

  const handleAddTariffa = () => {
    setSelectedTariffa(null);
    setDialogOpen(true);
  };

  const handleEditTariffa = (tariffa: Tariffa) => {
    setSelectedTariffa(tariffa);
    setDialogOpen(true);
  };

  const handleDeleteClick = (tariffa: Tariffa) => {
    setTariffaToDelete(tariffa);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tariffaToDelete) return;

    try {
      const { error } = await supabase
        .from('tariffe')
        .update({ attivo: false })
        .eq('id', tariffaToDelete.id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Tariffa eliminata con successo",
      });

      loadTariffe();
    } catch (error) {
      console.error('Error deleting tariffa:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la tariffa",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTariffaToDelete(null);
    }
  };

  if (loading) return <div>Caricamento tariffe...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestione Tariffe</h2>
          <p className="text-muted-foreground">
            Configura i prezzi per i diversi tipi di prenotazione
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAddTariffa}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Tariffa
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tariffe Attuali</CardTitle>
            <CardDescription>
              Elenco di tutte le tariffe configurate nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tariffe.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nessuna tariffa configurata</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Tariffa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Orario</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Prezzo Ora</TableHead>
                    <TableHead className="text-right">Prezzo Mezz'ora</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tariffe.map((tariffa) => (
                    <TableRow key={tariffa.id}>
                      <TableCell className="font-medium">
                        {tariffa.nome}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTipoLabel(tariffa.tipo_prenotazione)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getCampoLabel(tariffa.tipo_campo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tariffa.diurno ? "default" : "destructive"}>
                          {tariffa.diurno ? 'Diurno' : 'Notturno'}
                        </Badge>
                      </TableCell>
                    <TableCell>
                      <Badge variant={tariffa.soci ? "default" : "secondary"}>
                        {tariffa.soci ? 'Soci' : 'Non Soci'}
                      </Badge>
                    </TableCell>
                      <TableCell className="text-right font-mono">
                        €{tariffa.prezzo_ora.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{tariffa.prezzo_mezz_ora.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditTariffa(tariffa)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Modifica
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteClick(tariffa)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tariffe Soci
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tariffe.filter(t => t.soci).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tariffe Non Soci
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tariffe.filter(t => !t.soci).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Prezzo Min/Ora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{tariffe.length > 0 ? Math.min(...tariffe.map(t => t.prezzo_ora)).toFixed(2) : '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Prezzo Max/Ora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{tariffe.length > 0 ? Math.max(...tariffe.map(t => t.prezzo_ora)).toFixed(2) : '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TariffaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tariffa={selectedTariffa}
        onSuccess={loadTariffe}
      />

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la tariffa "{tariffaToDelete?.nome}"?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tariffe;