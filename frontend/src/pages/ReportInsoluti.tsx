// ReportInsoluti.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Euro, Calendar, Clock, Phone, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/* Import extra dialog + DropDown */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface PrenotazioneInsoluta {
  id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  campo: number;
  importo: number;
  tipo_prenotazione: string;
  created_at: string;
  soci?: { nome: string; cognome: string; telefono: string | null };
  ospiti?: { nome: string; cognome: string; telefono: string | null };
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

  /* Nuovo stato per pagamento */
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPrenotazioni, setSelectedPrenotazioni] = useState<PrenotazioneInsoluta[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');

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
          soci (nome, cognome, telefono),
          ospiti (nome, cognome, telefono)
        `)
        .eq('stato_pagamento', 'da_pagare')
        .order('data', { ascending: false });
      if (error) throw error;
      setInsoluti(data || []);
    } catch (error) {
      console.error('Error loading insoluti:', error);
      toast({ title: "Errore", description: "Impossibile caricare i dati degli insoluti", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  /* --- LOGICA CLIENTI --- */
  const getNomeCliente = (p: PrenotazioneInsoluta) =>
    (p.soci ? `${p.soci.cognome} ${p.soci.nome}` : p.ospiti ? `${p.ospiti.cognome} ${p.ospiti.nome}` : 'Nome non disponibile');

  const getTelefono = (p: PrenotazioneInsoluta) =>
    p.soci?.telefono ?? p.ospiti?.telefono ?? 'Non disponibile';

  const getClientiTotali = (): ClienteTotale[] => {
    const map = new Map<string, ClienteTotale>();
    insoluti.forEach(p => {
      const tipo = p.soci ? 'socio' : 'ospite';
      const nome = tipo === 'socio' ? p.soci! : p.ospiti!;
      const key = `${nome.cognome}_${nome.nome}_${tipo}`;
      if (!map.has(key))
        map.set(key, { ...nome, tipo, totale: 0, prenotazioni: [] });
      const c = map.get(key)!;
      c.totale += Number(p.importo);
      c.prenotazioni.push(p);
    });
    return Array.from(map.values()).sort((a,b)=>`${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`));
  };

  /* Ordinamenti lista normale */
  const sortedInsoluti = useMemo(()=> [...insoluti].sort((a,b)=>{
    let va:any,vb:any;
    switch(sortBy){
      case 'cognome': va=getNomeCliente(a); vb=getNomeCliente(b); break;
      case 'data': va=new Date(a.data); vb=new Date(b.data); break;
      case 'tipo': va=a.tipo_prenotazione; vb=b.tipo_prenotazione; break;
      case 'importo': va=a.importo; vb=b.importo; break;
      default: return 0;
    }
    return sortOrder==='asc'? (va>vb?1:-1):(va<vb?1:-1);
  }),[insoluti, sortBy, sortOrder]);

  /* Export */
  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      insoluti.map((i) => ({
        Cliente: getNomeCliente(i),
        Data: i.data,
        Ora: `${i.ora_inizio}-${i.ora_fine}`,
        Campo: i.campo,
        Importo: i.importo,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Insoluti');
    XLSX.writeFile(wb, 'insoluti.xlsx');
  };
  const downloadPdf = () => {
    const doc = new jsPDF('p','mm','a4');
    (doc as any).autoTable({
      head: [['Cliente','Data','Ora','Campo','Importo (€)']],
      body: insoluti.map(i=>[getNomeCliente(i), i.data, `${i.ora_inizio}-${i.ora_fine}`, i.campo, `${i.importo}`]),
    });
    doc.save('insoluti.pdf');
  };
  /* ---------- Gestione Pagamento ---------- */
  const openPayModal = (lst: PrenotazioneInsoluta[]) => {
    setSelectedPrenotazioni(lst);
    const tot = lst.reduce((s,p)=>s+Number(p.importo),0);
    setPaymentAmount(tot.toFixed(2));
    setPayModalOpen(true);
  };
  const handlePay = async () => {
    const ids = selectedPrenotazioni.map((p) => p.id);
    const enteredAmount = paymentAmount === '' ? null : parseFloat(paymentAmount);
    const totalDebt = selectedPrenotazioni.reduce((s, p) => s + Number(p.importo), 0);
    
    try {
      // Logica per gestire i pagamenti
      if (selectedPrenotazioni.length === 1) {
        // Pagamento singolo: usa l'importo inserito o quello della prenotazione
        const finalAmount = enteredAmount !== null ? enteredAmount : Number(selectedPrenotazioni[0].importo);
        
        const { error: paymentError } = await supabase.from('pagamenti').insert({
          prenotazione_id: selectedPrenotazioni[0].id,
          importo: finalAmount,
          data_pagamento: new Date().toISOString(),
          metodo_pagamento: 'Contanti',
          metodo_pagamento_tipo: 'contanti'
        });
        
        if (paymentError) throw paymentError;
        
      } else {
        // Pagamento multiplo: distribuisce l'importo proporzionalmente se specificato
        if (enteredAmount !== null && enteredAmount !== totalDebt) {
          // Distribuzione proporzionale dell'importo inserito
          for (const prenotazione of selectedPrenotazioni) {
            const proportion = Number(prenotazione.importo) / totalDebt;
            const proportionalAmount = enteredAmount * proportion;
            
            const { error: paymentError } = await supabase.from('pagamenti').insert({
              prenotazione_id: prenotazione.id,
              importo: proportionalAmount,
              data_pagamento: new Date().toISOString(),
              metodo_pagamento: 'Contanti',
              metodo_pagamento_tipo: 'contanti'
            });
            
            if (paymentError) throw paymentError;
          }
        } else {
          // Pagamento completo: ogni prenotazione con il suo importo
          const { error: paymentError } = await supabase.from('pagamenti').insert(
            selectedPrenotazioni.map(p => ({
              prenotazione_id: p.id,
              importo: Number(p.importo),
              data_pagamento: new Date().toISOString(),
              metodo_pagamento: 'Contanti',
              metodo_pagamento_tipo: 'contanti'
            }))
          );
          
          if (paymentError) throw paymentError;
        }
      }
      
      // Aggiorna lo stato delle prenotazioni
      const { error: updateError } = await supabase
        .from('prenotazioni')
        .update({ stato_pagamento: 'pagato'})
        .in('id', ids);
      
      if (updateError) throw updateError;
      
      toast({title:'Pagamento registrato con successo'});
      setPayModalOpen(false);
      loadInsoluti();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({title:'Errore', description:'Impossibile registrare il pagamento', variant: 'destructive'});
    }
  };

  /* ---------- Render ---------- */
  const total = useMemo(()=>insoluti.reduce((s,p)=>s+Number(p.importo),0),[insoluti]);

  if (loading) return <div className="p-6">Caricamento report degli insoluti…</div>;

  return (
    <div className="space-y-6">
      {/* intestazione */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Report Insoluti</h1>
          <p className="text-muted-foreground">Elenco delle prenotazioni non ancora saldate</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadExcel}>Excel</Button>
          <Button variant="outline" size="sm" onClick={downloadPdf}>PDF</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Totale insoluti</CardTitle></CardHeader>
          <CardContent><div className="text-2xl">{insoluti.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Importo totale</CardTitle></CardHeader>
          <CardContent><div className="text-2xl text-destructive font-bold">€{total.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Media</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl">€{insoluti.length? (total/insoluti.length).toFixed(2) : '0.00'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ore in debito</CardTitle></CardHeader>
        <CardContent>
          {insoluti.length===0
            ? <p className="text-center py-4 text-muted-foreground">Nessun debito.</p>
            : getClientiTotali().map(cli=>
              <div key={`${cli.cognome}_${cli.nome}`} className="border rounded-md p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">{cli.cognome} {cli.nome} – 
                    <span className="text-destructive"> €{cli.totale.toFixed(2)}</span></span>
                  {cli.prenotazioni.length>1 && (
                    <Button size="sm" onClick={()=>openPayModal(cli.prenotazioni)}>Registra pagamento</Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ora</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead className="text-right text-destructive">Importo</TableHead>
                      <TableHead/>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cli.prenotazioni.map(p=>{
                      const sett= getWeekNumber(p.data);
                      return(
                      <TableRow key={p.id}>
                        <TableCell>{p.data}</TableCell>
                        <TableCell>{p.ora_inizio}-{p.ora_fine}</TableCell>
                        <TableCell><Badge variant="outline">C{p.campo}</Badge></TableCell>
                        <TableCell className="text-right font-bold text-destructive">
                          €{p.importo.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost"><MoreHorizontal className="w-4 h-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={()=>{ openPayModal([p]); setPaymentAmount(p.importo.toFixed(2)); }}>
                                Registra pagamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>);
                    })}
                  </TableBody>
                </Table>
              </div>)}
        </CardContent>
      </Card>

      {/* Dialog pagamento */}
      {payModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Registra pagamento</h3>
            <p className="text-sm mb-4">Stai saldando {selectedPrenotazioni.length} ore – totale debito €{selectedPrenotazioni.reduce((s,p)=>s+Number(p.importo),0).toFixed(2)}</p>
            <Label>Importo pagato (lascia vuoto per importo pieno)</Label>
            <Input type="number" step={0.01} value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={()=>setPayModalOpen(false)}>Annulla</Button>
              <Button onClick={handlePay}>Conferma</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportInsoluti;
