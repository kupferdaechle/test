import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, Plus, Trash2, Edit, ExternalLink, Mail, Phone, MapPin, 
  Upload, FileSpreadsheet, Check, X, AlertCircle, Loader2, Search
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function KundenstammPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKunde, setEditingKunde] = useState(null);
  const [deleteKunde, setDeleteKunde] = useState(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvSaving, setCsvSaving] = useState(false);
  const [csvError, setCsvError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    kundennummer: "",
    name: "",
    firma: "",
    website: "",
    strasse: "",
    plz: "",
    stadt: "",
    land: "Deutschland",
    email: "",
    telefon: "",
    notizen: "",
  });

  const queryClient = useQueryClient();

  const { data: kunden = [], isLoading, error } = useQuery({
    queryKey: ['kundenstamm'],
    queryFn: () => base44.entities.Kundenstamm.list('kundennummer'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Kundenstamm.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kundenstamm'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Kundenstamm.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kundenstamm'] });
      setDialogOpen(false);
      resetForm();
      setEditingKunde(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Kundenstamm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kundenstamm'] });
      setDeleteKunde(null);
    },
  });

  const generateKundennummer = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `KD-${month}-${year}-${random}`;
  };

  const resetForm = () => {
    setFormData({
      kundennummer: generateKundennummer(),
      name: "",
      firma: "",
      website: "",
      strasse: "",
      plz: "",
      stadt: "",
      land: "Deutschland",
      email: "",
      telefon: "",
      notizen: "",
    });
  };

  const handleEdit = (kunde) => {
    setEditingKunde(kunde);
    setFormData({
      kundennummer: kunde.kundennummer || "",
      name: kunde.name || "",
      firma: kunde.firma || "",
      website: kunde.website || "",
      strasse: kunde.strasse || "",
      plz: kunde.plz || "",
      stadt: kunde.stadt || "",
      land: kunde.land || "Deutschland",
      email: kunde.email || "",
      telefon: kunde.telefon || "",
      notizen: kunde.notizen || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingKunde) {
      await updateMutation.mutateAsync({ id: editingKunde.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async () => {
    if (deleteKunde) {
      await deleteMutation.mutateAsync(deleteKunde.id);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        if (header.includes('kundennummer')) row.kundennummer = value;
        else if (header === 'name') row.name = value;
        else if (header === 'firma') row.firma = value;
        else if (header === 'website') row.website = value;
        else if (header.includes('straße') || header.includes('strasse')) row.strasse = value;
        else if (header === 'plz') row.plz = value;
        else if (header === 'stadt') row.stadt = value;
        else if (header === 'land') row.land = value;
        else if (header.includes('email') || header.includes('e-mail')) row.email = value;
        else if (header.includes('telefon')) row.telefon = value;
        else if (header.includes('notizen')) row.notizen = value;
      });
      
      if (row.firma) {
        if (!row.kundennummer) row.kundennummer = generateKundennummer();
        data.push(row);
      }
    }
    
    return data;
  };

  const handleCSVUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCsvError('Bitte wählen Sie eine CSV-Datei aus.');
      event.target.value = '';
      return;
    }

    setCsvUploading(true);
    setCsvError(null);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        setCsvError('Keine gültigen Kundendaten gefunden.');
      } else {
        setCsvData(parsed);
      }
    } catch (err) {
      setCsvError('Fehler beim Lesen der CSV-Datei.');
    } finally {
      setCsvUploading(false);
      event.target.value = '';
    }
  };

  const saveCSVData = async () => {
    if (csvData.length === 0) return;

    setCsvSaving(true);
    setCsvError(null);

    try {
      await base44.entities.Kundenstamm.bulkCreate(csvData);
      queryClient.invalidateQueries({ queryKey: ['kundenstamm'] });
      setCsvImportOpen(false);
      setCsvData([]);
    } catch (err) {
      setCsvError('Fehler beim Speichern der Kundendaten.');
    } finally {
      setCsvSaving(false);
    }
  };

  const removeCSVRow = (index) => {
    setCsvData(prev => prev.filter((_, i) => i !== index));
  };

  const filteredKunden = kunden.filter(kunde => 
    kunde.firma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kunde.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kunde.kundennummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kunde.stadt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Kundenstamm</h1>
          <p className="text-slate-600 mt-1">Verwalten Sie Ihre Kundenstammdaten</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            CSV Import
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingKunde(null); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Neuer Kunde
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingKunde ? "Kunde bearbeiten" : "Neuen Kunden anlegen"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kundennummer</Label>
                    <Input value={formData.kundennummer} onChange={(e) => setFormData({ ...formData, kundennummer: e.target.value })} placeholder="KD-MM-JJ-NNNN" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ansprechpartner</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Firma *</Label>
                    <Input value={formData.firma} onChange={(e) => setFormData({ ...formData, firma: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Straße</Label>
                  <Input value={formData.strasse} onChange={(e) => setFormData({ ...formData, strasse: e.target.value })} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>PLZ</Label>
                    <Input value={formData.plz} onChange={(e) => setFormData({ ...formData, plz: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stadt</Label>
                    <Input value={formData.stadt} onChange={(e) => setFormData({ ...formData, stadt: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Land</Label>
                    <Input value={formData.land} onChange={(e) => setFormData({ ...formData, land: e.target.value })} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input value={formData.telefon} onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notizen</Label>
                  <Textarea value={formData.notizen} onChange={(e) => setFormData({ ...formData, notizen: e.target.value })} className="min-h-20" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingKunde ? "Aktualisieren" : "Erstellen"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Suchen nach Firma, Name, Kundennummer oder Stadt..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive"><AlertDescription>Fehler beim Laden der Kunden.</AlertDescription></Alert>
      ) : filteredKunden.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">{searchTerm ? "Keine Kunden gefunden" : "Noch keine Kunden angelegt"}</p>
            {!searchTerm && (
              <Button onClick={() => { resetForm(); setEditingKunde(null); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />Ersten Kunden anlegen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Kd-Nr.</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Firma</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden md:table-cell">Ansprechpartner</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Stadt</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">E-Mail</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden xl:table-cell">Telefon</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKunden.map((kunde) => (
                <tr key={kunde.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge className="text-xs bg-blue-100 text-blue-700 font-mono">{kunde.kundennummer || '-'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{kunde.firma}</div>
                        {kunde.website && (
                          <a href={kunde.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />Website
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-600">{kunde.name || '-'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-slate-600">{kunde.stadt || '-'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {kunde.email ? (
                      <a href={`mailto:${kunde.email}`} className="text-sm text-slate-600 hover:text-blue-600">{kunde.email}</a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {kunde.telefon ? (
                      <a href={`tel:${kunde.telefon}`} className="text-sm text-slate-600 hover:text-blue-600">{kunde.telefon}</a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(kunde)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteKunde(kunde)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteKunde} onOpenChange={() => setDeleteKunde(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>Der Kunde "{deleteKunde?.firma}" wird permanent gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Wird gelöscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={csvImportOpen} onOpenChange={setCsvImportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-green-600" />CSV Import - Kundenstamm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" disabled={csvUploading} onClick={() => document.getElementById('kundenstamm-csv-upload')?.click()} className="gap-2">
                {csvUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Wird geladen...</> : <><Upload className="w-4 h-4" />CSV-Datei auswählen</>}
              </Button>
              <input id="kundenstamm-csv-upload" type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
              <span className="text-sm text-slate-500">Trennzeichen: Semikolon (;)</span>
            </div>
            {csvError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{csvError}</AlertDescription></Alert>}
            {csvData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 font-medium text-sm flex items-center justify-between">
                  <span>{csvData.length} Kunden gefunden</span>
                  <Button size="sm" onClick={saveCSVData} disabled={csvSaving} className="gap-2">
                    {csvSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Speichern...</> : <><Check className="w-4 h-4" />Alle speichern</>}
                  </Button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2">Kd-Nr.</th>
                        <th className="text-left px-4 py-2">Firma</th>
                        <th className="text-left px-4 py-2">Name</th>
                        <th className="text-left px-4 py-2">Stadt</th>
                        <th className="text-right px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, index) => (
                        <tr key={index} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-xs">{row.kundennummer}</td>
                          <td className="px-4 py-2 font-medium">{row.firma}</td>
                          <td className="px-4 py-2">{row.name || '-'}</td>
                          <td className="px-4 py-2">{row.stadt || '-'}</td>
                          <td className="px-4 py-2 text-right">
                            <Button variant="ghost" size="sm" onClick={() => removeCSVRow(index)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><X className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {csvData.length === 0 && !csvError && (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">
                <FileSpreadsheet className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p>Laden Sie eine CSV-Datei hoch, um Kundenstammdaten zu importieren.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}