import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, Sparkles, Trash2, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function RequirementsSpecification({ process, processId }) {
  const [generatingProzessdoku, setGeneratingProzessdoku] = useState(false);
  const [prozessdokuError, setProzessdokuError] = useState(null);

  const queryClient = useQueryClient();

  const updateSpecificationsMutation = useMutation({
    mutationFn: (specification_files) => base44.entities.Process.update(processId, { specification_files }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const generateProzessdokumentation = async () => {
    setGeneratingProzessdoku(true);
    setProzessdokuError(null);

    try {
      const allFileUrls = [];
      
      if (process.ist_answers?.ist_files && process.ist_answers.ist_files.length > 0) {
        allFileUrls.push(...process.ist_answers.ist_files.map(f => f.url));
      }
      
      if (process.soll_answers?.soll_files && process.soll_answers.soll_files.length > 0) {
        allFileUrls.push(...process.soll_answers.soll_files.map(f => f.url));
      }
      
      if (process.lastenheft_uploaded_files && process.lastenheft_uploaded_files.length > 0) {
        allFileUrls.push(...process.lastenheft_uploaded_files.map(f => f.url));
      }

      const filesContext = allFileUrls.length > 0 
        ? `\n\n**WICHTIG:** Es wurden ${allFileUrls.length} Dateien hochgeladen. Analysiere diese Dateien gründlich und integriere ihre Inhalte sinnvoll in den Bericht.`
        : '';

      const istPersonnelCost = (process.ist_costs?.personnel_hours || 0) * (process.ist_costs?.hourly_rate || 0);
      const istSystemCosts = process.ist_costs?.system_costs || 0;
      const istOtherCosts = process.ist_costs?.other_costs || 0;
      const istTotalMonthlyCost = istPersonnelCost + istSystemCosts + istOtherCosts;
      const istTotalYearlyCost = istTotalMonthlyCost * 12;

      const totalHours = 
        (process.effort_details?.conception_hours || 0) +
        (process.effort_details?.development_hours || 0) +
        (process.effort_details?.testing_hours || 0) +
        (process.effort_details?.deployment_hours || 0);
      
      const hourlyRate = process.effort_details?.hourly_rate_at_estimation || 0;
      const totalCost = totalHours * hourlyRate;

      const totalSavingsPerYear = 
        (process.roi_data?.efficiency_savings || 0) +
        (process.roi_data?.error_reduction_savings || 0) +
        (process.roi_data?.personnel_savings || 0) +
        (process.roi_data?.additional_revenue || 0);
      
      const investment = process.roi_data?.investment_cost || totalCost || 0;
      const paybackMonths = totalSavingsPerYear > 0 ? (investment / (totalSavingsPerYear / 12)) : 0;

      const prompt = `
Du bist ein Senior Business Analyst und Experte für Prozessoptimierung und Digitalisierungsprojekte.

Erstelle einen **PROFESSIONELLEN GESAMTBERICHT** für folgendes Digitalisierungsprojekt. 
Der Bericht muss klar strukturiert, logisch aufgebaut und für Management-Präsentationen geeignet sein.

${filesContext}

═══════════════════════════════════════════════════════════════════════════════

# BASISDATEN

**Projekt:** ${process.process_name}
**Status:** ${process.status}
**Kunde/Auftraggeber:** ${process.customer_id || 'Nicht angegeben'}
**Erfasser:** ${process.erfasser || 'Nicht angegeben'}
**Erfassungsdatum:** ${process.erfassungsdatum || 'Nicht angegeben'}

═══════════════════════════════════════════════════════════════════════════════

# ERFASSTE DATEN - IST-ZUSTAND

## Prozessschritte
${process.ist_answers?.process_steps || 'Nicht dokumentiert'}

## Verantwortlichkeiten
- **Hauptverantwortlich:** ${process.ist_answers?.responsible_person || 'Nicht angegeben'}
- **Beteiligte Abteilungen:** ${process.ist_answers?.involved_departments || 'Nicht angegeben'}

## Technische Infrastruktur
- **Aktuelle Systeme:** ${process.ist_answers?.current_systems || 'Nicht angegeben'}
- **Verarbeitete Daten:** ${process.ist_answers?.data_processed || 'Nicht dokumentiert'}

## Schnittstellen (Ist-Zustand)
${process.ist_answers?.interfaces?.length > 0 
  ? process.ist_answers.interfaces.map((i, idx) => `
${idx + 1}. **${i.system_name}** (${i.interface_type})
   - ${i.description || 'Keine Beschreibung'}
`).join('\n') 
  : 'Keine Schnittstellen dokumentiert'}

## Problemanalyse
- **Engpässe:** ${process.ist_answers?.bottlenecks || 'Nicht dokumentiert'}
- **Manuelle Tätigkeiten:** ${process.ist_answers?.manual_tasks || 'Nicht dokumentiert'}
- **Technische Herausforderungen:** ${process.ist_answers?.technical_challenges || 'Keine'}

## Compliance & Standards
- **Regulatorische Anforderungen:** ${process.ist_answers?.regulatory_requirements || 'Keine besonderen Anforderungen'}
- **KPIs:** ${process.ist_answers?.kpis || 'Nicht definiert'}

## Kostenstruktur (Ist-Zustand)
**Monatliche Kosten:**
- Personalkosten: ${istPersonnelCost.toFixed(2)}€ (${process.ist_costs?.personnel_hours || 0}h × ${process.ist_costs?.hourly_rate || 0}€/h)
- Systemkosten: ${istSystemCosts.toFixed(2)}€
- Sonstige Kosten: ${istOtherCosts.toFixed(2)}€
- **Summe pro Monat: ${istTotalMonthlyCost.toFixed(2)}€**

**Jährliche Kosten:** ${istTotalYearlyCost.toFixed(2)}€

## Hochgeladene Ist-Dateien
${process.ist_answers?.ist_files?.length > 0
  ? `${process.ist_answers.ist_files.length} Dateien wurden analysiert:\n${process.ist_answers.ist_files.map((f, i) => `${i + 1}. ${f.name} (${f.type})`).join('\n')}`
  : 'Keine Dateien hochgeladen'}

═══════════════════════════════════════════════════════════════════════════════

# ERFASSTE DATEN - SOLL-ZUSTAND

## Vision & Zielsetzung
${process.soll_description || 'Nicht beschrieben'}

## Definierte Ziele
${process.soll_answers?.goals || 'Nicht definiert'}

## Auswirkungen
${process.soll_answers?.impact_on_departments || 'Nicht dokumentiert'}

## Technologische Transformation
${process.soll_answers?.new_technologies || 'Nicht definiert'}

## Geplante Schnittstellen (Soll-Zustand)
${process.soll_answers?.new_interfaces?.length > 0
  ? process.soll_answers.new_interfaces.map((i, idx) => `
${idx + 1}. **${i.name}** (${i.category})
   - **ID:** ${i.interface_id}
   - **Zweck:** ${i.purpose}
   - **Beschreibung:** ${i.description}
   - **Richtung:** ${i.direction}
   - **Auslöser:** ${i.trigger}
   - **Häufigkeit:** ${i.frequency}
   - **Kritikalität:** ${i.criticality}
   - **Fehlerbehandlung:** ${i.error_handling || 'Nicht definiert'}
   - **Daten:** ${i.data_exchanged_description || 'Nicht beschrieben'}
`).join('\n\n')
  : 'Keine neuen Schnittstellen definiert'}

## Hochgeladene Soll-Dateien
${process.soll_answers?.soll_files?.length > 0
  ? `${process.soll_answers.soll_files.length} Dateien wurden analysiert:\n${process.soll_answers.soll_files.map((f, i) => `${i + 1}. ${f.name} (${f.type})`).join('\n')}`
  : 'Keine Dateien hochgeladen'}

═══════════════════════════════════════════════════════════════════════════════

# ERFASSTE DATEN - UMSETZUNGSPLANUNG

## Aufwandsschätzung
- Konzeption: ${process.effort_details?.conception_hours || 0}h
- Entwicklung: ${process.effort_details?.development_hours || 0}h
- Test: ${process.effort_details?.testing_hours || 0}h
- Einführung: ${process.effort_details?.deployment_hours || 0}h
- **Gesamtstunden: ${totalHours}h**
- **Stundensatz: ${hourlyRate.toFixed(2)}€/h**
- **Gesamtkosten: ${totalCost.toFixed(2)}€**

${process.effort_details?.consultant_name ? `
**Verantwortlicher Berater:** ${process.effort_details.consultant_name}
` : ''}

## ROI-Kalkulation
**Erwartete Einsparungen/Gewinne (jährlich):**
- Effizienzsteigerung: ${(process.roi_data?.efficiency_savings || 0).toFixed(2)}€
- Fehlerreduzierung: ${(process.roi_data?.error_reduction_savings || 0).toFixed(2)}€
- Personaleinsparungen: ${(process.roi_data?.personnel_savings || 0).toFixed(2)}€
- Zusätzliche Einnahmen: ${(process.roi_data?.additional_revenue || 0).toFixed(2)}€
- **Summe pro Jahr: ${totalSavingsPerYear.toFixed(2)}€**

**Investition:** ${investment.toFixed(2)}€

**Amortisation:** ${paybackMonths > 0 && isFinite(paybackMonths) ? paybackMonths.toFixed(1) + ' Monate' : 'Nicht berechenbar'}

**ROI (3 Jahre):** ${investment > 0 ? (((totalSavingsPerYear * 3 - investment) / investment) * 100).toFixed(1) + '%' : 'Nicht berechenbar'}

═══════════════════════════════════════════════════════════════════════════════

# ZUSÄTZLICHE DOKUMENTATION

## Lastenheft-Dateien
${process.lastenheft_uploaded_files?.length > 0
  ? `${process.lastenheft_uploaded_files.length} Dateien wurden berücksichtigt:\n${process.lastenheft_uploaded_files.map((f, i) => `${i + 1}. ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join('\n')}`
  : 'Keine zusätzlichen Dateien'}

## BPMN-Modelle
${process.bpmn_files?.length > 0
  ? `${process.bpmn_files.length} BPMN-Dateien vorhanden:\n${process.bpmn_files.map((f, i) => `${i + 1}. ${f.name}`).join('\n')}`
  : 'Keine BPMN-Modelle'}

## Base44-Spezifikationen
${process.base44_specifications?.length > 0
  ? `${process.base44_specifications.length} App-Spezifikationen erstellt:\n${process.base44_specifications.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}`
  : 'Keine App-Spezifikationen'}

═══════════════════════════════════════════════════════════════════════════════

# DEINE AUFGABE

Erstelle basierend auf ALLEN oben genannten Daten und unter Berücksichtigung aller hochgeladenen Dateien einen **VOLLSTÄNDIGEN, PROFESSIONELLEN GESAMTBERICHT** mit folgender Struktur:

# GESAMTBERICHT: ${process.process_name}

## 1. EXECUTIVE SUMMARY
**Schreibe eine prägnante Zusammenfassung (max. 1 Seite) mit:**
- Projektübersicht und Ziele
- Hauptprobleme im Ist-Zustand
- Geplante Lösung (Soll-Zustand)
- Wichtigste Kennzahlen (Kosten, ROI, Amortisation)
- Handlungsempfehlung

## 2. AUSGANGSLAGE & PROBLEMANALYSE
**Beschreibe den aktuellen Zustand detailliert:**
- Prozessablauf und beteiligte Personen/Abteilungen
- Eingesetzte Systeme und Schnittstellen
- Identifizierte Probleme, Engpässe und Ineffizienzen
- Manuelle Tätigkeiten und deren Auswirkungen
- Kostenstruktur (monatlich/jährlich)
- Erkenntnisse aus hochgeladenen Ist-Dateien

## 3. SOLL-KONZEPT & LÖSUNGSANSATZ
**Präsentiere die geplante Transformation:**
- Vision und strategische Ziele
- Optimierter Prozessablauf
- Neue Technologien und Systeme
- Geplante Schnittstellen (detailliert mit allen Spezifikationen)
- Erwartete Verbesserungen und Automatisierungspotenziale
- Integration der hochgeladenen Soll-Konzepte

## 4. GAP-ANALYSE: IST vs. SOLL
**Stelle die Unterschiede strukturiert dar:**
- Vergleichstabelle: Was ändert sich?
- Wegfallende manuelle Tätigkeiten
- Neue automatisierte Prozesse
- Systemänderungen und neue Schnittstellen
- Organisatorische Anpassungen

## 5. IMPLEMENTIERUNGSPLAN
**Definiere den Weg zur Umsetzung:**
- Projektphasen (Konzeption, Entwicklung, Test, Einführung)
- Detaillierte Aufwandsschätzung (Stunden pro Phase)
- Meilensteine und Zeitplan
- Ressourcenplanung
- Risiken und Abhängigkeiten
- Qualitätssicherungsmaßnahmen

## 6. WIRTSCHAFTLICHKEITSBETRACHTUNG
**Analysiere die finanziellen Aspekte:**
- Detaillierte Ist-Kosten (monatlich/jährlich)
- Investitionskosten (nach Phasen aufgeschlüsselt)
- Einsparungspotenziale (detailliert)
  * Effizienzsteigerung
  * Fehlerreduzierung
  * Personaleinsparungen
  * Zusätzliche Einnahmen
- ROI-Berechnung (1, 3, 5 Jahre)
- Amortisationsanalyse
- Break-Even-Point
- Sensitivitätsanalyse (Best/Worst Case)

## 7. RISIKOMANAGEMENT & COMPLIANCE
**Identifiziere und bewerte Risiken:**
- Technische Risiken
- Organisatorische Risiken
- Finanzielle Risiken
- Mitigationsstrategien
- Compliance-Anforderungen (DSGVO, regulatorische Vorgaben)
- Datenschutz und Sicherheit

## 8. CHANGE MANAGEMENT & SCHULUNG
**Plane die organisatorische Transformation:**
- Betroffene Stakeholder
- Kommunikationsstrategie
- Schulungsbedarf
- Widerstands management
- Erfolgsmessung (KPIs)

## 9. HANDLUNGSEMPFEHLUNGEN & NÄCHSTE SCHRITTE
**Gib klare Empfehlungen:**
- Prioritäten für die Umsetzung
- Quick Wins (schnell umsetzbare Verbesserungen)
- Langfristige strategische Maßnahmen
- Erfolgskritische Faktoren
- Konkrete nächste Schritte mit Verantwortlichkeiten

## 10. ANHANG
**Ergänzende Informationen:**
- Detaillierte Schnittstellenspezifikationen (technisch)
- Kostenaufstellungen (Tabellen)
- Zeitpläne (Gantt-Charts in Textform)
- Glossar (Fachbegriffe)
- Referenzen auf hochgeladene Dokumente

═══════════════════════════════════════════════════════════════════════════════

**WICHTIGE HINWEISE FÜR DIE ERSTELLUNG:**

1. **Struktur:** Nutze klare Überschriften (## und ###), Aufzählungen und Absätze
2. **Sprache:** Professionell, präzise, aber verständlich (keine übertriebenen Fachbegriffe)
3. **Zahlen:** Immer mit Kontext (Was bedeutet die Zahl? Ist sie gut/schlecht?)
4. **Tabellen:** Nutze Markdown-Tabellen für Vergleiche und Datenübersichten
5. **Visualisierung:** Beschreibe Zusammenhänge visuell (z.B. "Prozess: A → B → C")
6. **Vollständigkeit:** Verwende ALLE verfügbaren Informationen aus den Eingabedaten
7. **Dateien:** Analysiere die hochgeladenen Dateien und integriere ihre Inhalte sinnvoll
8. **Kohärenz:** Der Bericht muss als Ganzes Sinn ergeben und eine klare Story erzählen
9. **Handlungsorientierung:** Fokus auf umsetzbare Erkenntnisse und Empfehlungen
10. **Länge:** Umfassend und detailliert (ca. 15-25 Seiten äquivalent)

Erstelle jetzt den vollständigen, professionellen Bericht!
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        file_urls: allFileUrls.length > 0 ? allFileUrls : undefined
      });

      const existingSpecs = process.specification_files || [];
      const newSpec = {
        name: `Gesamtbericht_${process.process_name}_${new Date().toISOString().split('T')[0]}`,
        type: "prozessdokumentation",
        content: result,
        created_date: new Date().toISOString()
      };

      await updateSpecificationsMutation.mutateAsync([...existingSpecs, newSpec]);

    } catch (error) {
      console.error('Fehler beim Generieren des Gesamtberichts:', error);
      setProzessdokuError('Fehler beim Generieren. Bitte versuchen Sie es erneut.');
    } finally {
      setGeneratingProzessdoku(false);
    }
  };

  const generateFormattedHTML = (content, processName, createdDate) => {
    let htmlContent = content;
    
    htmlContent = htmlContent.replace(/═+/g, '<hr class="divider-major">');
    htmlContent = htmlContent.replace(/^---$/gm, '<hr class="divider-minor">');
    
    htmlContent = htmlContent.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    htmlContent = htmlContent.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    htmlContent = htmlContent.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    const tableRegex = /((?:^|\n)\|.*\|(?:\n\|\s*[-:]+\s*[-|]+\s*[-:]*\s*\|)*\n(?:\|.*\|(?:(?!\n\n|\n<h[1-3]|\n<hr|<ul|<ol).)*)*)/g;
    htmlContent = htmlContent.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n');
      let htmlTable = '<table>';
      let header = '';
      let body = '';
      let inHeader = true;

      for (const line of lines) {
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
          const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
          const htmlCells = cells.map(cell => (inHeader ? `<th>${cell}` : `<td>${cell}`)).join('');
          
          if (inHeader && line.includes('---')) {
            inHeader = false;
            if (header) {
              htmlTable += `<thead><tr>${header}</tr></thead><tbody>`;
            } else {
              htmlTable += `<thead><tr>${cells.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
            }
            header = '';
          } else if (inHeader) {
            header += htmlCells;
          } else {
            body += `<tr>${htmlCells}</tr>`;
          }
        } else if (inHeader && !header) {
          break;
        }
      }
      
      if (inHeader && header) {
        htmlTable += `<thead><tr>${header.replace(/<th>/g, '<th>')}</tr></thead><tbody>`;
      }
      
      htmlTable += body;
      htmlTable += '</tbody></table>';
      return htmlTable;
    });

    htmlContent = htmlContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    htmlContent = htmlContent.replace(/\*(.+?)\*/g, '<em>$1</em>');
    htmlContent = htmlContent.replace(/`(.+?)`/g, '<code>$1</code>');
    
    htmlContent = htmlContent.replace(/^\d+\.\s+(.+)$/gm, '<li class="ordered">$1</li>');
    htmlContent = htmlContent.replace(/^[-•]\s+(.+)$/gm, '<li class="unordered">$1</li>');
    
    htmlContent = htmlContent.replace(/(<li class="ordered">.*?<\/li>\n?)+/gs, '<ol>$&</ol>');
    htmlContent = htmlContent.replace(/(<li class="unordered">.*?<\/li>\n?)+/gs, '<ul>$&</ul>');

    htmlContent = htmlContent.replace(/\n\n/g, '</p><p>');
    htmlContent = `<p>${htmlContent}</p>`;
    htmlContent = htmlContent.replace(/<p><\/p>/g, '');
    
    htmlContent = htmlContent.replace(/<p>\s*(<h[123]>)/g, '$1');
    htmlContent = htmlContent.replace(/(<\/h[123]>)\s*<\/p>/g, '$1');
    htmlContent = htmlContent.replace(/<p>\s*(<hr)/g, '$1');
    htmlContent = htmlContent.replace(/(>)\s*<\/p>/g, '$1');
    htmlContent = htmlContent.replace(/<p>\s*(<ol>)/g, '$1');
    htmlContent = htmlContent.replace(/<p>\s*(<ul>)/g, '$1');
    htmlContent = htmlContent.replace(/(<\/ol>)\s*<\/p>/g, '$1');
    htmlContent = htmlContent.replace(/(<\/ul>)\s*<\/p>/g, '$1');
    htmlContent = htmlContent.replace(/<p>\s*(<table>)/g, '$1');
    htmlContent = htmlContent.replace(/(<\/table>)\s*<\/p>/g, '$1');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Gesamtbericht ${processName}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', 'Arial', sans-serif;
      line-height: 1.8;
      color: #1e293b;
      max-width: 210mm;
      margin: 0 auto;
      padding: 30px;
      background: #f8fafc;
    }
    
    .document {
      background: white;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 4px solid #3b82f6;
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      padding: 30px;
      border-radius: 8px;
      margin: -40px -40px 50px -40px;
    }
    
    .header h1 {
      color: #1e40af;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 15px;
      border: none;
      padding: 0;
    }
    
    .header .subtitle {
      color: #475569;
      font-size: 16px;
      margin-top: 15px;
      line-height: 1.6;
    }
    
    .header .subtitle strong {
      color: #1e40af;
      font-size: 18px;
      display: block;
      margin-bottom: 5px;
    }
    
    h1 {
      color: #0f172a;
      font-size: 28px;
      font-weight: 700;
      margin-top: 50px;
      margin-bottom: 25px;
      padding-bottom: 12px;
      border-bottom: 3px solid #3b82f6;
      page-break-after: avoid;
    }
    
    h2 {
      color: #1e40af;
      font-size: 22px;
      font-weight: 600;
      margin-top: 40px;
      margin-bottom: 20px;
      padding-left: 15px;
      border-left: 5px solid #3b82f6;
      background: #f1f5f9;
      padding: 15px;
      border-radius: 4px;
      page-break-after: avoid;
    }
    
    h3 {
      color: #334155;
      font-size: 18px;
      font-weight: 600;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 3px solid #60a5fa;
      page-break-after: avoid;
    }
    
    p {
      margin: 15px 0;
      text-align: justify;
      color: #334155;
      line-height: 1.8;
    }
    
    ul, ol {
      margin: 20px 0;
      padding-left: 35px;
    }
    
    li {
      margin: 10px 0;
      line-height: 1.7;
      color: #475569;
    }
    
    ul li {
      list-style-type: disc;
    }
    
    ol li {
      list-style-type: decimal;
    }
    
    ul li::marker {
      color: #3b82f6;
      font-weight: bold;
    }
    
    ol li::marker {
      color: #3b82f6;
      font-weight: bold;
    }
    
    strong {
      color: #1e40af;
      font-weight: 600;
    }
    
    em {
      color: #64748b;
      font-style: italic;
    }
    
    code {
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      border: 1px solid #bae6fd;
    }
    
    hr.divider-major {
      border: none;
      border-top: 4px double #3b82f6;
      margin: 50px 0;
      opacity: 0.5;
    }
    
    hr.divider-minor {
      border: none;
      border-top: 1px solid #cbd5e1;
      margin: 30px 0;
    }
    
    .section {
      margin: 30px 0;
      padding: 25px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
    }
    
    .footer strong {
      color: #64748b;
      display: block;
      margin-bottom: 5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    th {
      background: #3b82f6;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    tr:nth-child(even) {
      background: #f8fafc;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .document {
        box-shadow: none;
        padding: 20mm;
      }
      
      h1, h2, h3 {
        page-break-after: avoid;
      }
      
      p, ul, ol, table {
        page-break-inside: avoid;
      }
      
      .header {
        margin: -20mm -20mm 40px -20mm;
      }
    }
    
    @media screen and (max-width: 768px) {
      body {
        padding: 15px;
      }
      
      .document {
        padding: 20px;
      }
      
      .header {
        margin: -20px -20px 30px -20px;
        padding: 20px;
      }
      
      h1 {
        font-size: 24px;
      }
      
      h2 {
        font-size: 20px;
      }
      
      h3 {
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <h1>📊 Prozessdokumentation</h1>
      <div class="subtitle">
        <strong>${processName}</strong>
        <div style="margin-top: 10px;">
          Erstellt am: ${new Date(createdDate).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
    
    <div class="content">
      ${htmlContent}
    </div>
    
    <div class="footer">
      <strong>Generiert mit KI-Workbench ProcessOptima</strong>
      <div>Dieser Bericht wurde automatisch generiert und berücksichtigt alle erfassten Prozessdaten</div>
    </div>
  </div>
</body>
</html>`;
  };

  const viewSpec = (spec) => {
    const formattedHtml = generateFormattedHTML(spec.content, process.process_name, spec.created_date);
    const viewWindow = window.open('', '_blank');
    
    if (!viewWindow) {
      alert('Bitte erlauben Sie Pop-ups für diese Seite.');
      return;
    }
    
    viewWindow.document.write(formattedHtml);
    viewWindow.document.close();
  };

  const downloadSpecAsPDF = async (spec) => {
    const formattedHtml = generateFormattedHTML(spec.content, process.process_name, spec.created_date);
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Pop-ups für diese Seite, um das PDF zu erstellen.');
      return;
    }
    
    printWindow.document.write(formattedHtml);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const deleteSpec = async (indexToDelete) => {
    const specs = process.specification_files.filter((_, i) => i !== indexToDelete);
    await updateSpecificationsMutation.mutateAsync(specs);
  };

  const prozessdokuSpecs = process.specification_files?.filter(s => s.type === "prozessdokumentation") || [];

  const totalUploadedFiles = 
    (process.ist_answers?.ist_files?.length || 0) +
    (process.soll_answers?.soll_files?.length || 0) +
    (process.lastenheft_uploaded_files?.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Berichte & Dokumentation</h3>
          <p className="text-sm text-slate-600">KI-generierte Gesamtberichte über den Prozess</p>
        </div>
      </div>

      {totalUploadedFiles > 0 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Datei-Kontext verfügbar:</strong> Es wurden insgesamt {totalUploadedFiles} Dateien hochgeladen, 
            die bei der Berichtsgenerierung analysiert und berücksichtigt werden.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Vollständigen Gesamtbericht generieren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Was beinhaltet der Gesamtbericht?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Executive Summary mit Haupterkenntnissen</li>
              <li>✓ Vollständige Ist-Zustand Analyse mit allen Details</li>
              <li>✓ Soll-Konzept inkl. aller Schnittstellen-Spezifikationen</li>
              <li>✓ Gap-Analyse: Was ändert sich?</li>
              <li>✓ Detaillierter Implementierungsplan</li>
              <li>✓ Wirtschaftlichkeitsbetrachtung & ROI-Analyse</li>
              <li>✓ Risikomanagement & Compliance-Anforderungen</li>
              <li>✓ Change Management & Handlungsempfehlungen</li>
              {totalUploadedFiles > 0 && (
                <li>✓ Analyse und Integration von {totalUploadedFiles} hochgeladenen Dateien</li>
              )}
            </ul>
          </div>

          <Button
            onClick={generateProzessdokumentation}
            disabled={generatingProzessdoku}
            className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {generatingProzessdoku ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generiere Gesamtbericht... (kann bis zu 2 Minuten dauern)
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gesamtbericht generieren
              </>
            )}
          </Button>

          {prozessdokuError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{prozessdokuError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {prozessdokuSpecs.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Generierte Gesamtberichte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prozessdokuSpecs.map((spec, index) => {
              const actualIndex = process.specification_files.findIndex(s => s.created_date === spec.created_date && s.name === spec.name);
              return (
                <Card key={index} className="bg-white">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{spec.name}</p>
                          <p className="text-xs text-slate-500">
                            Erstellt: {new Date(spec.created_date).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSpec(actualIndex)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewSpec(spec)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Ansehen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSpecAsPDF(spec)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Als PDF speichern
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}