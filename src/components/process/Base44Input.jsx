
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Rocket, Loader2, Copy, CheckCircle, AlertCircle, Printer, Trash2, Eye, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from 'react-markdown';
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function Base44Input({ process, processId }) {
  const [generating, setGenerating] = useState(false);
  const [appSpecification, setAppSpecification] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [urlError, setUrlError] = useState(null);
  
  const queryClient = useQueryClient();

  const updateBase44SpecsMutation = useMutation({
    mutationFn: (base44_specifications) => base44.entities.Process.update(processId, { base44_specifications }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const updateBase44AppLinkMutation = useMutation({
    mutationFn: (base44_app_link) => base44.entities.Process.update(processId, { base44_app_link }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const isValidUrl = (string) => {
    if (!string || !string.trim()) return true;
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const handleAppLinkChange = async (newLink) => {
    setUrlError(null);
    
    const trimmedLink = newLink.trim();
    
    if (!trimmedLink) {
      if (process.base44_app_link !== "") {
        await updateBase44AppLinkMutation.mutateAsync("");
      }
      return;
    }
    
    if (!isValidUrl(trimmedLink)) {
      setUrlError('Bitte geben Sie eine gültige URL ein (z.B. https://example.com)');
      return;
    }
    
    if (process.base44_app_link !== trimmedLink) {
      await updateBase44AppLinkMutation.mutateAsync(trimmedLink);
    }
  };

  const openBase44App = () => {
    if (process.base44_app_link && process.base44_app_link.trim()) {
      setUrlError(null);
      try {
        const opened = window.open(process.base44_app_link, '_blank');
        
        if (!opened || opened.closed || typeof opened.closed == 'undefined') {
          setUrlError('Die URL konnte nicht geöffnet werden. Bitte prüfen Sie, ob Pop-ups blockiert sind.');
        }
        
        setTimeout(() => {
          try {
            if (opened && opened.closed) {
              setUrlError('Die Anwendung konnte möglicherweise nicht geladen werden. Bitte überprüfen Sie die URL.');
            }
          } catch (e) {
            // Cross-origin check might fail, ignore
          }
        }, 2000);
      } catch (error) {
        setUrlError('Fehler beim Öffnen der URL. Bitte überprüfen Sie, ob die URL korrekt ist.');
      }
    }
  };

  const generateAppSpecification = async () => {
    setGenerating(true);
    setError(null);
    setAppSpecification(null);

    try {
      const formatInterfaces = (interfaces) => {
        if (!interfaces || interfaces.length === 0) return 'Keine Schnittstellen definiert.';
        
        return interfaces.map((iface, idx) => {
          let details = `
### Schnittstelle ${idx + 1}: ${iface.name || 'Unbenannt'}

**Technische ID:** ${iface.interface_id || `INT-${idx + 1}`}
**Kategorie:** ${iface.category || 'Nicht angegeben'}
**Zweck:** ${iface.purpose || 'Nicht angegeben'}
**Beschreibung:** ${iface.description || 'Nicht angegeben'}
**Richtung:** ${iface.direction || 'Nicht angegeben'}
**Auslöser:** ${iface.trigger || 'Nicht angegeben'}
**Häufigkeit:** ${iface.frequency || 'Nicht angegeben'}
**Kritikalität:** ${iface.criticality || 'Nicht angegeben'}
**Fehlerbehandlung:** ${iface.error_handling || 'Nicht angegeben'}
**Ausgetauschte Daten:** ${iface.data_exchanged_description || 'Nicht angegeben'}
**Daten-Schema Referenz:** ${iface.data_schema_reference || 'Nicht angegeben'}
`;

          if (iface.category === 'System-zu-System' && iface.implementation_details) {
            details += `
**Implementierungsdetails (System-zu-System):**
- Quellsystem: ${iface.implementation_details.system_source || 'Nicht angegeben'}
- Zielsystem: ${iface.implementation_details.system_target || 'Nicht angegeben'}
- Integrationsmethode: ${iface.implementation_details.integration_method || 'Nicht angegeben'}
- API-Endpunkt: ${iface.implementation_details.api_endpoint || 'Nicht angegeben'}
- HTTP-Methode: ${iface.implementation_details.http_method || 'Nicht angegeben'}
- Datenformat: ${iface.implementation_details.data_format || 'Nicht angegeben'}
- Authentifizierung: ${iface.implementation_details.authentication_type || 'Nicht angegeben'}
- Sicherheitshinweise: ${iface.implementation_details.security_notes || 'Nicht angegeben'}
`;
          } else if (iface.category === 'Mensch-zu-System' && iface.implementation_details) {
            details += `
**Implementierungsdetails (Mensch-zu-System):**
- Benutzerrolle: ${iface.implementation_details.human_role || 'Nicht angegeben'}
- Systemkomponente: ${iface.implementation_details.system_component || 'Nicht angegeben'}
- Interface-Medium: ${iface.implementation_details.interface_medium || 'Nicht angegeben'}
- Interaktionstyp: ${iface.implementation_details.interaction_type || 'Nicht angegeben'}
- Erforderliche Eingabefelder: ${iface.implementation_details.input_fields_required || 'Nicht angegeben'}
- Ausgabe-Anzeigetyp: ${iface.implementation_details.output_display_type || 'Nicht angegeben'}
- Benachrichtigungstyp: ${iface.implementation_details.notification_type || 'Nicht angegeben'}
- Validierungsregeln: ${iface.implementation_details.validation_rules || 'Nicht angegeben'}
`;
          } else if (iface.category === 'Mensch-zu-Mensch' && iface.implementation_details) {
            details += `
**Implementierungsdetails (Mensch-zu-Mensch):**
- Teilnehmer A Rolle: ${iface.implementation_details.participant_a_role || 'Nicht angegeben'}
- Teilnehmer B Rolle: ${iface.implementation_details.participant_b_role || 'Nicht angegeben'}
- Kommunikationskanal: ${iface.implementation_details.communication_channel || 'Nicht angegeben'}
- Geteilte Informationen: ${iface.implementation_details.shared_information_description || 'Nicht angegeben'}
- Erwartetes Ergebnis: ${iface.implementation_details.expected_outcome || 'Nicht angegeben'}
- Dokumentationsmethode: ${iface.implementation_details.documentation_method || 'Nicht angegeben'}
`;
          }
          return details;
        }).join('\n\n---\n\n');
      };

      const interfacesFormatted = formatInterfaces(process.soll_answers?.new_interfaces);

      const promptText = `Du bist ein Experte für Software-Architektur und die base44-Plattform.

# AUFTRAG
Erstelle eine VOLLSTÄNDIGE, DETAILLIERTE und MASCHINENLESBARE Spezifikation für eine base44-Anwendung, die den folgenden SOLL-ZUSTAND eines Prozesses umsetzt.

Die Spezifikation soll so präzise sein, dass ein KI-Agent (wie base44) daraus direkt eine funktionierende Anwendung generieren kann.

# PROZESSNAME
${process.process_name}

# SOLL-ZUSTAND BESCHREIBUNG
${process.soll_description || 'Keine Beschreibung vorhanden'}

## Ziele des Soll-Zustands
${process.soll_answers?.goals || 'Keine Ziele definiert'}

## Auswirkungen auf Abteilungen
${process.soll_answers?.impact_on_departments || 'Keine Angaben'}

## Neue Technologien
${process.soll_answers?.new_technologies || 'Keine Technologien spezifiziert'}

# DETAILLIERTE SCHNITTSTELLENDEFINITIONEN
${interfacesFormatted}

# ANFORDERUNGEN AUS IST-ANALYSE
**Aktuelle Probleme/Engpässe die gelöst werden sollen:**
${process.ist_answers?.bottlenecks || 'Keine Engpässe dokumentiert'}

**Zu verarbeitende Daten:**
${process.ist_answers?.data_processed || 'Keine Datenangaben'}

**Manuelle Tätigkeiten die automatisiert werden sollen:**
${process.ist_answers?.manual_tasks || 'Keine manuellen Tätigkeiten dokumentiert'}

**Beteiligte Abteilungen:**
${process.ist_answers?.involved_departments || 'Keine Angaben'}

**Regulatorische Anforderungen:**
${process.ist_answers?.regulatory_requirements || 'Keine Angaben'}

# BUDGET UND AUFWAND
- ROI-Ziel: ${process.roi_data?.calculated_roi?.toFixed(1) || 0}%
- Investitionsbudget: ${process.roi_data?.investment_cost || 0}€
- Erwartete jährliche Einsparungen: ${((process.roi_data?.efficiency_savings || 0) + (process.roi_data?.error_reduction_savings || 0) + (process.roi_data?.personnel_savings || 0) + (process.roi_data?.additional_revenue || 0)).toFixed(0)}€
- Entwicklungsaufwand: ${process.effort_details?.development_hours || 0} Stunden

# ERWARTETE AUSGABE
Erstelle eine strukturierte base44-Spezifikation mit folgenden Abschnitten:

1. **APP-ÜBERSICHT**
   - Name der Anwendung
   - Hauptzweck und Nutzen
   - Zielgruppe/Nutzer

2. **ENTITIES (Datenmodell)**
   - Definiere alle benötigten Entities mit vollständigen JSON-Schemas
   - Berücksichtige die Schnittstellen und zu verarbeitenden Daten
   - Nutze das built-in User-Entity für Benutzer

3. **PAGES (Seiten)**
   - Beschreibe alle notwendigen Seiten der Anwendung
   - Definiere die Navigation und den Benutzerfluss
   - Beschreibe die Funktionalität jeder Seite

4. **COMPONENTS (Komponenten)**
   - Liste wiederverwendbare UI-Komponenten auf
   - Beschreibe deren Zweck und Funktionalität

5. **LAYOUT**
   - Beschreibe das generelle Layout der Anwendung
   - Navigation, Header, Footer, etc.

6. **INTEGRATIONEN**
   - Welche externen Systeme/APIs müssen angebunden werden
   - Wie sollen die definierten Schnittstellen technisch umgesetzt werden

7. **BUSINESS-LOGIK**
   - Beschreibe wichtige Workflows
   - Validierungsregeln
   - Berechnungen und Automatisierungen

8. **BERECHTIGUNGEN & ROLLEN**
   - Welche Benutzerrollen gibt es
   - Welche Berechtigungen haben diese Rollen

9. **TECHNISCHE ANFORDERUNGEN**
   - Performance-Anforderungen
   - Sicherheitsanforderungen
   - Skalierbarkeit

10. **IMPLEMENTIERUNGS-HINWEISE**
    - Vorschläge für die Umsetzung mit base44
    - Welche base44-Features sollen genutzt werden
    - Mögliche Herausforderungen und Lösungsansätze

Nutze klare, strukturierte Markdown-Formatierung. Sei so spezifisch wie möglich, damit die Anwendung direkt generiert werden kann.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: promptText,
        add_context_from_internet: false
      });

      setAppSpecification(result);

      const existingSpecs = process.base44_specifications || [];
      const newSpec = {
        name: `Base44_Soll_Spezifikation_${new Date().toISOString().split('T')[0]}_${new Date().toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'}).replace(':', '-')}`,
        content: result,
        created_date: new Date().toISOString()
      };
      
      await updateBase44SpecsMutation.mutateAsync([...existingSpecs, newSpec]);
      
    } catch (err) {
      setError('Fehler beim Generieren der App-Spezifikation. Bitte versuchen Sie es erneut.');
      console.error('Error generating app specification:', err);
    } finally {
      setGenerating(false);
    }
  };

  const removeSpec = async (indexToRemove) => {
    const specs = process.base44_specifications?.filter((_, i) => i !== indexToRemove) || [];
    await updateBase44SpecsMutation.mutateAsync(specs);
    if (selectedSpec && selectedSpec.index === indexToRemove) {
      setSelectedSpec(null);
    }
  };

  const viewSpec = (spec, index) => {
    setSelectedSpec({ ...spec, index });
  };

  const copyToClipboard = () => {
    if (selectedSpec) {
      navigator.clipboard.writeText(selectedSpec.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cleanTextForPDF = (markdown) => {
    if (!markdown) return '';
    
    let cleaned = markdown
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold**
      .replace(/\*([^*]+)\*/g, '$1')     // Remove *italic*
      .replace(/`([^`]+)`/g, '$1')     // Remove `code`
      .replace(/###\s+(.+)/g, '$1')    // Remove ### headings
      .replace(/##\s+(.+)/g, '$1')     // Remove ## headings
      .replace(/#\s+(.+)/g, '$1')      // Remove # headings
      .replace(/---/g, '')             // Remove horizontal rules
      .replace(/\n{3,}/g, '\n\n');     // Reduce multiple newlines
    
    return cleaned;
  };

  const printAppSpecPDF = () => {
    if (!selectedSpec) return;
    
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Pop-ups für diese Seite, um das Dokument zu drucken.');
      return;
    }
    
    const cleanedText = cleanTextForPDF(selectedSpec.content);
    
    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Base44 App-Spezifikation - ${process.process_name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header h1 {
      border: none;
      color: #1e40af;
      margin: 0;
    }
    pre {
      background: #f8f9fa;
      padding: 15px;
      border-left: 4px solid #2563eb;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    @media print {
      body { margin: 0; padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>base44 Soll-Spezifikation</h1>
    <p><strong>${process.process_name}</strong></p>
    <p>Erstellt am: ${new Date(selectedSpec.created_date).toLocaleDateString('de-DE')}</p>
  </div>
  <pre>${cleanedText}</pre>
</body>
</html>`);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const base44Specs = process.base44_specifications || [];
  const hasSpecs = base44Specs.length > 0;

  return (
    <div className="space-y-6">
      
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-green-600" />
            Externe Anwendung verknüpfen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="base44-app-link">Link zur Anwendung</Label>
            <Input
              id="base44-app-link"
              type="url"
              placeholder="https://example.com/..."
              defaultValue={process.base44_app_link || ""}
              onBlur={(e) => handleAppLinkChange(e.target.value)}
              className="bg-white"
            />
          </div>
          
          {urlError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{urlError}</AlertDescription>
            </Alert>
          )}
          
          {process.base44_app_link && process.base44_app_link.trim() && (
            <Button
              onClick={openBase44App}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              <ExternalLink className="w-4 h-4" />
              Anwendung öffnen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Button zum Generieren der Spezifikation - immer sichtbar */}
      <div className="flex justify-center">
        <Button
          onClick={generateAppSpecification}
          disabled={generating}
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generiere Spezifikation...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Base44 Spezifikation generieren
            </>
          )}
        </Button>
      </div>

      {generating && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-blue-800 font-medium">Generiere Base44 Soll-Spezifikation aus erfassten Daten...</p>
            <p className="text-sm text-blue-600 mt-2">Dies kann 30-60 Sekunden dauern</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasSpecs && !selectedSpec && (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Gespeicherte Base44 Spezifikationen</h4>
          <div className="grid gap-3">
            {base44Specs.map((spec, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <Rocket className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{spec.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Base44 Soll-Spezifikation
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(spec.created_date).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => viewSpec(spec, index)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Ansehen
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSpec(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedSpec && (
        <div className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200">
            <Rocket className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Base44 Soll-Spezifikation bereit!</strong> Kopieren Sie diese Spezifikation und verwenden Sie sie als Prompt in einer neuen base44-App, um die Anwendung automatisch zu generieren.
            </AlertDescription>
          </Alert>

          <Card className="border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-blue-600" />
                  Base44 Soll-Spezifikation
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Kopieren
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={printAppSpecPDF}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => setSelectedSpec(null)}
                    variant="ghost"
                    size="sm"
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown>{selectedSpec.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Nächste Schritte:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Klicken Sie auf "Kopieren", um die Spezifikation in die Zwischenablage zu kopieren</li>
                <li>Öffnen Sie eine neue base44-App</li>
                <li>Fügen Sie die Spezifikation als Prompt ein</li>
                <li>Der base44-Agent generiert die komplette App automatisch basierend auf Ihrem Soll-Zustand</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={() => {
                setSelectedSpec(null);
                generateAppSpecification();
              }}
              variant="outline"
              className="gap-2"
            >
              <Rocket className="w-4 h-4" />
              Neu generieren
            </Button>
            <Button 
              onClick={copyToClipboard}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  In Zwischenablage kopieren
                </>
              )}
            </Button>
            <Button 
              onClick={printAppSpecPDF}
              variant="outline"
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Als PDF speichern
            </Button>
          </div>
        </div>
      )}

      {appSpecification && !selectedSpec && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Base44 Soll-Spezifikation erfolgreich generiert und gespeichert! Sie finden sie in der Liste "Gespeicherte Base44 Spezifikationen" oben.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
