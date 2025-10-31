import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, FileDown, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Socio } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import SocioDialog from '@/components/SocioDialog';
import * as XLSX from 'xlsx';
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

const Soci = () => {
  const [soci, setSoci] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState<Socio | null>(null);

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

  const handleAddSocio = () => {
    setSelectedSocio(null);
    setDialogOpen(true);
  };

  const handleEditSocio = (socio: Socio) => {
    setSelectedSocio(socio);
    setDialogOpen(true);
  };

  const handleSocioSuccess = () => {
    loadSoci();
  };

  const handleDeleteClick = (socio: Socio) => {
    setSocioToDelete(socio);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!socioToDelete) return;

    try {
      const { error } = await supabase
        .from('soci')
        .update({ attivo: false })
        .eq('id', socioToDelete.id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Socio eliminato con successo",
      });

      loadSoci();
    } catch (error) {
      console.error('Error deleting socio:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il socio",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSocioToDelete(null);
    }
  };

  const downloadExcel = () => {
    const data = soci.map(socio => ({
      'Nome': socio.nome,
      'Cognome': socio.cognome,
      'Tipo Socio': getTipoSocioLabel(socio.tipo_socio),
      'Telefono': socio.telefono || '',
      'Email': socio.email || '',
      'Classifica FITP': socio.classifica_fitp || '',
      'Certificato Medico': socio.certificato_medico_scadenza 
        ? new Date(socio.certificato_medico_scadenza).toLocaleDateString('it-IT')
        : (socio.tipo_socio === 'frequentatore' ? 'Non richiesto' : 'Mancante'),
      'Note': socio.note || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Soci');
    XLSX.writeFile(wb, 'elenco-soci.xlsx');
    
    toast({
      title: "Excel Scaricato",
      description: "L'elenco dei soci è stato scaricato con successo",
    });
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Scarica Excel
          </Button>
          <Button onClick={handleAddSocio}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Socio
          </Button>
        </div>
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
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditSocio(socio)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Modifica
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteClick(socio)}
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

      {/* Dialog per aggiunta/modifica socio */}
      <SocioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        socio={selectedSocio}
        onSuccess={handleSocioSuccess}
      />

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare {socioToDelete?.nome} {socioToDelete?.cognome}?
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

export default Soci;