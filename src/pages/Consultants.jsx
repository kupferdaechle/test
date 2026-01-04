
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, User, Mail, Phone, TrendingUp, Calendar, DollarSign, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createPageUrl, formatCurrency } from "@/components/utils";

export default function ConsultantsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    specialization: "",
    hourly_rate: "",
    daily_rate: "",
    currency: "EUR",
    skills: "",
    experience_years: "",
    availability: "Verfügbar",
    bio: "",
    profile_picture_url: ""
  });

  const { data: consultants = [], isLoading, error } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Consultant.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Consultant.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      setIsDialogOpen(false);
      setEditingConsultant(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Consultant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      specialization: "",
      hourly_rate: "",
      daily_rate: "",
      currency: "EUR",
      skills: "",
      experience_years: "",
      availability: "Verfügbar",
      bio: "",
      profile_picture_url: ""
    });
  };

  const handleOpenDialog = (consultant = null) => {
    if (consultant) {
      setEditingConsultant(consultant);
      setFormData({
        first_name: consultant.first_name || "",
        last_name: consultant.last_name || "",
        email: consultant.email || "",
        phone: consultant.phone || "",
        specialization: consultant.specialization || "",
        // Ensure rates are displayed as numbers for editing, but convert back to string for input value
        hourly_rate: String(consultant.hourly_rate) || "",
        daily_rate: String(consultant.daily_rate) || "",
        currency: consultant.currency || "EUR",
        skills: consultant.skills || "",
        experience_years: String(consultant.experience_years) || "",
        availability: consultant.availability || "Verfügbar",
        bio: consultant.bio || "",
        profile_picture_url: consultant.profile_picture_url || ""
      });
    } else {
      setEditingConsultant(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSubmit = {
      ...formData,
      hourly_rate: parseFloat(formData.hourly_rate) || 0,
      daily_rate: parseFloat(formData.daily_rate) || 0,
      experience_years: parseInt(formData.experience_years) || 0
    };

    if (editingConsultant) {
      updateMutation.mutate({ id: editingConsultant.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const getAvailabilityColor = (availability) => {
    const colors = {
      'Verfügbar': 'bg-green-100 text-green-700',
      'Teilweise verfügbar': 'bg-yellow-100 text-yellow-700',
      'Nicht verfügbar': 'bg-red-100 text-red-700',
    };
    return colors[availability] || 'bg-gray-100 text-gray-700';
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 pt-8 md:pt-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Fehler beim Laden der Berater. Bitte versuchen Sie es erneut.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Berater</h1>
          <p className="text-slate-600 mt-1">
            Verwalten Sie Ihr Berater-Team und deren Sätze
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              Neuer Berater
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConsultant ? 'Berater bearbeiten' : 'Neuen Berater anlegen'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Fachgebiet/Spezialisierung</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="z.B. Prozessoptimierung, Digitalisierung"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Stundensatz (€) *</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily_rate">Tagessatz (€) *</Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    step="0.01"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Währung</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Jahre Erfahrung</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Verfügbarkeit</Label>
                  <Select
                    value={formData.availability}
                    onValueChange={(value) => setFormData({ ...formData, availability: value })}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Kompetenzen & Qualifikationen</Label>
                <Textarea
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="z.B. Projektmanagement, Agile Methoden, Python, SQL..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografie/Beschreibung</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile_picture_url">Profilbild URL</Label>
                <Input
                  id="profile_picture_url"
                  value={formData.profile_picture_url}
                  onChange={(e) => setFormData({ ...formData, profile_picture_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingConsultant ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {consultants.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Noch keine Berater angelegt
            </h3>
            <p className="text-slate-600 mb-6">
              Legen Sie Ihren ersten Berater an, um loszulegen.
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-5 h-5" />
              Ersten Berater anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {consultants.map((consultant) => (
            <Card key={consultant.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={consultant.profile_picture_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(consultant.first_name, consultant.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {consultant.first_name} {consultant.last_name}
                      </CardTitle>
                      {consultant.specialization && (
                        <p className="text-sm text-slate-600">{consultant.specialization}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={getAvailabilityColor(consultant.availability)}>
                    {consultant.availability}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {consultant.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{consultant.email}</span>
                  </div>
                )}
                {consultant.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{consultant.phone}</span>
                  </div>
                )}
                {consultant.experience_years > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>{consultant.experience_years} Jahre Erfahrung</span>
                  </div>
                )}

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatCurrency(consultant.hourly_rate, consultant.currency)}/Std.</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{formatCurrency(consultant.daily_rate, consultant.currency)}/Tag</span>
                    </div>
                  </div>

                {consultant.bio && (
                  <p className="text-sm text-slate-600 line-clamp-3 pt-2">
                    {consultant.bio}
                  </p>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(consultant)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Bearbeiten
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Berater wirklich löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchten Sie {consultant.first_name} {consultant.last_name} wirklich löschen? 
                          Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(consultant.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
