import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle, CheckCircle, FileText, Download, Loader2, GitBranch } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from 'react-markdown';
import { formatCurrency } from "@/components/utils";

export default function ProcessVisualization({ process }) {
  const [generatingFlowDiagram, setGeneratingFlowDiagram] = useState(false);
  const [flowDiagramData, setFlowDiagramData] = useState(null);
  const [flowError, setFlowError] = useState(null);

  const istSteps = process.ist_answers?.process_steps?.split('\n').filter(s => s.trim()) || [];
  const bottlenecks = process.ist_answers?.bottlenecks?.split('\n').filter(s => s.trim()) || [];
  const sollGoals = process.soll_answers?.goals?.split('\n').filter(s => s.trim()) || [];

  const generateFlowDiagram = async () => {
    setGeneratingFlowDiagram(true);
    setFlowError(null);

    try {
      const prompt = `
Du bist ein Experte für Prozessanalyse und Visualisierung.

Analysiere folgende Prozessdaten und erstelle eine strukturierte, visuell ansprechende Textdarstellung des Prozessablaufs als Flussdiagramm:

**PROZESSNAME:** ${process.process_name}

**IST-ZUSTAND:**
- Prozessschritte: ${process.ist_answers?.process_steps || 'Nicht angegeben'}
- Verantwortliche: ${process.ist_answers?.responsible_person || 'Nicht angegeben'}
- Beteiligte Abteilungen: ${process.ist_answers?.involved_departments || 'Nicht angegeben'}
- Aktuelle Systeme: ${process.ist_answers?.current_systems || 'Nicht angegeben'}
- Engpässe: ${process.ist_answers?.bottlenecks || 'Nicht angegeben'}
- Manuelle Tätigkeiten: ${process.ist_answers?.manual_tasks || 'Nicht angegeben'}

**SOLL-ZUSTAND:**
${process.soll_description || 'Nicht angegeben'}
- Ziele: ${process.soll_answers?.goals || 'Nicht angegeben'}
- Neue Technologien: ${process.soll_answers?.new_technologies || 'Nicht angegeben'}

Erstelle ein strukturiertes Markdown-Dokument mit zwei Hauptabschnitten:

1. **IST-PROZESS (Aktueller Ablauf)**
2. **SOLL-PROZESS (Optimierter Ablauf)**

Für jeden Prozess:
- Nummeriere die Schritte klar (z.B. **Schritt 1**, **Schritt 2**, etc.)
- Verwende visuelle Elemente in Markdown:
  - ➡️ für Prozessfluss
  - ⚠️ für Engpässe oder Probleme
  - ⏱️ für zeitintensive Schritte
  - 👤 für manuelle Tätigkeiten
  - 🔄 für Wiederholungen/Schleifen
  - ✅ für Entscheidungspunkte
  - 🚀 für Automatisierungen im Soll-Prozess
  - 💡 für Verbesserungen

- Hebe kritische Stellen hervor (z.B. **ENGPASS**, **MANUELL**)
- Zeige zwischen den Schritten mit ➡️ oder anderen Pfeilen den Fluss
- Am Ende jedes Prozesses fasse die Gesamtdauer, Beteiligte und wichtigsten Merkmale zusammen

Erstelle ein professionelles, gut lesbares Dokument, das die Unterschiede zwischen Ist und Soll deutlich macht.
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setFlowDiagramData(result);
    } catch (err) {
      setFlowError('Fehler beim Generieren des Prozessablaufs. Bitte versuchen Sie es erneut.');
      console.error('Error generating flow diagram:', err);
    } finally {
      setGeneratingFlowDiagram(false);
    }
  };

  const renderFiles = (files, title) => {
    if (!files || files.length === 0) return null;

    const images = files.filter(f => f.type === 'image');
    const documents = files.filter(f => f.type !== 'image');

    return (
      <Card className="mt-6 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {images.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Bilder:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((file, index) => (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-40 object-cover rounded-lg border border-slate-200 group-hover:shadow-lg transition-shadow"
                    />
                    <p className="text-xs text-slate-600 mt-1 truncate">{file.name}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Dokumente:</p>
              <div className="space-y-2">
                {documents.map((file, index) => (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500 uppercase">{file.type}</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Prozess-Visualisierung</h3>
            <p className="text-sm text-slate-600">Ist-Zustand vs. Soll-Zustand</p>
          </div>
        </div>
        <Button
          onClick={generateFlowDiagram}
          disabled={generatingFlowDiagram}
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {generatingFlowDiagram ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generiere...
            </>
          ) : (
            <>
              <GitBranch className="w-4 h-4" />
              Prozessablauf generieren
            </>
          )}
        </Button>
      </div>

      {flowError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{flowError}</AlertDescription>
        </Alert>
      )}

      {flowDiagramData && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardHeader className="border-b border-indigo-100">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-600" />
                Prozessablauf: Ist vs. Soll
              </CardTitle>
              <Badge className="bg-indigo-600 text-white">
                KI-generiert
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-slate max-w-none 
              prose-headings:text-slate-900 
              prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-200 prose-h1:pb-2
              prose-h2:text-xl prose-h2:text-blue-700 prose-h2:mt-6
              prose-h3:text-lg prose-h3:text-indigo-600
              prose-p:text-slate-700 
              prose-strong:text-slate-900 prose-strong:font-bold
              prose-ul:my-2 prose-li:my-1
              prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
              <ReactMarkdown>{flowDiagramData}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-orange-600" />
          Ist-Zustand
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-base">Aktuelle Prozessschritte</CardTitle>
            </CardHeader>
            <CardContent>
              {istSteps.length > 0 ? (
                <ol className="list-decimal list-inside space-y-2">
                  {istSteps.map((step, i) => (
                    <li key={i} className="text-slate-700">{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-slate-500">Keine Prozessschritte dokumentiert</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-base">Engpässe & Probleme</CardTitle>
            </CardHeader>
            <CardContent>
              {bottlenecks.length > 0 ? (
                <ul className="space-y-2">
                  {bottlenecks.map((bottleneck, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{bottleneck}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Keine Engpässe dokumentiert</p>
              )}
            </CardContent>
          </Card>
        </div>

        {renderFiles(process.ist_answers?.ist_files, "Dateien Ist-Zustand")}
      </div>

      <div className="flex justify-center py-8">
        <div className="flex flex-col items-center gap-4">
          <ArrowRight className="w-12 h-12 text-blue-600 animate-pulse" />
          <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2">
            Optimierung durch Digitalisierung
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          Soll-Zustand
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-base">Ziele</CardTitle>
            </CardHeader>
            <CardContent>
              {sollGoals.length > 0 ? (
                <ul className="space-y-2">
                  {sollGoals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{goal}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Keine Ziele definiert</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base">Neue Technologien</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                {process.soll_answers?.new_technologies || "Keine neuen Technologien definiert"}
              </p>
            </CardContent>
          </Card>
        </div>

        {renderFiles(process.soll_answers?.soll_files, "Dateien Soll-Zustand")}
      </div>
    </div>
  );
}