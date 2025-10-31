import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, UserPlus, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Ospite } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import OspiteDialog from '@/components/OspiteDialog';
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

const Ospiti = () => {
  const [ospiti, setOspiti] = useState<Ospite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOspite, setSelectedOspite] = useState<Ospite | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ospiteToDelete, setOspiteToDelete] = useState<Ospite | null>(null);

  useEffect(() => {
    loadOspiti();
  }, []);

  const loadOspiti = async () => {
    try {
      const { data, error } = await supabase
        .from('ospiti')
        .select('*')
        .order('cognome', { ascending: true });

      if (error) throw error;
      setOspiti(data || []);
    } catch (error) {
      console.error('Error loading ospiti:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la lista degli ospiti",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOspiti = ospiti.filter(ospite =>
    `${ospite.nome} ${ospite.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ospite.telefono && ospite.telefono.includes(searchTerm)) ||
    (ospite.email && ospite.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddOspite = () => {
    setSelectedOspite(undefined);
    setDialogOpen(true);
  };

  const handleEditOspite = (ospite: Ospite) => {
    setSelectedOspite(ospite);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadOspiti();
    setDialogOpen(false);
    setSelectedOspite(undefined);
  };

  const handleDeleteClick = (ospite: Ospite) => {
    setOspiteToDelete(ospite);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ospiteToDelete) return;

    try {
      const { error } = await supabase
        .from('ospiti')
        .delete()
        .eq('id', ospiteToDelete.id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Ospite eliminato con successo",
      });

      loadOspiti();
    } catch (error) {
      console.error('Error deleting ospite:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'ospite",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setOspiteToDelete(null);
    }
  };

  const getOspiteStats = () => {
    return {
      total: ospiti.length,
      withPhone: ospiti.filter(o => o.telefono).length,
      withEmail: ospiti.filter(o => o.email).length,
    };
  };

  const stats = getOspiteStats();

  if (loading) return <div>Caricamento ospiti...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestione Ospiti</h1>
          <p className="text-muted-foreground">Database degli ospiti ricorrenti del club</p>
        </div>
        <Button onClick={handleAddOspite} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <UserPlus className="h-4 w-4 mr-2" />
          Aggiungi Ospite
        </Button>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Ospiti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              ospiti registrati
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Telefono</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.withPhone}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0}% del totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.withEmail}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0}% del totale
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra di ricerca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, cognome, telefono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabella ospiti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Lista Ospiti ({filteredOspiti.length})</span>
          </CardTitle>
          <CardDescription>
            Gestisci il database degli ospiti ricorrenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOspiti.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nessun ospite trovato con i criteri di ricerca' : 'Nessun ospite registrato'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Registrato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOspiti.map((ospite) => (
                  <TableRow key={ospite.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{ospite.nome} {ospite.cognome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ospite.telefono ? (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{ospite.telefono}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non disponibile</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ospite.email ? (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{ospite.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non disponibile</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ospite.note ? (
                        <span className="text-sm">{ospite.note.substring(0, 50)}{ospite.note.length > 50 ? '...' : ''}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nessuna nota</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(ospite.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOspite(ospite)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Modifica
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(ospite)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OspiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ospite={selectedOspite}
        onSuccess={handleDialogSuccess}
      />

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare {ospiteToDelete?.nome} {ospiteToDelete?.cognome}?
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

export default Ospiti;