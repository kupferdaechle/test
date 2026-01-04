import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderKanban, Plus, Calendar, Building2, ChevronRight, FileText, Loader2, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    project_name: "",
    customer_id: "",
    consultant_id: "",
    description: "",
    status: "Entwurf",
    start_date: "",
    end_date: "",
    process_ids: [],
    project_documents: []
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['kundenstamm'],
    queryFn: () => base44.entities.Kundenstamm.list('firma'),
  });

  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const createProjectMutation = useMutation({
    mutationFn: (projectData) => base44.entities.Project.create(projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      project_name: "",
      customer_id: "",
      consultant_id: "",
      description: "",
      status: "Entwurf",
      start_date: "",
      end_date: "",
      process_ids: [],
      project_documents: []
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createProjectMutation.mutate(formData);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Aktiv': return 'bg-green-100 text-green-700 border-green-200';
      case 'Abgeschlossen': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Pausiert': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.firma || 'Unbekannt';
  };

  const getConsultantName = (consultantId) => {
    const consultant = consultants.find(c => c.id === consultantId);
    return consultant ? `${consultant.first_name} ${consultant.last_name}` : '';
  };

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projekte</h1>
          <p className="text-slate-600 mt-1">Verwalten Sie Ihre Kundenprojekte</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Neues Projekt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neues Projekt erstellen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Projektname *</Label>
                <Input
                  value={formData.project_name}
                  onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                  placeholder="z.B. Digitalisierung Auftragsabwicklung"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Kunde *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({...formData, customer_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.firma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Berater</Label>
                <Select
                  value={formData.consultant_id}
                  onValueChange={(value) => setFormData({...formData, consultant_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Berater auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.map((consultant) => (
                      <SelectItem key={consultant.id} value={consultant.id}>
                        {consultant.first_name} {consultant.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Beschreiben Sie das Projekt..."
                  className="min-h-24"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                      <SelectItem value="Entwurf">Entwurf</SelectItem>
                      <SelectItem value="Aktiv">Aktiv</SelectItem>
                      <SelectItem value="Pausiert">Pausiert</SelectItem>
                      <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Startdatum</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    'Projekt erstellen'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projectsLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <FolderKanban className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Noch keine Projekte angelegt</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Erstes Projekt erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Projektname</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden md:table-cell">Kunde</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Berater</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden xl:table-cell">Prozesse</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden xl:table-cell">Startdatum</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                        <FolderKanban className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="font-semibold text-slate-900">{project.project_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {getCustomerName(project.customer_id)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                    {project.consultant_id ? (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {getConsultantName(project.consultant_id)}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {project.process_ids && project.process_ids.length > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        {project.process_ids.length}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden xl:table-cell">
                    {project.start_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(project.start_date).toLocaleDateString('de-DE')}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
                      <Button variant="ghost" size="sm" className="gap-2">
                        Öffnen
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}