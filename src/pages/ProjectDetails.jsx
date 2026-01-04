import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl, formatCurrency } from "@/components/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Trash2, Plus, X, FileText, CheckCircle, Calendar, Building2, Edit, User, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ProjectDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [expandedProcesses, setExpandedProcesses] = useState({});

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const projects = await base44.entities.Project.list();
      return projects.find(p => p.id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['kundenstamm'],
    queryFn: () => base44.entities.Kundenstamm.list('firma'),
  });

  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditing(false);
      setEditedData(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(createPageUrl("Projects"));
    },
  });

  React.useEffect(() => {
    if (project) {
      setEditedData(project);
    }
  }, [project]);

  const handleEdit = () => {
    setEditedData(project);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editedData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData(project);
  };

  const handleDelete = () => {
    deleteMutation.mutate(projectId);
  };

  const updateField = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addProcessToProject = (processId) => {
    const process = processes.find(p => p.id === processId);
    if (!process) return;

    const newProcessIds = [...(editedData.process_ids || []), processId];
    const newDocuments = collectDocumentsFromProcess(process);

    setEditedData(prev => ({
      ...prev,
      process_ids: newProcessIds,
      project_documents: [...(prev.project_documents || []), ...newDocuments]
    }));
    setProcessDialogOpen(false);
  };

  const removeProcessFromProject = (processId) => {
    const newProcessIds = editedData.process_ids.filter(id => id !== processId);
    const newDocuments = editedData.project_documents.filter(doc => doc.process_id !== processId);

    setEditedData(prev => ({
      ...prev,
      process_ids: newProcessIds,
      project_documents: newDocuments
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(editedData.process_ids);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setEditedData(prev => ({
      ...prev,
      process_ids: items
    }));
  };

  const toggleProcessExpanded = (processId) => {
    setExpandedProcesses(prev => ({
      ...prev,
      [processId]: !prev[processId]
    }));
  };

  const toggleProcessDocument = (processId, docIndex) => {
    const newDocuments = [...editedData.project_documents];
    newDocuments[docIndex] = {
      ...newDocuments[docIndex],
      include_in_project_report: !newDocuments[docIndex].include_in_project_report
    };
    setEditedData(prev => ({
      ...prev,
      project_documents: newDocuments
    }));
  };

  const getProcessDocuments = (processId) => {
    return editedData.project_documents?.filter(doc => doc.process_id === processId) || [];
  };

  const collectDocumentsFromProcess = (process) => {
    const documents = [];

    // Ist-Analyse Dateien
    if (process.ist_answers?.ist_files && process.ist_answers.ist_files.length > 0) {
      process.ist_answers.ist_files.forEach(file => {
        documents.push({
          process_id: process.id,
          process_name: process.process_name,
          document_url: file.url,
          document_name: file.name,
          document_type: file.type || 'ist_file',
          document_category: 'Ist-Analyse',
          include_in_project_report: false
        });
      });
    }

    // Soll-Zustand Dateien
    if (process.soll_answers?.soll_files && process.soll_answers.soll_files.length > 0) {
      process.soll_answers.soll_files.forEach(file => {
        documents.push({
          process_id: process.id,
          process_name: process.process_name,
          document_url: file.url,
          document_name: file.name,
          document_type: file.type || 'soll_file',
          document_category: 'Soll-Zustand',
          include_in_project_report: false
        });
      });
    }

    // Lastenheft hochgeladene Dateien
    if (process.lastenheft_uploaded_files && process.lastenheft_uploaded_files.length > 0) {
      process.lastenheft_uploaded_files.forEach(file => {
        documents.push({
          process_id: process.id,
          process_name: process.process_name,
          document_url: file.url,
          document_name: file.name,
          document_type: file.type || 'lastenheft',
          document_category: 'Lastenheft Upload',
          include_in_project_report: false
        });
      });
    }

    // Spezifikationen (Lastenheft, Prozessdokumentation)
    if (process.specification_files && process.specification_files.length > 0) {
      process.specification_files.forEach(spec => {
        if (spec.file_url) {
          documents.push({
            process_id: process.id,
            process_name: process.process_name,
            document_url: spec.file_url,
            document_name: spec.name,
            document_type: spec.type,
            document_category: 'Spezifikation',
            include_in_project_report: false
          });
        }
      });
    }

    // BPMN Dateien
    if (process.bpmn_files && process.bpmn_files.length > 0) {
      process.bpmn_files.forEach(bpmn => {
        documents.push({
          process_id: process.id,
          process_name: process.process_name,
          document_url: bpmn.url,
          document_name: bpmn.name,
          document_type: 'bpmn',
          document_category: 'BPMN',
          include_in_project_report: false
        });
      });
    }

    // Base44 Spezifikationen
    if (process.base44_specifications && process.base44_specifications.length > 0) {
      process.base44_specifications.forEach(spec => {
        if (spec.file_url) {
          documents.push({
            process_id: process.id,
            process_name: process.process_name,
            document_url: spec.file_url,
            document_name: spec.name,
            document_type: 'base44_spec',
            document_category: 'Base44 Spezifikation',
            include_in_project_report: false
          });
        }
      });
    }

    // Präsentationen
    ['presentation_videos', 'presentation_images', 'presentation_powerpoints'].forEach(key => {
      if (process[key] && process[key].length > 0) {
        process[key].forEach(file => {
          documents.push({
            process_id: process.id,
            process_name: process.process_name,
            document_url: file.url,
            document_name: file.name || file.title,
            document_type: key.replace('presentation_', ''),
            document_category: 'Präsentation',
            include_in_project_report: false
          });
        });
      }
    });

    return documents;
  };

  const toggleDocumentInReport = (docIndex) => {
    const newDocuments = [...editedData.project_documents];
    newDocuments[docIndex] = {
      ...newDocuments[docIndex],
      include_in_project_report: !newDocuments[docIndex].include_in_project_report
    };
    setEditedData(prev => ({
      ...prev,
      project_documents: newDocuments
    }));
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
    return consultant ? `${consultant.first_name} ${consultant.last_name}` : 'Nicht zugewiesen';
  };

  const availableProcesses = processes.filter(p => {
    return !editedData?.process_ids?.includes(p.id) && p.customer_id === editedData?.customer_id;
  });

  const projectProcesses = processes.filter(p => editedData?.process_ids?.includes(p.id));

  const groupedDocuments = editedData?.project_documents?.reduce((acc, doc) => {
    if (!acc[doc.process_name]) {
      acc[doc.process_name] = [];
    }
    acc[doc.process_name].push(doc);
    return acc;
  }, {}) || {};

  if (projectLoading || !editedData) {
    return (
      <div className="p-6 md:p-8 pt-8 md:pt-10">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="p-6 md:p-8 pt-8 md:pt-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Projekt konnte nicht gefunden werden.</AlertDescription>
        </Alert>
        <Button onClick={() => navigate(createPageUrl("Projects"))} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zu Projekten
        </Button>
      </div>
    );
  }

  const documentsInReport = editedData.project_documents?.filter(d => d.include_in_project_report).length || 0;
  const displayData = isEditing ? editedData : project;

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Projects"))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{displayData.project_name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(displayData.status)}>
                {displayData.status}
              </Badge>
              <span className="text-sm text-slate-600">{getCustomerName(displayData.customer_id)}</span>
              {displayData.consultant_id && (
                <>
                  <span className="text-slate-400">•</span>
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <User className="w-3 h-3" />
                    {getConsultantName(displayData.consultant_id)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleEdit} className="gap-2">
              <Edit className="w-4 h-4" />
              Bearbeiten
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleSave} 
                disabled={updateMutation.isPending} 
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Speichert...' : 'Speichern'}
              </Button>
              <Button onClick={handleCancel} variant="outline" className="gap-2">
                <X className="w-4 h-4" />
                Abbrechen
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Projekt wirklich löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Die zugehörigen Prozesse bleiben erhalten.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Wird gelöscht...' : 'Löschen'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="processes">
            Prozesse ({editedData.process_ids?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Dokumente ({documentsInReport}/{editedData.project_documents?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label>Projektname</Label>
                {isEditing ? (
                  <Input
                    value={editedData.project_name}
                    onChange={(e) => updateField('project_name', e.target.value)}
                  />
                ) : (
                  <div className="px-3 py-2 bg-slate-50 rounded-md">{displayData.project_name}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Kunde</Label>
                {isEditing ? (
                  <Select
                    value={editedData.customer_id}
                    onValueChange={(value) => updateField('customer_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-3 py-2 bg-slate-50 rounded-md">{getCustomerName(displayData.customer_id)}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Berater</Label>
                {isEditing ? (
                  <Select
                    value={editedData.consultant_id || ""}
                    onValueChange={(value) => updateField('consultant_id', value)}
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
                ) : (
                  <div className="px-3 py-2 bg-slate-50 rounded-md">{getConsultantName(displayData.consultant_id)}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Beschreibung</Label>
                {isEditing ? (
                  <Textarea
                    value={editedData.description || ""}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="min-h-32"
                  />
                ) : (
                  <div className="px-3 py-2 bg-slate-50 rounded-md min-h-32 whitespace-pre-wrap">
                    {displayData.description || "Keine Beschreibung"}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  {isEditing ? (
                    <Select
                      value={editedData.status}
                      onValueChange={(value) => updateField('status', value)}
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
                  ) : (
                    <div className="px-3 py-2 bg-slate-50 rounded-md">{displayData.status}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Startdatum</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedData.start_date || ""}
                      onChange={(e) => updateField('start_date', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-slate-50 rounded-md">
                      {displayData.start_date ? new Date(displayData.start_date).toLocaleDateString('de-DE') : 'Nicht festgelegt'}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Zugeordnete Prozesse</CardTitle>
                <AlertDialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Prozess hinzufügen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Prozess zum Projekt hinzufügen</AlertDialogTitle>
                      <AlertDialogDescription>
                        Wählen Sie einen Prozess des Kunden "{getCustomerName(editedData.customer_id)}" aus.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableProcesses.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">
                          Keine verfügbaren Prozesse für diesen Kunden
                        </p>
                      ) : (
                        availableProcesses.map(process => (
                          <Button
                            key={process.id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => addProcessToProject(process.id)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            {process.process_name}
                          </Button>
                        ))
                      )}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              {projectProcesses.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">Noch keine Prozesse zugeordnet</p>
                  <Button variant="outline" onClick={() => setProcessDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ersten Prozess hinzufügen
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="processes">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {projectProcesses.map((process, index) => {
                          const processDocuments = getProcessDocuments(process.id);
                          const isExpanded = expandedProcesses[process.id];
                          
                          return (
                            <Draggable key={process.id} draggableId={process.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border-2 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                >
                                  <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-3 flex-1">
                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                          <GripVertical className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="font-medium">{process.process_name}</p>
                                          <p className="text-sm text-slate-500">
                                            Status: {process.status} • {processDocuments.length} Dokumente
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleProcessExpanded(process.id)}
                                          className="gap-2"
                                        >
                                          {isExpanded ? (
                                            <>
                                              <ChevronUp className="w-4 h-4" />
                                              Einklappen
                                            </>
                                          ) : (
                                            <>
                                              <ChevronDown className="w-4 h-4" />
                                              Dokumente anzeigen
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeProcessFromProject(process.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    {isExpanded && processDocuments.length > 0 && (
                                      <div className="mt-4 pt-4 border-t space-y-2">
                                        <p className="text-sm font-semibold text-slate-700 mb-3">
                                          Dokumentenauswahl für Projektbericht:
                                        </p>
                                        {processDocuments.map((doc, idx) => {
                                          const globalIndex = editedData.project_documents.indexOf(doc);
                                          return (
                                            <div
                                              key={idx}
                                              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                              <Checkbox
                                                checked={doc.include_in_project_report}
                                                onCheckedChange={() => toggleProcessDocument(process.id, globalIndex)}
                                              />
                                              <div className="flex-1">
                                                <p className="font-medium text-sm">{doc.document_name}</p>
                                                <Badge variant="outline" className="text-xs mt-1">
                                                  {doc.document_category}
                                                </Badge>
                                              </div>
                                              {doc.include_in_project_report && (
                                                <Badge className="text-xs bg-green-100 text-green-700">
                                                  <CheckCircle className="w-3 h-3 mr-1" />
                                                  Im Bericht
                                                </Badge>
                                              )}
                                              <a
                                                href={doc.document_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700"
                                              >
                                                <FileText className="w-5 h-5" />
                                              </a>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Projektdokumente</CardTitle>
              <p className="text-sm text-slate-600">
                Wählen Sie, welche Dokumente im Projektbericht enthalten sein sollen
              </p>
            </CardHeader>
            <CardContent>
              {editedData.project_documents?.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Keine Dokumente verfügbar</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Fügen Sie Prozesse hinzu, um deren Dokumente zu sehen
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedDocuments).map(([processName, docs]) => (
                    <div key={processName}>
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {processName}
                      </h3>
                      <div className="space-y-2">
                        {docs.map((doc, idx) => {
                          const globalIndex = editedData.project_documents.indexOf(doc);
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <Checkbox
                                checked={doc.include_in_project_report}
                                onCheckedChange={() => toggleDocumentInReport(globalIndex)}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{doc.document_name}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {doc.document_category}
                                  </Badge>
                                  {doc.include_in_project_report && (
                                    <Badge className="text-xs bg-green-100 text-green-700">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Im Bericht
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <FileText className="w-5 h-5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}