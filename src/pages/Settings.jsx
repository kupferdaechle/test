
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Save, Sparkles, Loader2, CheckCircle, Globe, Building2, User, Trash2, Plus, Zap, Workflow, TrendingUp, Search, ExternalLink, Link as LinkIcon, AlertCircle, Brain, LayoutDashboard, List, GripVertical, Edit, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LANGUAGES = ["Deutsch", "English", "Español", "Français", "Italiano"];

const INDUSTRIES = [
  "Fertigung",
  "Handel",
  "Dienstleistung",
  "IT",
  "Gesundheitswesen",
  "Finanzen",
  "Bildung",
  "Logistik",
  "Bau",
  "Andere"
];

const ICON_OPTIONS = [
  { value: "Zap", label: "Zap (⚡)" },
  { value: "Sparkles", label: "Sparkles (✨)" },
  { value: "Workflow", label: "Workflow (🔄)" },
  { value: "TrendingUp", label: "TrendingUp (📈)" },
  { value: "Search", label: "Search (🔍)" },
  { value: "Globe", label: "Globe (🌐)" },
  { value: "ExternalLink", label: "ExternalLink (🔗)" },
  { value: "Link", label: "Link (🔗)" },
  { value: "User", label: "User (👤)" },
  { value: "Building2", label: "Building (🏢)" },
  { value: "Settings", label: "Settings (⚙️)" },
  { value: "Save", label: "Save (💾)" },
  { value: "CheckCircle", label: "CheckCircle (✅)" },
  { value: "Loader2", label: "Loader (⏳)" },
  { value: "Trash2", label: "Trash (🗑️)" },
  { value: "Plus", label: "Plus (➕)" },
  { value: "Brain", label: "Brain (🧠)" },
  { value: "LayoutDashboard", label: "Dashboard (📊)" },
];

const getIconComponent = (iconName) => {
  switch (iconName) {
    case "Zap": return Zap;
    case "Sparkles": return Sparkles;
    case "Workflow": return Workflow;
    case "TrendingUp": return TrendingUp;
    case "Search": return Search;
    case "Globe": return Globe;
    case "ExternalLink": return ExternalLink;
    case "Link": return LinkIcon;
    case "User": return User;
    case "Building2": return Building2;
    case "Settings": return SettingsIcon;
    case "Save": return Save;
    case "CheckCircle": return CheckCircle;
    case "Loader2": return Loader2;
    case "Trash2": return Trash2;
    case "Plus": return Plus;
    case "Brain": return Brain;
    case "LayoutDashboard": return LayoutDashboard;
    case "Edit": return Edit;
    case "X": return X; // Added X icon
    default: return ExternalLink;
  }
};

export default function Settings() {
  const queryClient = useQueryClient();
  const [fetchingData, setFetchingData] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  const [customIndustryText, setCustomIndustryText] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    company_name: "",
    licensee: "",
    company_url: "",
    street: "",
    postal_code: "",
    city: "",
    country: "",
    industry: "Andere",
    language: "Deutsch",
    user_name: "",
    user_email: "",
    external_tools: [
      { title: "InCoreOn", url: "https://incoreon.ai/", icon: "Zap" },
      { title: "Gemini", url: "https://gemini.google.com/", icon: "Sparkles" },
      { title: "Camunda", url: "https://camunda.com/", icon: "Workflow" },
      { title: "Base44", url: "https://base44.com/", icon: "TrendingUp" },
      { title: "Suchen", url: "https://www.google.com/", icon: "Search" }
    ]
  });
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("bg-blue-100 text-blue-700 border-blue-200");
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingStatusData, setEditingStatusData] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: processStatuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ['processStatuses'],
    queryFn: async () => {
      const statuses = await base44.entities.ProcessStatus.list('sort_order');
      
      if (statuses.length === 0) {
        const defaultStatuses = [
          { status_name: "Entwurf", status_color: "bg-slate-100 text-slate-700 border-slate-200", sort_order: 1, is_active: true },
          { status_name: "In Analyse", status_color: "bg-blue-100 text-blue-700 border-blue-200", sort_order: 2, is_active: true },
          { status_name: "Genehmigt", status_color: "bg-green-100 text-green-700 border-green-200", sort_order: 3, is_active: true },
          { status_name: "In Umsetzung", status_color: "bg-orange-100 text-orange-700 border-orange-200", sort_order: 4, is_active: true },
          { status_name: "Abgeschlossen", status_color: "bg-emerald-100 text-emerald-700 border-emerald-200", sort_order: 5, is_active: true },
        ];
        
        for (const status of defaultStatuses) {
          await base44.entities.ProcessStatus.create(status);
        }
        
        return await base44.entities.ProcessStatus.list('sort_order');
      }
      
      return statuses;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Settings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Settings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  });

  const createStatusMutation = useMutation({
    mutationFn: (data) => base44.entities.ProcessStatus.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processStatuses'] });
      setNewStatusName("");
      setNewStatusColor("bg-blue-100 text-blue-700 border-blue-200");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProcessStatus.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processStatuses'] });
      setEditingStatusId(null);
      setEditingStatusData(null);
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: (id) => base44.entities.ProcessStatus.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processStatuses'] });
    },
  });

  useEffect(() => {
    if (settings && settings.length > 0) {
      const settingsData = settings[0];
      const loadedIndustry = settingsData.industry || "";
      const isStandardIndustry = INDUSTRIES.includes(loadedIndustry);
      
      setFormData({
        company_name: settingsData.company_name || "",
        licensee: settingsData.licensee || "",
        company_url: settingsData.company_url || "",
        street: settingsData.street || "",
        postal_code: settingsData.postal_code || "",
        city: settingsData.city || "",
        country: settingsData.country || "",
        industry: isStandardIndustry ? loadedIndustry : "Andere",
        language: settingsData.language || "Deutsch",
        user_name: settingsData.user_name || "",
        user_email: settingsData.user_email || "",
        external_tools: settingsData.external_tools || [
          { title: "InCoreOn", url: "https://incoreon.ai/", icon: "Zap" },
          { title: "Gemini", url: "https://gemini.google.com/", icon: "Sparkles" },
          { title: "Camunda", url: "https://camunda.com/", icon: "Workflow" },
          { title: "Base44", url: "https://base44.com/", icon: "TrendingUp" },
          { title: "Suchen", url: "https://www.google.com/", icon: "Search" }
        ]
      });
      
      if (!isStandardIndustry && loadedIndustry) {
        setShowCustomIndustry(true);
        setCustomIndustryText(loadedIndustry);
      } else {
        setShowCustomIndustry(false);
        setCustomIndustryText("");
      }
      setInitialLoadDone(true);
    } else if (currentUser) {
      setFormData(prev => ({
        ...prev,
        user_name: currentUser.full_name || "",
        user_email: currentUser.email || ""
      }));
      setInitialLoadDone(true);
    }
  }, [settings, currentUser]);

  useEffect(() => {
    if (!initialLoadDone || fetchingData || activeTab !== 'general') return;

    const timeoutId = setTimeout(() => {
      handleAutoSave();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [formData, customIndustryText, initialLoadDone, fetchingData, activeTab]);

  const handleAutoSave = async () => {
    if (saveStatus === 'saving' || fetchingData) return;

    setSaveStatus('saving');
    const dataToSave = { ...formData };
    if (formData.industry === "Andere" && customIndustryText) {
      dataToSave.industry = customIndustryText;
    }

    try {
      if (settings && settings.length > 0) {
        await updateMutation.mutateAsync({ id: settings[0].id, data: dataToSave });
      } else {
        await createMutation.mutateAsync(dataToSave);
      }
    } catch (error) {
      console.error('Auto-Save Fehler:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const fetchCompanyData = async () => {
    if (!formData.company_url || !formData.company_url.trim()) {
      alert('Bitte geben Sie zuerst eine Website-URL ein.');
      return;
    }

    setFetchingData(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysiere die folgende Firmen-Website und extrahiere relevante Unternehmensinformationen: ${formData.company_url}. Gib zurück: Firmenname, Straße/Hausnummer, PLZ, Stadt, Land, Branche.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            company_name: { type: ["string", "null"] },
            street: { type: ["string", "null"] },
            postal_code: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            country: { type: ["string", "null"] },
            industry: { type: ["string", "null"] }
          }
        }
      });

      const fetchedIndustry = result.industry;
      const isStandard = INDUSTRIES.includes(fetchedIndustry);

      setFormData(prev => ({
        ...prev,
        company_name: result.company_name || prev.company_name,
        street: result.street || prev.street,
        postal_code: result.postal_code || prev.postal_code,
        city: result.city || prev.city,
        country: result.country || prev.country,
        industry: isStandard ? fetchedIndustry : (fetchedIndustry ? "Andere" : prev.industry)
      }));

      if (fetchedIndustry && !isStandard) {
        setShowCustomIndustry(true);
        setCustomIndustryText(fetchedIndustry);
      } else {
        setShowCustomIndustry(false);
        setCustomIndustryText("");
      }

      alert('Unternehmensdaten erfolgreich abgerufen!');
    } catch (error) {
      console.error('Fehler beim Abrufen der Daten:', error);
      alert('Fehler beim Abrufen der Unternehmensdaten.');
    } finally {
      setFetchingData(false);
    }
  };

  const handleIndustryChange = (value) => {
    setFormData(prev => ({...prev, industry: value}));
    setShowCustomIndustry(value === "Andere");
    if (value !== "Andere") setCustomIndustryText("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleAutoSave();
  };

  const updateExternalTool = (index, field, value) => {
    const newTools = [...formData.external_tools];
    newTools[index] = { ...newTools[index], [field]: value };
    setFormData({ ...formData, external_tools: newTools });
  };

  const addExternalTool = () => {
    setFormData({
      ...formData,
      external_tools: [...formData.external_tools, { title: "", url: "", icon: "ExternalLink" }]
    });
  };

  const removeExternalTool = (index) => {
    setFormData({ ...formData, external_tools: formData.external_tools.filter((_, i) => i !== index) });
  };

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) {
      alert('Bitte geben Sie einen Status-Namen ein.');
      return;
    }

    const maxOrder = processStatuses.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
    await createStatusMutation.mutateAsync({
      status_name: newStatusName.trim(),
      status_color: newStatusColor,
      sort_order: maxOrder + 1,
      is_active: true
    });
  };

  const handleEditStatus = (status) => {
    setEditingStatusId(status.id);
    setEditingStatusData({ ...status });
  };

  const handleSaveStatus = async () => {
    if (!editingStatusData) return;
    
    // Optional: Add validation for editingStatusData fields if necessary
    if (!editingStatusData.status_name.trim()) {
      alert('Der Status-Name darf nicht leer sein.');
      return;
    }

    await updateStatusMutation.mutateAsync({
      id: editingStatusData.id,
      data: editingStatusData
    });
  };

  const handleCancelEditStatus = () => {
    setEditingStatusId(null);
    setEditingStatusData(null);
  };

  const handleDeleteStatus = async (id) => {
    if (processStatuses.length <= 1) {
      alert('Sie müssen mindestens einen Status behalten.');
      return;
    }
    
    if (confirm('Möchten Sie diesen Status wirklich löschen?')) {
      await deleteStatusMutation.mutateAsync(id);
    }
  };

  if (statusesLoading) {
    return (
      <div className="p-6 md:p-8 pt-8 md:pt-10">
        <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <SettingsIcon className="w-8 h-8" />
              Einstellungen
            </h1>
            <p className="text-slate-600 mt-1">Konfigurieren Sie Ihre KI-Workbench</p>
          </div>
          {activeTab === 'general' && (
            <div className="flex items-center gap-3">
              {saveStatus === 'saving' && (
                <Alert className="w-auto bg-blue-50 border-blue-200">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-800">Wird gespeichert...</AlertDescription>
                </Alert>
              )}
              {saveStatus === 'saved' && (
                <Alert className="w-auto bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">Gespeichert</AlertDescription>
                </Alert>
              )}
              {saveStatus === 'error' && (
                <Alert className="w-auto bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">Fehler beim Speichern</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Allgemein</TabsTrigger>
            <TabsTrigger value="status">Prozess-Status</TabsTrigger>
            <TabsTrigger value="tools">Externe Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Auto-Speicherung aktiviert:</strong> Alle Änderungen werden automatisch nach 1,5 Sekunden gespeichert.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Nutzerdaten
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_name">Name des Nutzers</Label>
                      <Input
                        id="user_name"
                        value={formData.user_name}
                        onChange={(e) => setFormData({...formData, user_name: e.target.value})}
                        placeholder="Ihr Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user_email">E-Mail des Nutzers</Label>
                      <Input
                        id="user_email"
                        type="email"
                        value={formData.user_email}
                        onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                        placeholder="ihre.email@example.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    Stammdaten des Lizenznehmers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_url">Firmen-Website URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="company_url"
                        value={formData.company_url}
                        onChange={(e) => setFormData({...formData, company_url: e.target.value})}
                        placeholder="https://example.com"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={fetchCompanyData}
                        disabled={fetchingData || !formData.company_url}
                        className="gap-2"
                      >
                        {fetchingData ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Lädt...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Daten abrufen
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Firmenname</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licensee">Lizenznehmer</Label>
                      <Input
                        id="licensee"
                        value={formData.licensee}
                        onChange={(e) => setFormData({...formData, licensee: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="street">Straße & Hausnummer</Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({...formData, street: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postleitzahl</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Stadt</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Land</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Branche</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={handleIndustryChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Branche wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(industry => (
                          <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showCustomIndustry && (
                      <Input
                        id="custom_industry"
                        placeholder="Bitte Branche eingeben"
                        value={customIndustryText}
                        onChange={(e) => setCustomIndustryText(e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-600" />
                    Sprache
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <Label htmlFor="language">Bevorzugte Sprache</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => setFormData({...formData, language: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button 
                  type="submit" 
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  disabled={saveStatus === 'saving' || fetchingData}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Speichere...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Jetzt speichern
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <Card>
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <List className="w-5 h-5 text-indigo-600" />
                  Prozess-Status verwalten
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Definieren Sie die Status-Optionen für Prozesse.
                </p>

                {processStatuses.map((status) => (
                  <Card key={status.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                      <div className="flex-1 grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Status-Name</Label>
                          {editingStatusId === status.id ? (
                            <Input 
                              value={editingStatusData?.status_name || ''} 
                              onChange={(e) => setEditingStatusData(prev => ({...prev, status_name: e.target.value}))} 
                            />
                          ) : (
                            <div className="font-medium">{status.status_name}</div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Farbe</Label>
                          {editingStatusId === status.id ? (
                            <Input 
                              value={editingStatusData?.status_color || ''} 
                              onChange={(e) => setEditingStatusData(prev => ({...prev, status_color: e.target.value}))} 
                            />
                          ) : (
                            <div className={`inline-block px-3 py-1 rounded text-xs border ${status.status_color}`}>Beispiel</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {editingStatusId === status.id ? (
                            <>
                              <Button 
                                size="sm" 
                                onClick={handleSaveStatus}
                                disabled={updateStatusMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Speichern
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleCancelEditStatus}
                              >
                                Abbrechen
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditStatus(status)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Bearbeiten
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDeleteStatus(status.id)} 
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Neuen Status hinzufügen</h4>
                  <div className="grid md:grid-cols-[2fr_3fr_auto] gap-4">
                    <Input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} placeholder="Status-Name" />
                    <Input value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} placeholder="CSS-Klassen" />
                    <Button onClick={handleAddStatus} disabled={!newStatusName.trim()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  Externe Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-600 mb-4">
                  Konfigurieren Sie die externen Tools, die in der Navigationsleiste angezeigt werden.
                </p>
                
                {formData.external_tools.map((tool, index) => {
                  const IconComponent = getIconComponent(tool.icon);
                  return (
                    <Card key={index} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="grid md:grid-cols-[1fr_2fr_1.5fr] gap-4 items-end">
                          <div className="space-y-2">
                            <Label>Anzeigename</Label>
                            <Input
                              value={tool.title}
                              onChange={(e) => updateExternalTool(index, 'title', e.target.value)}
                              placeholder="z.B. InCoreOn"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>URL</Label>
                            <Input
                              value={tool.url}
                              onChange={(e) => updateExternalTool(index, 'url', e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Icon</Label>
                            <div className="flex gap-2">
                              <Select
                                value={tool.icon}
                                onValueChange={(value) => updateExternalTool(index, 'icon', value)}
                              >
                                <SelectTrigger className="flex-grow">
                                  <SelectValue>
                                    <span className="flex items-center">
                                      <IconComponent className="mr-2 h-4 w-4" />
                                      {ICON_OPTIONS.find(opt => opt.value === tool.icon)?.label || tool.icon}
                                    </span>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {ICON_OPTIONS.map((iconOpt) => {
                                    const OptionIcon = getIconComponent(iconOpt.value);
                                    return (
                                      <SelectItem key={iconOpt.value} value={iconOpt.value}>
                                        <span className="flex items-center">
                                          <OptionIcon className="mr-2 h-4 w-4" />
                                          {iconOpt.label}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExternalTool(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addExternalTool}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Externes Tool hinzufügen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
