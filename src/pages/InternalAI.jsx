import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Search, Loader2, Sparkles, TrendingUp, FileText, AlertCircle, Plus, Trash2, MessageSquare, GripVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from 'react-markdown';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function InternalAI() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('internalAI_sidebar_width');
    return saved ? parseInt(saved) : 256;
  });
  const [isResizing, setIsResizing] = useState(false);

  const { data: conversations = [] } = useQuery({
    queryKey: ['internalAIConversations'],
    queryFn: () => base44.entities.InternalAIConversation.list('-updated_date'),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
        localStorage.setItem('internalAI_sidebar_width', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const createConversationMutation = useMutation({
    mutationFn: (data) => base44.entities.InternalAIConversation.create(data),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['internalAIConversations'] });
      setCurrentConversationId(newConversation.id);
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InternalAIConversation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalAIConversations'] });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id) => base44.entities.InternalAIConversation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalAIConversations'] });
      setCurrentConversationId(null);
    },
  });

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Bitte geben Sie eine Suchanfrage ein.');
      return;
    }

    setSearching(true);
    setError(null);

    const currentQuery = query;
    setQuery("");

    try {
      const processesData = processes.map(p => ({
        name: p.process_name,
        status: p.status,
        customer: customers.find(c => c.id === p.customer_id)?.company_name || 'Unbekannt',
        ist_beschreibung: p.ist_answers?.process_steps,
        soll_beschreibung: p.soll_description,
        roi: p.roi_data?.calculated_roi,
        aufwand: p.effort_category,
        kosten: p.ist_costs
      }));

      const customersData = customers.map(c => ({
        name: c.company_name,
        branche: c.industry,
        mitarbeiter: c.employee_count,
        umsatz: c.revenue,
        vision: c.vision
      }));

      const consultantsData = consultants.map(c => ({
        name: `${c.first_name} ${c.last_name}`,
        spezialisierung: c.specialization,
        stundensatz: c.hourly_rate,
        tagessatz: c.daily_rate,
        verfuegbarkeit: c.availability,
        erfahrung: c.experience_years
      }));

      const prompt = `Du bist ein KI-Assistent für die KI-Workbench Prozessoptimierungs-Anwendung.

BENUTZERANFRAGE: "${currentQuery}"

VERFÜGBARE DATEN:

PROZESSE (${processes.length} Einträge):
${JSON.stringify(processesData, null, 2)}

KUNDEN (${customers.length} Einträge):
${JSON.stringify(customersData, null, 2)}

BERATER (${consultants.length} Einträge):
${JSON.stringify(consultantsData, null, 2)}

AUFGABE:
Analysiere die Benutzeranfrage und durchsuche alle verfügbaren Daten. Gib eine hilfreiche, strukturierte Antwort, die:
1. Die Anfrage beantwortet
2. Relevante Daten zusammenfasst
3. Insights und Muster identifiziert
4. Empfehlungen gibt, wo sinnvoll
5. Konkrete Zahlen und Fakten nennt

Formatiere deine Antwort mit Markdown für bessere Lesbarkeit (Überschriften, Listen, Tabellen).

Wenn die Anfrage nicht beantwortet werden kann, erkläre warum und schlage alternative Fragen vor.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const newMessage = {
        question: currentQuery,
        answer: response,
        timestamp: new Date().toISOString()
      };

      if (currentConversationId) {
        const updatedMessages = [...(currentConversation.messages || []), newMessage];
        await updateConversationMutation.mutateAsync({
          id: currentConversationId,
          data: {
            ...currentConversation,
            messages: updatedMessages
          }
        });
      } else {
        const title = currentQuery.length > 50 ? currentQuery.substring(0, 50) + '...' : currentQuery;
        await createConversationMutation.mutateAsync({
          title: title,
          messages: [newMessage]
        });
      }
    } catch (err) {
      console.error('Fehler bei der KI-Suche:', err);
      setError('Fehler bei der Suche. Bitte versuchen Sie es erneut.');
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteConversation = async (id) => {
    await deleteConversationMutation.mutateAsync(id);
  };

  const exampleQueries = [
    "Welche Prozesse haben den höchsten ROI?",
    "Zeige mir alle Prozesse, die noch nicht abgeschlossen sind",
    "Welcher Berater hat den niedrigsten Stundensatz?",
    "Fasse alle Prozesse für [Kundenname] zusammen",
    "Welche Kunden haben die meisten Prozesse?",
    "Analysiere die durchschnittlichen Kosten aller Prozesse",
    "Welche Prozesse benötigen hohen Aufwand?",
    "Zeige Trends in der Prozessoptimierung"
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar mit Konversationen */}
      <div 
        className="border-r border-slate-200 bg-white flex flex-col"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-4 border-b border-slate-200">
          <Button 
            onClick={handleNewConversation} 
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Neue Konversation
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conversation.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-slate-50'
                }`}
                onClick={() => setCurrentConversationId(conversation.id)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-sm truncate">{conversation.title}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Konversation löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteConversation(conversation.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Resize Handle */}
      <div
        className="w-1 bg-slate-200 hover:bg-blue-500 cursor-col-resize transition-colors relative group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
          <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Hauptbereich */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 md:p-8 pt-8 md:pt-10 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Interne KI-Suche</h1>
                <p className="text-slate-600 mt-1">
                  Durchsuchen und analysieren Sie Ihre gesamte KI-Workbench mit KI-Unterstützung
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!currentConversation && conversations.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Beispielanfragen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {exampleQueries.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start text-left h-auto py-3 px-4"
                        onClick={() => setQuery(example)}
                      >
                        <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{example}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentConversation && currentConversation.messages && currentConversation.messages.length > 0 && (
              <div className="space-y-4">
                {currentConversation.messages.map((entry, index) => (
                  <div key={index} className="space-y-3">
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm">Sie</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-900 font-medium">{entry.question}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(entry.timestamp).toLocaleString('de-DE')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Sparkles className="w-5 h-5 text-green-600" />
                          KI-Analyseergebnis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="prose prose-slate max-w-none">
                          <ReactMarkdown>{entry.answer}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Eingabebereich am unteren Rand */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="max-w-5xl mx-auto">
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-4 space-y-3">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Stellen Sie eine Frage zu Ihren Prozessen, Kunden oder Beratern..."
                  className="min-h-20 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSearch();
                    }
                  }}
                />

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <TrendingUp className="w-4 h-4" />
                    {processes.length} Prozesse • {customers.length} Kunden • {consultants.length} Berater
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={searching || !query.trim()}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Suche läuft...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        KI-Suche starten
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}