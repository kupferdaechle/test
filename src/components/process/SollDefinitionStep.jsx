import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Upload, X, Loader2, FileText, FileSpreadsheet, Image as ImageIcon, Download, AlertCircle, Plus, Trash2, Network, User, Users, Filter, Sparkles, File, CheckCircle, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const SOLL_QUESTIONS = [
  { key: "goals", label: "Welche Ziele sollen mit dem neuen Prozess erreicht werden?" },
  { key: "impact_on_departments", label: "Welche Auswirkungen hat der neue Prozess auf die beteiligten Abteilungen?" },
  { key: "new_technologies", label: "Welche neuen Technologien sollen eingesetzt werden?" },
];

export default function SollDefinitionStep({ data, updateData, processId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [expandedInterface, setExpandedInterface] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const [generatingLastenheft, setGeneratingLastenheft] = useState(false);
  const [lastenheftError, setLastenheftError] = useState(null);
  const [uploadingLastenheftFiles, setUploadingLastenheftFiles] = useState(false);
  const [lastenheftUploadError, setLastenheftUploadError] = useState(null);

  const queryClient = useQueryClient();

  const updateLastenheftFilesMutation = useMutation({
    mutationFn: (lastenheft_uploaded_files) => base44.entities.Process.update(processId, { lastenheft_uploaded_files }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const updateSpecificationsMutation = useMutation({
    mutationFn: (specification_files) => base44.entities.Process.update(processId, { specification_files }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const updateDescription = (value) => {
    updateData({ soll_description: value });
  };

  const updateAnswer = (key, value) => {
    updateData({
      soll_answers: {
        ...data.soll_answers,
        [key]: value
      }
    });
  };

  // Schnittstellen-Verwaltung
  const addInterface = () => {
    const interfaces = data.soll_answers?.new_interfaces || [];
    const newInterface = {
      interface_id: `INT_${Date.now()}`,
      name: "",
      category: "System-zu-System",
      purpose: "",
      description: "",
      direction: "Bidirektional",
      trigger: "API-Aufruf",
      frequency: "",
      criticality: "Mittel",
      error_handling: "",
      data_exchanged_description: "",
      data_schema_reference: "",
      implementation_details: {}
    };
    
    updateData({
      soll_answers: {
        ...data.soll_answers,
        new_interfaces: [...interfaces, newInterface]
      }
    });
    setExpandedInterface(interfaces.length);
  };

  // Neue Funktion zum Kopieren einer Schnittstelle
  const duplicateInterface = (index) => {
    const interfaces = data.soll_answers?.new_interfaces || [];
    const originalInterface = interfaces[index];
    
    // Erstelle eine tiefe Kopie der Schnittstelle
    const copiedInterface = {
      ...originalInterface,
      interface_id: `${originalInterface.interface_id}_copy_${Date.now()}`,
      name: `${originalInterface.name} (Kopie)`,
      implementation_details: { ...originalInterface.implementation_details }
    };
    
    // Füge die kopierte Schnittstelle zur Liste hinzu
    const newInterfaces = [...interfaces, copiedInterface];
    
    updateData({
      soll_answers: {
        ...data.soll_answers,
        new_interfaces: newInterfaces
      }
    });
    
    // Expandiere die neu kopierte Schnittstelle
    setExpandedInterface(newInterfaces.length - 1);
  };

  const updateInterface = (index, field, value) => {
    const interfaces = [...(data.soll_answers?.new_interfaces || [])];
    interfaces[index] = { ...interfaces[index], [field]: value };
    
    if (field === 'category') {
      interfaces[index].implementation_details = {};
    }
    
    updateData({
      soll_answers: {
        ...data.soll_answers,
        new_interfaces: interfaces
      }
    });
  };

  const updateImplementationDetail = (index, field, value) => {
    const interfaces = [...(data.soll_answers?.new_interfaces || [])];
    interfaces[index] = {
      ...interfaces[index],
      implementation_details: {
        ...interfaces[index].implementation_details,
        [field]: value
      }
    };
    
    updateData({
      soll_answers: {
        ...data.soll_answers,
        new_interfaces: interfaces
      }
    });
  };

  const removeInterface = (index) => {
    const interfaces = data.soll_answers?.new_interfaces?.filter((_, i) => i !== index) || [];
    updateData({
      soll_answers: {
        ...data.soll_answers,
        new_interfaces: interfaces
      }
    });
    if (expandedInterface === index) {
      setExpandedInterface(null);
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'System-zu-System': return Network;
      case 'Mensch-zu-System': return User;
      case 'Mensch-zu-Mensch': return Users;
      default: return Network;
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'System-zu-System': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Mensch-zu-System': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Mensch-zu-Mensch': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Lastenheft-Generierung
  const generateLastenheft = async () => {
    setGeneratingLastenheft(true);
    setLastenheftError(null);

    try {
      const uploadedFilesContext = data.lastenheft_uploaded_files && data.lastenheft_uploaded_files.length > 0
        ? `\n\nHINWEIS: Der Nutzer hat ${data.lastenheft_uploaded_files.length} Dateien hochgeladen. Berücksichtige diese Dateien als zusätzliche Informationsquelle.`
        : '';

      const istPersonnelCost = (data.ist_costs?.personnel_hours || 0) * (data.ist_costs?.hourly_rate || 0);
      const istSystemCosts = data.ist_costs?.system_costs || 0;
      const istOtherCosts = data.ist_costs?.other_costs || 0;
      const istTotalMonthlyCost = istPersonnelCost + istSystemCosts + istOtherCosts;
      const istTotalYearlyCost = istTotalMonthlyCost * 12;

      const totalHours = 
        (data.effort_details?.conception_hours || 0) +
        (data.effort_details?.development_hours || 0) +
        (data.effort_details?.testing_hours || 0) +
        (data.effort_details?.deployment_hours || 0);
      
      const hourlyRate = data.effort_details?.hourly_rate_at_estimation || 0;
      const totalCost = totalHours * hourlyRate;

      const totalSavingsPerYear = 
        (data.roi_data?.efficiency_savings || 0) +
        (data.roi_data?.error_reduction_savings || 0) +
        (data.roi_data?.personnel_savings || 0) +
        (data.roi_data?.additional_revenue || 0);
      
      const investment = data.roi_data?.investment_cost || totalCost || 0;
      const paybackMonths = totalSavingsPerYear > 0 ? (investment / (totalSavingsPerYear / 12)) : 0;

      const prompt = `
Du bist ein Experte für die Erstellung von Lastenheften nach DIN 69901-5.

Erstelle ein professionelles, detailliertes Lastenheft für folgendes Digitalisierungsprojekt:

**PROZESSNAME:** ${data.process_name}

**AUFTRAGGEBER:** ${data.customer_id || 'Nicht angegeben'}

**IST-ZUSTAND:**
- Prozessschritte: ${data.ist_answers?.process_steps || 'Nicht dokumentiert'}
- Verantwortliche: ${data.ist_answers?.responsible_person || 'Nicht angegeben'}
- Beteiligte Abteilungen: ${data.ist_answers?.involved_departments || 'Nicht angegeben'}
- Aktuelle Systeme: ${data.ist_answers?.current_systems || 'Nicht angegeben'}
- Schnittstellen: ${data.ist_answers?.interfaces?.map(i => `${i.system_name} (${i.interface_type})`).join(', ') || 'Keine'}
- Verarbeitete Daten: ${data.ist_answers?.data_processed || 'Nicht dokumentiert'}
- Engpässe: ${data.ist_answers?.bottlenecks || 'Nicht dokumentiert'}
- Manuelle Tätigkeiten: ${data.ist_answers?.manual_tasks || 'Nicht dokumentiert'}
- Regulatorische Anforderungen: ${data.ist_answers?.regulatory_requirements || 'Keine'}
- Technische Herausforderungen: ${data.ist_answers?.technical_challenges || 'Keine'}
- KPIs: ${data.ist_answers?.kpis || 'Nicht definiert'}

**SOLL-ZUSTAND:**
${data.soll_description || 'Nicht beschrieben'}

- Ziele: ${data.soll_answers?.goals || 'Nicht definiert'}
- Auswirkungen auf Abteilungen: ${data.soll_answers?.impact_on_departments || 'Nicht dokumentiert'}
- Neue Technologien: ${data.soll_answers?.new_technologies || 'Nicht definiert'}

**NEUE SCHNITTSTELLEN:**
${data.soll_answers?.new_interfaces?.map(i => `
- ${i.name} (${i.category})
  Zweck: ${i.purpose}
  Beschreibung: ${i.description}
  Richtung: ${i.direction}
  Auslöser: ${i.trigger}
  Häufigkeit: ${i.frequency}
  Kritikalität: ${i.criticality}
`).join('\n') || 'Keine neuen Schnittstellen definiert'}

**AUFWANDSSCHÄTZUNG:**
- Konzeption: ${data.effort_details?.conception_hours || 0}h
- Entwicklung: ${data.effort_details?.development_hours || 0}h
- Test: ${data.effort_details?.testing_hours || 0}h
- Einführung: ${data.effort_details?.deployment_hours || 0}h
- Geschätzte Gesamtkosten: ${data.effort_details?.estimated_total_cost || 0}€

**IST-KOSTEN (monatlich):**
- Personalstunden: ${data.ist_costs?.personnel_hours || 0}h à ${data.ist_costs?.hourly_rate || 0}€
- Systemkosten: ${data.ist_costs?.system_costs || 0}€
- Sonstige Kosten: ${data.ist_costs?.other_costs || 0}€

**ROI-ERWARTUNGEN:**
- Effizienzsteigerung: ${data.roi_data?.efficiency_savings || 0}€/Jahr
- Fehlerreduzierung: ${data.roi_data?.error_reduction_savings || 0}€/Jahr
- Personaleinsparungen: ${data.roi_data?.personnel_savings || 0}€/Jahr
- Zusätzliche Einnahmen: ${data.roi_data?.additional_revenue || 0}€/Jahr
- Investitionskosten: ${data.roi_data?.investment_cost || 0}€
- Amortisationszeit: ${data.roi_data?.payback_months || 0} Monate
${uploadedFilesContext}

Erstelle ein vollständiges Lastenheft mit folgender Struktur:

# LASTENHEFT

## 1. AUSGANGSLAGE UND ZIELSETZUNG
### 1.1 Ausgangslage
### 1.2 Zielsetzung des Projekts
### 1.3 Nicht-Ziele

## 2. PRODUKTEINSATZ
### 2.1 Anwendungsbereiche
### 2.2 Zielgruppen
### 2.3 Betriebsbedingungen

## 3. FUNKTIONALE ANFORDERUNGEN
### 3.1 Muss-Kriterien
### 3.2 Soll-Kriterien
### 3.3 Kann-Kriterien

## 4. NICHT-FUNKTIONALE ANFORDERUNGEN
### 4.1 Performance
### 4.2 Skalierbarkeit
### 4.3 Verfügbarkeit
### 4.4 Sicherheit
### 4.5 Benutzerfreundlichkeit
### 4.6 Wartbarkeit

## 5. SCHNITTSTELLEN
### 5.1 Benutzerschnittstellen
### 5.2 Systemschnittstellen
### 5.3 Datenschnittstellen

## 6. DATENMODELL
### 6.1 Entities
### 6.2 Datenflüsse
### 6.3 Datensicherung

## 7. QUALITÄTSANFORDERUNGEN
### 7.1 Testanforderungen
### 7.2 Dokumentation
### 7.3 Schulungsbedarf

## 8. TECHNISCHE RAHMENBEDINGUNGEN
### 8.1 Systemarchitektur
### 8.2 Technologie-Stack
### 8.3 Infrastruktur

## 9. RECHTLICHE UND REGULATORISCHE ANFORDERUNGEN
### 9.1 Datenschutz (DSGVO)
### 9.2 Compliance
### 9.3 Vertragsrechtliches

## 10. PROJEKTORGANISATION
### 10.1 Stakeholder
### 10.2 Rollen und Verantwortlichkeiten
### 10.3 Kommunikationswege

## 11. KOSTEN UND WIRTSCHAFTLICHKEIT
### 11.1 Investitionskosten
### 11.2 Betriebskosten
### 11.3 Einsparungspotenziale
### 11.4 ROI-Berechnung

## 12. ZEITPLAN UND MEILENSTEINE
### 12.1 Projektphasen
### 12.2 Meilensteine
### 12.3 Abhängigkeiten

## 13. RISIKEN
### 13.1 Risikoidentifikation
### 13.2 Risikobewertung
### 13.3 Risikomitigation

## 14. ABNAHMEKRITERIEN
### 14.1 Funktionale Abnahme
### 14.2 Qualitative Abnahme
### 14.3 Abnahmeprozess

Sei detailliert, präzise und professionell. Nutze die vorhandenen Informationen optimal und ergänze wo nötig sinnvolle Standards und Best Practices.
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        file_urls: data.lastenheft_uploaded_files?.map(f => f.url) || []
      });

      const existingSpecs = data.specification_files || [];
      const newSpec = {
        name: `Lastenheft_${data.process_name}_${new Date().toISOString().split('T')[0]}`,
        type: "lastenheft",
        content: result,
        created_date: new Date().toISOString(),
        file_url: null
      };

      await updateSpecificationsMutation.mutateAsync([...existingSpecs, newSpec]);

    } catch (error) {
      console.error('Fehler beim Generieren des Lastenhefts:', error);
      setLastenheftError('Fehler beim Generieren. Bitte versuchen Sie es erneut.');
    } finally {
      setGeneratingLastenheft(false);
    }
  };

  const generateLastenheftHTML = (spec, processName) => {
    let htmlContent = spec.content;
    
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
  <title>${spec.name}</title>
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
      box-shadow: 0 4 px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 4px solid #9333ea;
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
      padding: 30px;
      border-radius: 8px;
      margin: -40px -40px 50px -40px;
    }
    
    .header h1 {
      color: #7e22ce;
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
      color: #7e22ce;
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
      border-bottom: 3px solid #9333ea;
      page-break-after: avoid;
    }
    
    h2 {
      color: #7e22ce;
      font-size: 22px;
      font-weight: 600;
      margin-top: 40px;
      margin-bottom: 20px;
      padding-left: 15px;
      border-left: 5px solid #9333ea;
      background: #faf5ff;
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
      border-left: 3px solid #a855f7;
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
      color: #9333ea;
      font-weight: bold;
    }
    
    ol li::marker {
      color: #9333ea;
      font-weight: bold;
    }
    
    strong {
      color: #7e22ce;
      font-weight: 600;
    }
    
    em {
      color: #64748b;
      font-style: italic;
    }
    
    code {
      background: #faf5ff;
      color: #7e22ce;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      border: 1px solid #e9d5ff;
    }
    
    hr.divider-major {
      border: none;
      border-top: 4px double #9333ea;
      margin: 50px 0;
      opacity: 0.5;
    }
    
    hr.divider-minor {
      border: none;
      border-top: 1px solid #cbd5e1;
      margin: 30px 0;
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
      background: #9333ea;
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
      background: #faf5ff;
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
      <h1>📋 LASTENHEFT</h1>
      <div class="subtitle">
        <strong>${processName}</strong>
        <div style="margin-top: 10px;">
          Erstellt am: ${new Date(spec.created_date).toLocaleDateString('de-DE', {
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
      <div>Dieses Lastenheft wurde automatisch nach DIN 69901-5 generiert</div>
    </div>
  </div>
</body>
</html>`;
  };

  const downloadLastenheftAsPDF = async (spec, processName) => {
    try {
      const formattedHtml = generateLastenheftHTML(spec, processName);
      
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
      
    } catch (error) {
      console.error('Fehler beim Erstellen des PDFs:', error);
      alert('Fehler beim Erstellen des PDFs. Bitte versuchen Sie es erneut.');
    }
  };

  const handleLastenheftFilesUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif'
    ];
    
    const invalidFiles = selectedFiles.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setLastenheftUploadError('Bitte wählen Sie nur PDF, Word, Excel oder Bild-Dateien aus.');
      event.target.value = '';
      return;
    }

    const maxFileSize = 10 * 1024 * 1024;
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      setLastenheftUploadError(`Einige Dateien sind zu groß (max. 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      event.target.value = '';
      return;
    }

    setUploadingLastenheftFiles(true);
    setLastenheftUploadError(null);

    try {
      const existingFiles = data.lastenheft_uploaded_files || [];
      const failedUploads = [];

      for (const file of selectedFiles) {
        try {
          const result = await base44.integrations.Core.UploadFile({ file });
          
          const fileData = {
            url: result.file_url,
            name: file.name,
            type: file.type,
            size: file.size,
            uploaded_date: new Date().toISOString()
          };

          existingFiles.push(fileData);
        } catch (fileError) {
          console.error(`Fehler beim Hochladen von ${file.name}:`, fileError);
          failedUploads.push(file.name);
        }
      }

      await updateLastenheftFilesMutation.mutateAsync(existingFiles);

      if (failedUploads.length > 0) {
        setLastenheftUploadError(`${failedUploads.length} Datei(en) konnten nicht hochgeladen werden: ${failedUploads.join(', ')}`);
      }
    } catch (error) {
      console.error('Fehler beim Hochladen:', error);
      setLastenheftUploadError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setUploadingLastenheftFiles(false);
      event.target.value = '';
    }
  };

  const removeLastenheftFile = async (indexToRemove) => {
    if (data.lastenheft_uploaded_files) {
      const files = data.lastenheft_uploaded_files.filter((_, i) => i !== indexToRemove);
      await updateLastenheftFilesMutation.mutateAsync(files);
    }
    setLastenheftUploadError(null);
  };

  const deleteLastenheft = async (indexToDelete) => {
    const specs = data.specification_files.filter((_, i) => i !== indexToDelete);
    await updateSpecificationsMutation.mutateAsync(specs);
  };

  // Datei-Verwaltung
  const getFileType = (file) => {
    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';
    if (type === 'text/csv' || type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'csv';
    return 'unknown';
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'image': return ImageIcon;
      case 'pdf': return FileText;
      case 'csv': return FileSpreadsheet;
      default: return FileText;
    }
  };

  const getFileColor = (fileType) => {
    switch(fileType) {
      case 'image': return 'text-blue-600 bg-blue-50';
      case 'pdf': return 'text-red-600 bg-red-50';
      case 'csv': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getFileTypeLabel = (fileType) => {
    switch(fileType) {
      case 'image': return 'Bild';
      case 'pdf': return 'PDF';
      case 'csv': return 'Excel/CSV';
      default: return 'Datei';
    }
  };

  const getFilteredAndSortedFiles = () => {
    let files = data.soll_answers?.soll_files || [];
    
    if (filterType !== "all") {
      files = files.filter(file => file.type === filterType);
    }
    
    if (sortBy === "date") {
      files = [...files].sort((a, b) => new Date(b.uploaded_date || 0).getTime() - new Date(a.uploaded_date || 0).getTime());
    } else if (sortBy === "name") {
      files = [...files].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "type") {
      files = [...files].sort((a, b) => a.type.localeCompare(b.type));
    }
    
    return files;
  };

  const handleFilesUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const invalidFiles = selectedFiles.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setUploadError('Bitte wählen Sie nur Bilder (PNG, JPG, GIF), PDF- oder CSV-Dateien aus.');
      event.target.value = '';
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      setUploadError(`Einige Dateien sind zu groß. Maximale Dateigröße: 5MB. Große Dateien: ${oversizedFiles.map(f => f.name).join(', ')}`);
      event.target.value = '';
      return;
    }

    const existingFilesCount = data.soll_answers?.soll_files?.length || 0;
    if (existingFilesCount + selectedFiles.length > 20) {
      setUploadError(`Maximale Anzahl von 20 Dateien erreicht. Sie haben bereits ${existingFilesCount} Dateien hochgeladen.`);
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const files = data.soll_answers?.soll_files || [];
      const totalFiles = selectedFiles.length;
      const failedUploads = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          const result = await base44.integrations.Core.UploadFile({ file });
          
          const fileData = {
            url: result.file_url,
            name: file.name,
            type: getFileType(file),
            uploaded_date: new Date().toISOString()
          };

          files.push(fileData);
          setUploadProgress(((i + 1) / totalFiles) * 100);
        } catch (fileError) {
          console.error(`Fehler beim Hochladen von ${file.name}:`, fileError);
          failedUploads.push(file.name);
        }
      }

      updateData({
        soll_answers: {
          ...data.soll_answers,
          soll_files: files
        }
      });

      if (failedUploads.length > 0) {
        setUploadError(`${failedUploads.length} Datei(en) konnte(n) nicht hochgeladen werden: ${failedUploads.join(', ')}.`);
      }
    } catch (error) {
      console.error('Fehler beim Hochladen der Dateien:', error);
      setUploadError('Fehler beim Hochladen. Bitte versuchen Sie es mit kleineren Dateien oder weniger Dateien gleichzeitig.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const removeFile = (indexToRemove) => {
    const files = data.soll_answers?.soll_files?.filter((_, i) => i !== indexToRemove) || [];
    updateData({
      soll_answers: {
        ...data.soll_answers,
        soll_files: files
      }
    });
    setUploadError(null);
  };

  const totalFiles = data.soll_answers?.soll_files?.length || 0;
  const showListView = totalFiles > 3;
  const filteredFiles = getFilteredAndSortedFiles();

  const renderSystemToSystemFields = (interface_item, index) => (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Quellsystem</Label>
        <Input
          value={interface_item.implementation_details?.system_source || ""}
          onChange={(e) => updateImplementationDetail(index, "system_source", e.target.value)}
          placeholder="z.B. SAP ERP"
        />
      </div>
      <div className="space-y-2">
        <Label>Zielsystem</Label>
        <Input
          value={interface_item.implementation_details?.system_target || ""}
          onChange={(e) => updateImplementationDetail(index, "system_target", e.target.value)}
          placeholder="z.B. CRM System"
        />
      </div>
      <div className="space-y-2">
        <Label>Integrationsmethode</Label>
        <Select
          value={interface_item.implementation_details?.integration_method || ""}
          onValueChange={(value) => updateImplementationDetail(index, "integration_method", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Methode auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="REST-API">REST-API</SelectItem>
            <SelectItem value="SOAP-API">SOAP-API</SelectItem>
            <SelectItem value="Datei-Transfer (SFTP/Cloud)">Datei-Transfer (SFTP/Cloud)</SelectItem>
            <SelectItem value="Datenbank-Direktzugriff">Datenbank-Direktzugriff</SelectItem>
            <SelectItem value="Nachrichtenwarteschlange">Nachrichtenwarteschlange</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>API-Endpunkt (optional)</Label>
        <Input
          value={interface_item.implementation_details?.api_endpoint || ""}
          onChange={(e) => updateImplementationDetail(index, "api_endpoint", e.target.value)}
          placeholder="https://api.example.com/endpoint"
        />
      </div>
      <div className="space-y-2">
        <Label>HTTP-Methode (für REST-API)</Label>
        <Select
          value={interface_item.implementation_details?.http_method || ""}
          onValueChange={(value) => updateImplementationDetail(index, "http_method", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Methode auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Datenformat</Label>
        <Select
          value={interface_item.implementation_details?.data_format || ""}
          onValueChange={(value) => updateImplementationDetail(index, "data_format", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Format auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="JSON">JSON</SelectItem>
            <SelectItem value="XML">XML</SelectItem>
            <SelectItem value="CSV">CSV</SelectItem>
            <SelectItem value="EDI">EDI</SelectItem>
            <SelectItem value="Custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Authentifizierungstyp</Label>
        <Select
          value={interface_item.implementation_details?.authentication_type || ""}
          onValueChange={(value) => updateImplementationDetail(index, "authentication_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Typ auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="API-Key">API-Key</SelectItem>
            <SelectItem value="OAuth2">OAuth2</SelectItem>
            <SelectItem value="Basic-Auth">Basic-Auth</SelectItem>
            <SelectItem value="Token-basiert">Token-basiert</SelectItem>
            <SelectItem value="Zertifikat">Zertifikat</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2 space-y-2">
        <Label>Sicherheitshinweise</Label>
        <Textarea
          value={interface_item.implementation_details?.security_notes || ""}
          onChange={(e) => updateImplementationDetail(index, "security_notes", e.target.value)}
          placeholder="Verschlüsselung, Zugriffskontrolle, etc."
          className="min-h-20"
        />
      </div>
    </div>
  );

  const renderHumanToSystemFields = (interface_item, index) => (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Benutzerrolle</Label>
        <Input
          value={interface_item.implementation_details?.human_role || ""}
          onChange={(e) => updateImplementationDetail(index, "human_role", e.target.value)}
          placeholder="z.B. Sachbearbeiter, Manager"
        />
      </div>
      <div className="space-y-2">
        <Label>Systemkomponente</Label>
        <Input
          value={interface_item.implementation_details?.system_component || ""}
          onChange={(e) => updateImplementationDetail(index, "system_component", e.target.value)}
          placeholder="z.b. Webportal, Dashboard"
        />
      </div>
      <div className="space-y-2">
        <Label>Interface-Medium</Label>
        <Select
          value={interface_item.implementation_details?.interface_medium || ""}
          onValueChange={(value) => updateImplementationDetail(index, "interface_medium", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Medium auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Web-UI">Web-UI</SelectItem>
            <SelectItem value="Desktop-App">Desktop-App</SelectItem>
            <SelectItem value="Mobile-App">Mobile-App</SelectItem>
            <SelectItem value="Email">Email</SelectItem>
            <SelectItem value="Telefon">Telefon</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Interaktionstyp</Label>
        <Select
          value={interface_item.implementation_details?.interaction_type || ""}
          onValueChange={(value) => updateImplementationDetail(index, "interaction_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Typ auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Dateneingabe">Dateneingabe</SelectItem>
            <SelectItem value="Datenabruf">Datenabruf</SelectItem>
            <SelectItem value="Genehmigung">Genehmigung</SelectItem>
            <SelectItem value="Bearbeitung">Bearbeitung</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2 space-y-2">
        <Label>Erforderliche Eingabefelder</Label>
        <Textarea
          value={interface_item.implementation_details?.input_fields_required || ""}
          onChange={(e) => updateImplementationDetail(index, "input_fields_required", e.target.value)}
          placeholder="z.B. Name, Email, Adresse, Bestellnummer"
          className="min-h-20"
        />
      </div>
      <div className="space-y-2">
        <Label>Ausgabe-Anzeigetyp</Label>
        <Input
          value={interface_item.implementation_details?.output_display_type || ""}
          onChange={(e) => updateImplementationDetail(index, "output_display_type", e.target.value)}
          placeholder="z.B. Tabelle, Diagramm, Liste"
        />
      </div>
      <div className="space-y-2">
        <Label>Benachrichtigungstyp</Label>
        <Input
          value={interface_item.implementation_details?.notification_type || ""}
          onChange={(e) => updateImplementationDetail(index, "notification_type", e.target.value)}
          placeholder="z.b. Email, Push, In-App"
        />
      </div>
      <div className="md:col-span-2 space-y-2">
        <Label>Validierungsregeln</Label>
        <Textarea
          value={interface_item.implementation_details?.validation_rules || ""}
          onChange={(e) => updateImplementationDetail(index, "validation_rules", e.target.value)}
          placeholder="Beschreiben Sie die Validierungsregeln für Eingaben"
          className="min-h-20"
        />
      </div>
    </div>
  );

  const renderHumanToHumanFields = (interface_item, index) => (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Teilnehmer A Rolle</Label>
        <Input
          value={interface_item.implementation_details?.participant_a_role || ""}
          onChange={(e) => updateImplementationDetail(index, "participant_a_role", e.target.value)}
          placeholder="z.B. Projektleiter"
        />
      </div>
      <div className="space-y-2">
        <Label>Teilnehmer B Rolle</Label>
        <Input
          value={interface_item.implementation_details?.participant_b_role || ""}
          onChange={(e) => updateImplementationDetail(index, "participant_b_role", e.target.value)}
          placeholder="z.g. Abteilungsleiter"
        />
      </div>
      <div className="space-y-2">
        <Label>Kommunikationskanal</Label>
        <Select
          value={interface_item.implementation_details?.communication_channel || ""}
          onValueChange={(value) => updateImplementationDetail(index, "communication_channel", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Kanal auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Email">Email</SelectItem>
            <SelectItem value="Chat">Chat</SelectItem>
            <SelectItem value="Meeting">Meeting</SelectItem>
            <SelectItem value="Telefon">Telefon</SelectItem>
            <SelectItem value="Dokumenten-Austausch">Dokumenten-Austausch</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Dokumentationsmethode</Label>
        <Input
          value={interface_item.implementation_details?.documentation_method || ""}
          onChange={(e) => updateImplementationDetail(index, "documentation_method", e.target.value)}
          placeholder="z.B. Protokoll, Email-Archiv"
        />
      </div>
      <div className="md:col-span-2 space-y-2">
        <Label>Geteilte Informationen</Label>
        <Textarea
          value={interface_item.implementation_details?.shared_information_description || ""}
          onChange={(e) => updateImplementationDetail(index, "shared_information_description", e.target.value)}
          placeholder="Beschreiben Sie die ausgetauschten Informationen"
          className="min-h-20"
        />
      </div>
      <div className="md:col-span-2 space-y-2">
        <Label>Erwartetes Ergebnis</Label>
        <Textarea
          value={interface_item.implementation_details?.expected_outcome || ""}
          onChange={(e) => updateImplementationDetail(index, "expected_outcome", e.target.value)}
          placeholder="Was soll durch diese Kommunikation erreicht werden?"
          className="min-h-20"
        />
      </div>
    </div>
  );

  const lastenheftSpecs = data.specification_files?.filter(s => s.type === "lastenheft") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Target className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Soll-Zustands-Definition</h3>
          <p className="text-sm text-slate-600">Beschreibung des optimierten Prozesses</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="interfaces">Schnittstellen</TabsTrigger>
          <TabsTrigger value="files">Dateien</TabsTrigger>
          <TabsTrigger value="lastenheft">Lastenheft</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="space-y-2">
            <Label>Freitextbeschreibung des Soll-Zustands</Label>
            <Textarea
              value={data.soll_description || ""}
              onChange={(e) => updateDescription(e.target.value)}
              placeholder="Beschreiben Sie detailliert, wie der optimierte Prozess aussehen soll..."
              className="min-h-32"
            />
          </div>

          {SOLL_QUESTIONS.map((question) => (
            <div key={question.key} className="space-y-2">
              <Label>{question.label}</Label>
              <Textarea
                value={data.soll_answers?.[question.key] || ""}
                onChange={(e) => updateAnswer(question.key, e.target.value)}
                placeholder="Ihre Antwort..."
                className="min-h-24"
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="interfaces" className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Erweiterte Schnittstellendefinition:</strong> Erfassen Sie hier detailliert alle Schnittstellen für den Soll-Zustand. 
              Diese Informationen ermöglichen eine vollautomatische App-Generierung.
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Geplante Schnittstellen</Label>
            <Button onClick={addInterface} className="gap-2">
              <Plus className="w-4 h-4" />
              Schnittstelle hinzufügen
            </Button>
          </div>

          {(!data.soll_answers?.new_interfaces || data.soll_answers.new_interfaces.length === 0) && (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <Network className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">Es sind keine Schnittstellen hinterlegt.</p>
                <Button onClick={addInterface} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Erste Schnittstelle hinzufügen
                </Button>
              </CardContent>
            </Card>
          )}

          {data.soll_answers?.new_interfaces?.map((interface_item, index) => {
            const CategoryIcon = getCategoryIcon(interface_item.category);
            const isExpanded = expandedInterface === index;
            
            return (
              <Card key={index} className="border-2">
                <CardHeader className="cursor-pointer" onClick={() => setExpandedInterface(isExpanded ? null : index)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(interface_item.category)}`}>
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {interface_item.name || `Schnittstelle ${index + 1}`}
                          <span className="text-xs font-normal text-slate-500">({interface_item.interface_id})</span>
                        </CardTitle>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(interface_item.category)}`}>
                            {interface_item.category}
                          </span>
                          {interface_item.criticality && (
                            <span className="text-xs px-2 py-0.5 rounded border bg-slate-50 text-slate-600">
                              {interface_item.criticality}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateInterface(index);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Schnittstelle kopieren"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeInterface(index);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-6 pt-0">
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-semibold text-sm text-slate-700">Allgemeine Informationen</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Schnittstellen-ID *</Label>
                          <Input
                            value={interface_item.interface_id}
                            onChange={(e) => updateInterface(index, "interface_id", e.target.value)}
                            placeholder="z.B. INT_KUNDENDATEN_001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={interface_item.name}
                            onChange={(e) => updateInterface(index, "name", e.target.value)}
                            placeholder="z.B. Kundendaten-Synchronisation"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Kategorie *</Label>
                          <Select
                            value={interface_item.category}
                            onValueChange={(value) => updateInterface(index, "category", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="System-zu-System">System-zu-System</SelectItem>
                              <SelectItem value="Mensch-zu-System">Mensch-zu-System</SelectItem>
                              <SelectItem value="Mensch-zu-Mensch">Mensch-zu-Mensch</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Zweck</Label>
                          <Input
                            value={interface_item.purpose}
                            onChange={(e) => updateInterface(index, "purpose", e.target.value)}
                            placeholder="z.B. Datenabgleich, Dateneingabe"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Beschreibung</Label>
                          <Textarea
                            value={interface_item.description}
                            onChange={(e) => updateInterface(index, "description", e.target.value)}
                            placeholder="Detaillierte Beschreibung der Schnittstellenfunktionalität..."
                            className="min-h-24"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Richtung</Label>
                          <Select
                            value={interface_item.direction}
                            onValueChange={(value) => updateInterface(index, "direction", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Eingehend">Eingehend</SelectItem>
                              <SelectItem value="Ausgehend">Ausgehend</SelectItem>
                              <SelectItem value="Bidirektional">Bidirektional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Auslöser</Label>
                          <Select
                            value={interface_item.trigger}
                            onValueChange={(value) => updateInterface(index, "trigger", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manuell">Manuell</SelectItem>
                              <SelectItem value="Zeitgesteuert">Zeitgesteuert</SelectItem>
                              <SelectItem value="Ereignisbasiert">Ereignisbasiert</SelectItem>
                              <SelectItem value="API-Aufruf">API-Aufruf</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Häufigkeit</Label>
                          <Input
                            value={interface_item.frequency}
                            onChange={(e) => updateInterface(index, "frequency", e.target.value)}
                            placeholder="z.b. Stündlich, Täglich, Echtzeit"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Kritikalität</Label>
                          <Select
                            value={interface_item.criticality}
                            onValueChange={(value) => updateInterface(index, "criticality", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Niedrig">Niedrig</SelectItem>
                              <SelectItem value="Mittel">Mittel</SelectItem>
                              <SelectItem value="Hoch">Hoch</SelectItem>
                              <SelectItem value="Sehr hoch">Sehr hoch</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Fehlerbehandlung</Label>
                          <Textarea
                            value={interface_item.error_handling}
                            onChange={(e) => updateInterface(index, "error_handling", e.target.value)}
                            placeholder="z.b. Automatischer Retry, Benachrichtigung an Admin"
                            className="min-h-20"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Beschreibung der ausgetauschten Daten</Label>
                          <Textarea
                            value={interface_item.data_exchanged_description}
                            onChange={(e) => updateInterface(index, "data_exchanged_description", e.target.value)}
                            placeholder="Beschreiben Sie, welche Daten ausgetauscht werden..."
                            className="min-h-20"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Daten-Schema Referenz (optional)</Label>
                          <Input
                            value={interface_item.data_schema_reference}
                            onChange={(e) => updateInterface(index, "data_schema_reference", e.target.value)}
                            placeholder="z.B. Kundenstammdaten_V1.json"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-sm text-blue-900">
                        Implementierungsdetails: {interface_item.category}
                      </h4>
                      {interface_item.category === 'System-zu-System' && renderSystemToSystemFields(interface_item, index)}
                      {interface_item.category === 'Mensch-zu-System' && renderHumanToSystemFields(interface_item, index)}
                      {interface_item.category === 'Mensch-zu-Mensch' && renderHumanToHumanFields(interface_item, index)}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <Label>Dateien zum Soll-Zustand</Label>
            {totalFiles > 0 && (
              <span className="text-sm text-slate-500">({totalFiles} {totalFiles === 1 ? 'Datei' : 'Dateien'})</span>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="relative"
                onClick={() => document.getElementById('soll-file-upload')?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird hochgeladen... {uploadProgress.toFixed(0)}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Dateien hochladen
                  </>
                )}
              </Button>
              <input
                id="soll-file-upload"
                type="file"
                accept="image/*,.pdf,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                onChange={handleFilesUpload}
                className="hidden"
              />
              <span className="text-sm text-slate-500">
                Bilder, PDF oder CSV/Excel (max. 5MB pro Datei, max. 20 Dateien)
              </span>
            </div>

            {uploadError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {uploading && uploadProgress > 0 && (
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {totalFiles > 0 && (
            showListView ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <Label className="text-sm shrink-0">Filter:</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="Alle Typen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Typen</SelectItem>
                        <SelectItem value="image">Bilder</SelectItem>
                        <SelectItem value="pdf">PDFs</SelectItem>
                        <SelectItem value="csv">Excel/CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm shrink-0">Sortieren:</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="Nach Datum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Nach Datum</SelectItem>
                        <SelectItem value="name">Nach Name</SelectItem>
                        <SelectItem value="type">Nach Typ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="ml-auto text-sm text-slate-600">
                    {filteredFiles.length} von {totalFiles} Dateien
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    const colorClass = getFileColor(file.type);
                    const originalIndex = data.soll_answers?.soll_files?.indexOf(file);

                    return (
                      <Card key={file.url} className="hover:shadow-md transition-shadow">
                        <div className="p-4 flex items-center gap-4">
                          <div 
                            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 ${colorClass}`}
                            onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`, '_blank')}
                          >
                            <FileIcon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{file.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500">
                                {getFileTypeLabel(file.type)}
                              </span>
                              {file.uploaded_date && (
                                <>
                                  <span className="text-xs text-slate-400">•</span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(file.uploaded_date).toLocaleDateString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = file.url;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(originalIndex)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {data.soll_answers.soll_files.map((file, index) => {
                  const FileIcon = getFileIcon(file.type);
                  const colorClass = getFileColor(file.type);
                  
                  return (
                    <Card key={index} className="relative group hover:shadow-md transition-shadow">
                      {file.type === 'image' ? (
                        <div className="relative">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-32 object-cover rounded-t-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className={`p-4 rounded-t-lg ${colorClass}`}>
                          <div className="flex items-center justify-between">
                            <FileIcon className="w-8 h-8" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFile(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="p-3 border-t">
                        <p className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-slate-500 uppercase">
                            {getFileTypeLabel(file.type)}
                          </span>
                          <a
                            href={file.url}
                            download
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}
        </TabsContent>

        <TabsContent value="lastenheft" className="space-y-6">
          <Alert className="bg-purple-50 border-purple-200">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              <strong>KI-Unterstützte Lastenheft-Erstellung:</strong> Laden Sie optional zusätzliche Dateien hoch (PDFs, Word, Excel, Bilder), 
              die bei der Lastenheft-Generierung berücksichtigt werden sollen.
            </AlertDescription>
          </Alert>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Zusätzliche Dateien hochladen (optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingLastenheftFiles}
                  className="relative bg-white"
                  onClick={() => document.getElementById('lastenheft-file-upload')?.click()}
                >
                  {uploadingLastenheftFiles ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Dateien auswählen
                    </>
                  )}
                </Button>
                <input
                  id="lastenheft-file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
                  multiple
                  onChange={handleLastenheftFilesUpload}
                  className="hidden"
                />
                <span className="text-sm text-slate-600">
                  PDF, Word, Excel oder Bilder (max. 10MB pro Datei)
                </span>
              </div>

              {lastenheftUploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{lastenheftUploadError}</AlertDescription>
                </Alert>
              )}

              {data.lastenheft_uploaded_files && data.lastenheft_uploaded_files.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium text-slate-700">Hochgeladene Dateien:</p>
                  <div className="space-y-2">
                    {data.lastenheft_uploaded_files.map((file, index) => (
                      <Card key={index} className="relative group hover:shadow-md transition-shadow bg-white">
                        <div className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                              <File className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploaded_date).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLastenheftFile(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Lastenheft generieren
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Erstellen Sie ein professionelles Lastenheft nach DIN 69901-5 basierend auf allen erfassten Prozessdaten und optional hochgeladenen Dateien.
              </p>

              <Button
                onClick={generateLastenheft}
                disabled={generatingLastenheft}
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {generatingLastenheft ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generiere Lastenheft...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Lastenheft generieren
                  </>
                )}
              </Button>

              {lastenheftError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{lastenheftError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {lastenheftSpecs.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Generierte Lastenhefte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lastenheftSpecs.map((spec, index) => {
                  const actualIndex = data.specification_files.indexOf(spec);
                  return (
                    <Card key={index} className="bg-white">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-purple-600" />
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
                            onClick={() => deleteLastenheft(actualIndex)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadLastenheftAsPDF(spec, data.process_name)}
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Als PDF herunterladen
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}