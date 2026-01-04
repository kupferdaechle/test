import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Plus, Edit, Trash2, Mail, Phone, Linkedin, Sparkles, LayoutGrid, List, Send, Loader2, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function HSxBExpertsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expertToDelete, setExpertToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [selectedExperts, setSelectedExperts] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", body: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role_hsxb: "",
    specialization: "",
    qualifications: "",
    experience: "",
    vita: "",
    profile_picture_url: "",
    linkedin_url: "",
    availability: "Verfügbar",
    status: "unbesetzt"
  });

  const { data: experts = [], isLoading } = useQuery({
    queryKey: ['hsxb_experts'],
    queryFn: () => base44.entities.HSxBExpert.list('last_name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HSxBExpert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsxb_experts'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HSxBExpert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsxb_experts'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HSxBExpert.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsxb_experts'] });
      setDeleteDialogOpen(false);
      setExpertToDelete(null);
    },
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role_hsxb: "",
      specialization: "",
      qualifications: "",
      experience: "",
      vita: "",
      profile_picture_url: "",
      linkedin_url: "",
      availability: "Verfügbar",
      status: "unbesetzt"
    });
    setEditingExpert(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingExpert) {
      updateMutation.mutate({ id: editingExpert.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (expert) => {
    setEditingExpert(expert);
    setFormData(expert);
    setDialogOpen(true);
  };

  const handleDeleteClick = (expert) => {
    setExpertToDelete(expert);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (expertToDelete) {
      deleteMutation.mutate(expertToDelete.id);
    }
  };

  const getAvailabilityColor = (availability) => {
    switch(availability) {
      case 'Verfügbar': return 'bg-green-100 text-green-700 border-green-200';
      case 'Teilweise verfügbar': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Nicht verfügbar': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'unbesetzt': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'angefragt': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'noch unschlüssig': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'mündlich zugesagt': return 'bg-lime-100 text-lime-700 border-lime-200';
      case 'schriftlich bestätigt': return 'bg-green-100 text-green-700 border-green-200';
      case 'ausgeschieden': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handleSelectExpert = (expertId) => {
    setSelectedExperts(prev => 
      prev.includes(expertId) 
        ? prev.filter(id => id !== expertId)
        : [...prev, expertId]
    );
  };

  const handleSelectAll = () => {
    if (selectedExperts.length === experts.length) {
      setSelectedExperts([]);
    } else {
      setSelectedExperts(experts.map(e => e.id));
    }
  };

  const openEmailDialog = (expert = null) => {
    if (expert) {
      setSelectedExperts([expert.id]);
    }
    setEmailData({ subject: "", body: "" });
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    
    const selectedExpertsList = experts.filter(e => selectedExperts.includes(e.id));
    const recipients = selectedExpertsList
      .filter(e => e.email)
      .map(e => e.email);

    try {
      const response = await base44.functions.invoke('sendEmailToExperts', {
        recipients: recipients,
        subject: emailData.subject,
        body: emailData.body
      });

      if (response.data.success) {
        setEmailDialogOpen(false);
        setEmailData({ subject: "", body: "" });
        setSelectedExperts([]);
      }
      setSendingEmail(false);
    } catch (error) {
      console.error("Error sending emails:", error);
      setSendingEmail(false);
    }
  };

  const handleCopyEmailAddresses = () => {
    const selectedExpertsList = experts.filter(e => selectedExperts.includes(e.id));
    const emailAddresses = selectedExpertsList
      .filter(e => e.email)
      .map(e => e.email)
      .join(', ');
    
    navigator.clipboard.writeText(emailAddresses);
  };

  const handleCopyEmailContent = () => {
    const emailContent = `Betreff: ${emailData.subject}\n\n${emailData.body}`;
    navigator.clipboard.writeText(emailContent);
  };

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">HSxB-Experten</h1>
          <p className="text-slate-600 mt-1">Top-KI-Experten der HSxB-Methode</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedExperts.length > 0 && (
            <Button 
              onClick={() => openEmailDialog()} 
              className="gap-2"
              variant="outline"
            >
              <Send className="w-4 h-4" />
              E-Mail an {selectedExperts.length} Experten
            </Button>
          )}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Experten hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExpert ? 'Experten bearbeiten' : 'Neuen Experten hinzufügen'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vorname *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nachname *</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rolle in HSxB-Methode *</Label>
                <Input
                  value={formData.role_hsxb}
                  onChange={(e) => setFormData({...formData, role_hsxb: e.target.value})}
                  placeholder="z.B. Lead AI Strategist, Prozessexperte, Implementierungsspezialist"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Spezialisierung</Label>
                <Input
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                  placeholder="z.B. KI-gestützte Prozessoptimierung, NLP, Machine Learning"
                />
              </div>

              <div className="space-y-2">
                <Label>Qualifikationen</Label>
                <Textarea
                  value={formData.qualifications}
                  onChange={(e) => setFormData({...formData, qualifications: e.target.value})}
                  placeholder="Zertifizierungen, Abschlüsse, Auszeichnungen..."
                  className="min-h-20"
                />
              </div>

              <div className="space-y-2">
                <Label>Berufserfahrung</Label>
                <Textarea
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  placeholder="Relevante Projekterfahrungen und Expertise..."
                  className="min-h-20"
                />
              </div>

              <div className="space-y-2">
                <Label>Vita</Label>
                <Textarea
                  value={formData.vita}
                  onChange={(e) => setFormData({...formData, vita: e.target.value})}
                  placeholder="Ausführlicher Lebenslauf..."
                  className="min-h-32"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Profilbild URL</Label>
                  <Input
                    value={formData.profile_picture_url}
                    onChange={(e) => setFormData({...formData, profile_picture_url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Verfügbarkeit</Label>
                  <Select
                    value={formData.availability}
                    onValueChange={(value) => setFormData({...formData, availability: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Verfügbar">Verfügbar</SelectItem>
                      <SelectItem value="Teilweise verfügbar">Teilweise verfügbar</SelectItem>
                      <SelectItem value="Nicht verfügbar">Nicht verfügbar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unbesetzt">unbesetzt</SelectItem>
                      <SelectItem value="angefragt">angefragt</SelectItem>
                      <SelectItem value="noch unschlüssig">noch unschlüssig</SelectItem>
                      <SelectItem value="mündlich zugesagt">mündlich zugesagt</SelectItem>
                      <SelectItem value="schriftlich bestätigt">schriftlich bestätigt</SelectItem>
                      <SelectItem value="ausgeschieden">ausgeschieden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Abbrechen
                </Button>
                <Button type="submit">
                  {editingExpert ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-6 w-3/4 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : experts.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Noch keine Experten erfasst</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ersten Experten hinzufügen
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experts.map((expert) => (
            <Card key={expert.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedExperts.includes(expert.id)}
                      onCheckedChange={() => handleSelectExpert(expert.id)}
                    />
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={expert.profile_picture_url} alt={`${expert.first_name} ${expert.last_name}`} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-100 to-blue-100 text-purple-700 font-semibold">
                        {getInitials(expert.first_name, expert.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {expert.first_name} {expert.last_name}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {expert.role_hsxb}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {expert.email && (
                      <Button variant="ghost" size="icon" onClick={() => openEmailDialog(expert)}>
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(expert)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(expert)} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {expert.specialization && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Spezialisierung</p>
                    <p className="text-sm text-slate-700">{expert.specialization}</p>
                  </div>
                )}

                {expert.experience && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Erfahrung</p>
                    <p className="text-sm text-slate-700 line-clamp-3">{expert.experience}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {expert.email && (
                    <a href={`mailto:${expert.email}`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      E-Mail
                    </a>
                  )}
                  {expert.phone && (
                    <a href={`tel:${expert.phone}`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Anrufen
                    </a>
                  )}
                  {expert.linkedin_url && (
                    <a href={expert.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Linkedin className="w-3 h-3" />
                      LinkedIn
                    </a>
                  )}
                </div>

                <div className="pt-2 flex gap-2 flex-wrap">
                  <Badge className={getAvailabilityColor(expert.availability)}>
                    {expert.availability}
                  </Badge>
                  <Badge className={getStatusColor(expert.status)}>
                    {expert.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 w-12">
                  <Checkbox 
                    checked={selectedExperts.length === experts.length && experts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden md:table-cell">Rolle</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Spezialisierung</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden xl:table-cell">Verfügbarkeit</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden xl:table-cell">Kontakt</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {experts.map((expert) => (
                <tr key={expert.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox 
                      checked={selectedExperts.includes(expert.id)}
                      onCheckedChange={() => handleSelectExpert(expert.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={expert.profile_picture_url} alt={`${expert.first_name} ${expert.last_name}`} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-100 to-blue-100 text-purple-700 font-semibold text-sm">
                          {getInitials(expert.first_name, expert.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {expert.first_name} {expert.last_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {expert.role_hsxb}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                    {expert.specialization || '-'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge className={getStatusColor(expert.status)}>
                      {expert.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <Badge className={getAvailabilityColor(expert.availability)}>
                      {expert.availability}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm hidden xl:table-cell">
                    <div className="flex gap-2">
                      {expert.email && (
                        <a href={`mailto:${expert.email}`} className="text-blue-600 hover:text-blue-700">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {expert.phone && (
                        <a href={`tel:${expert.phone}`} className="text-blue-600 hover:text-blue-700">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {expert.linkedin_url && (
                        <a href={expert.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {expert.email && (
                        <Button variant="ghost" size="icon" onClick={() => openEmailDialog(expert)}>
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expert)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(expert)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Experten löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie {expertToDelete?.first_name} {expertToDelete?.last_name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>E-Mail senden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Empfänger</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyEmailAddresses}
                  className="gap-2"
                >
                  <Copy className="w-3 h-3" />
                  Adressen kopieren
                </Button>
              </div>
              <div className="p-3 bg-slate-50 rounded-md max-h-32 overflow-y-auto">
                {experts
                  .filter(e => selectedExperts.includes(e.id))
                  .map(e => (
                    <div key={e.id} className="text-sm">
                      {e.first_name} {e.last_name} {e.email && `(${e.email})`}
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Betreff *</Label>
              <Input
                value={emailData.subject}
                onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                placeholder="E-Mail Betreff"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Nachricht *</Label>
              <Textarea
                value={emailData.body}
                onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                placeholder="Ihre Nachricht..."
                className="min-h-48"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEmailDialogOpen(false)}
                disabled={sendingEmail}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={handleSendEmail}
                disabled={!emailData.subject || !emailData.body || sendingEmail}
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    E-Mail senden
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}