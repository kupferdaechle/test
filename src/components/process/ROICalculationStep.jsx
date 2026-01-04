import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertCircle, Calendar, Sparkles, Loader2, CheckCircle, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from "@/components/utils";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ROICalculationStep({ data, updateData }) {
  const [generatingCharts, setGeneratingCharts] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);

  const updateROIField = (key, value) => {
    updateData({
      roi_data: {
        ...data.roi_data,
        [key]: parseFloat(value) || 0
      }
    });
  };

  const calculatePaybackMonths = () => {
    const roi = data.roi_data || {};
    const totalSavingsPerYear = 
      (roi.efficiency_savings || 0) + 
      (roi.error_reduction_savings || 0) + 
      (roi.personnel_savings || 0) + 
      (roi.additional_revenue || 0);
    
    const investment = roi.investment_cost || 0;
    
    if (totalSavingsPerYear === 0) return 0;
    
    const monthlySavings = totalSavingsPerYear / 12;
    const paybackMonths = investment / monthlySavings;
    
    return paybackMonths;
  };

  const generateCharts = async () => {
    setGeneratingCharts(true);
    setError(null);

    try {
      const istPersonnelCost = (data.ist_costs?.personnel_hours || 0) * (data.ist_costs?.hourly_rate || 0);
      const istTotalMonthlyCost = istPersonnelCost + (data.ist_costs?.system_costs || 0) + (data.ist_costs?.other_costs || 0);
      
      const totalSavingsPerYear = 
        (data.roi_data?.efficiency_savings || 0) + 
        (data.roi_data?.error_reduction_savings || 0) + 
        (data.roi_data?.personnel_savings || 0) + 
        (data.roi_data?.additional_revenue || 0);

      const estimatedMonthlySavings = totalSavingsPerYear / 12;
      const estimatedSollMonthlyCost = Math.max(0, istTotalMonthlyCost - estimatedMonthlySavings);

      const prompt = `
Du bist ein Experte für Datenvisualisierung und Business Intelligence.

Analysiere folgende Prozessdaten und erstelle strukturierte Diagramm-Daten:

**IST-KOSTEN (monatlich):**
- Personalkosten: ${istPersonnelCost.toFixed(2)}€
- Systemkosten: ${data.ist_costs?.system_costs || 0}€
- Sonstige Kosten: ${data.ist_costs?.other_costs || 0}€
- GESAMT: ${istTotalMonthlyCost.toFixed(2)}€

**AUFWAND (Stunden):**
- Konzeption: ${data.effort_details?.conception_hours || 0}h
- Entwicklung: ${data.effort_details?.development_hours || 0}h
- Test: ${data.effort_details?.testing_hours || 0}h
- Einführung: ${data.effort_details?.deployment_hours || 0}h

**ROI-DATEN:**
- Effizienzsteigerung: ${data.roi_data?.efficiency_savings || 0}€/Jahr
- Fehlerreduzierung: ${data.roi_data?.error_reduction_savings || 0}€/Jahr
- Personaleinsparungen: ${data.roi_data?.personnel_savings || 0}€/Jahr
- Zusätzliche Einnahmen: ${data.roi_data?.additional_revenue || 0}€/Jahr
- Investition: ${data.roi_data?.investment_cost || 0}€

Erstelle folgende Diagramm-Daten:

1. **costComparison**: Vergleich monatliche Ist-Kosten vs. erwartete monatliche Soll-Kosten
   - Format: Array mit {category: string, ist: number, soll: number}
   - Example: [{"category": "Gesamtkosten", "ist": ${istTotalMonthlyCost.toFixed(2)}, "soll": ${estimatedSollMonthlyCost.toFixed(2)}}]

2. **effortBreakdown**: Aufwandsverteilung für die Implementierung
   - Nur Kategorien mit Werten > 0
   - Format: Array mit {phase: string, hours: number}

3. **savingsBreakdown**: ROI-Einsparungen nach Kategorie
   - Nur Kategorien mit Werten > 0
   - Format: Array mit {name: string, value: number}

Gib NUR valide Zahlen zurück, keine null-Werte.
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            costComparison: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  ist: { type: "number" },
                  soll: { type: "number" }
                },
                required: ["category", "ist", "soll"]
              }
            },
            effortBreakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  phase: { type: "string" },
                  hours: { type: "number" }
                },
                required: ["phase", "hours"]
              }
            },
            savingsBreakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: { type: "number" }
                },
                required: ["name", "value"]
              }
            }
          },
          required: ["costComparison", "effortBreakdown", "savingsBreakdown"]
        }
      });

      setChartData(result);
    } catch (err) {
      setError('Fehler beim Generieren der Diagramme. Bitte versuchen Sie es erneut.');
      console.error('Error generating charts:', err);
    } finally {
      setGeneratingCharts(false);
    }
  };

  useEffect(() => {
    const months = calculatePaybackMonths();
    const currentMonths = data.roi_data?.payback_months || 0;
    
    if (Math.abs(months - currentMonths) > 0.01) {
      updateData({
        roi_data: {
          ...data.roi_data,
          payback_months: months
        }
      });
    }
  }, [
    data.roi_data?.efficiency_savings,
    data.roi_data?.error_reduction_savings,
    data.roi_data?.personnel_savings,
    data.roi_data?.additional_revenue,
    data.roi_data?.investment_cost
  ]);

  const totalSavings = 
    (data.roi_data?.efficiency_savings || 0) + 
    (data.roi_data?.error_reduction_savings || 0) + 
    (data.roi_data?.personnel_savings || 0) + 
    (data.roi_data?.additional_revenue || 0);

  const paybackMonths = calculatePaybackMonths();
  const paybackYears = (paybackMonths / 12).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Amortisationsberechnung</h3>
          <p className="text-sm text-slate-600">Wie schnell zahlt sich die Investition aus?</p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Amortisationszeit = Investitionsaufwand / (Geschätzte jährliche Einsparungen / 12)
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Geschätzte Einsparungen pro Jahr</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Einsparungen durch Effizienzsteigerung (€)</Label>
              <Input
                type="number"
                value={data.roi_data?.efficiency_savings || ""}
                onChange={(e) => updateROIField("efficiency_savings", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Einsparungen durch Fehlerreduzierung (€)</Label>
              <Input
                type="number"
                value={data.roi_data?.error_reduction_savings || ""}
                onChange={(e) => updateROIField("error_reduction_savings", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Einsparungen durch Personalreduzierung (€, optional)</Label>
              <Input
                type="number"
                value={data.roi_data?.personnel_savings || ""}
                onChange={(e) => updateROIField("personnel_savings", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Zusätzliche Einnahmen durch neue Funktionen (€)</Label>
              <Input
                type="number"
                value={data.roi_data?.additional_revenue || ""}
                onChange={(e) => updateROIField("additional_revenue", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Gesamteinsparungen pro Jahr:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(totalSavings)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-slate-600">Pro Monat:</span>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(totalSavings / 12)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investitionsaufwand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Gesamtinvestition für die Umsetzung (€)</Label>
              <Input
                type="number"
                value={data.roi_data?.investment_cost || ""}
                onChange={(e) => updateROIField("investment_cost", e.target.value)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Amortisationszeit:</span>
              <div className="text-right">
                <div className="text-4xl font-bold text-green-600">
                  {paybackMonths > 0 && isFinite(paybackMonths) ? paybackMonths.toFixed(1) : '∞'}
                </div>
                <div className="text-sm text-slate-600">Monate</div>
              </div>
            </div>
            {paybackMonths > 0 && isFinite(paybackMonths) && (
              <div className="pt-4 border-t border-green-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">In Jahren</p>
                    <p className="text-2xl font-bold text-green-600">{paybackYears} Jahre</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Monatliche Einsparung</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalSavings / 12)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {(paybackMonths === 0 || !isFinite(paybackMonths)) && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Bitte geben Sie Einsparungen ein, um die Amortisationszeit zu berechnen.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Chart Generation Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={generateCharts}
            disabled={generatingCharts}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            size="lg"
          >
            {generatingCharts ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generiere Visualisierungen...
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5" />
                ROI-Visualisierungen generieren
              </>
            )}
          </Button>
        </div>

        {generatingCharts && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-blue-800 font-medium">Generiere ROI-Diagramme...</p>
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

        {chartData && (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ROI-Visualisierungen erfolgreich generiert!
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Kostenvergleich (monatlich)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.costComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                      <Legend />
                      <Bar dataKey="ist" fill="#ef4444" name="Ist-Kosten" />
                      <Bar dataKey="soll" fill="#10b981" name="Soll-Kosten" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-purple-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Aufwandsverteilung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.effortBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="phase" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value}h`} />
                      <Bar dataKey="hours" fill="#8b5cf6" name="Stunden" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {chartData.savingsBreakdown && chartData.savingsBreakdown.length > 0 && (
                <Card className="border-green-200 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Einsparungen nach Kategorie
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.savingsBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.savingsBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${formatCurrency(value)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}