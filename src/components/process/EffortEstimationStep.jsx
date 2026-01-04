
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, DollarSign } from "lucide-react";
import { formatCurrency } from "@/components/utils"; // Updated import path

export default function EffortEstimationStep({ data, updateData, consultants = [] }) {
  // Stunden-Werte direkt aus data holen
  const conceptionHours = Number(data.effort_details?.conception_hours) || 0;
  const developmentHours = Number(data.effort_details?.development_hours) || 0;
  const testingHours = Number(data.effort_details?.testing_hours) || 0;
  const deploymentHours = Number(data.effort_details?.deployment_hours) || 0;
  const totalHours = conceptionHours + developmentHours + testingHours + deploymentHours;

  // Stundensatz aus data holen
  const hourlyRate = Number(data.effort_details?.hourly_rate_at_estimation) || 0;
  
  // Gesamtkosten berechnen
  const totalCost = totalHours * hourlyRate;

  const updateHours = (field, value) => {
    updateData({
      effort_details: {
        ...data.effort_details,
        [field]: Number(value) || 0
      }
    });
  };

  const updateHourlyRate = (value) => {
    updateData({
      effort_details: {
        ...data.effort_details,
        hourly_rate_at_estimation: Number(value) || 0
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <Calculator className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Aufwandsbewertung</h3>
          <p className="text-sm text-slate-600">Schätzung des Umsetzungsaufwands</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stunden Eingabe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aufwand in Stunden schätzen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Konzeption (Stunden)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={conceptionHours || ""}
                  onChange={(e) => updateHours("conception_hours", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Entwicklung (Stunden)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={developmentHours || ""}
                  onChange={(e) => updateHours("development_hours", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Test (Stunden)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={testingHours || ""}
                  onChange={(e) => updateHours("testing_hours", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Einführung (Stunden)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={deploymentHours || ""}
                  onChange={(e) => updateHours("deployment_hours", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gesamtstunden Anzeige */}
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Gesamtstunden:</span>
              <span className="text-2xl font-bold text-blue-600">{totalHours.toFixed(1)} h</span>
            </div>
          </CardContent>
        </Card>

        {/* Stundensatz Eingabe */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-base">Stundensatz festlegen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Stundensatz (€/Std.)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={hourlyRate || ""}
                onChange={(e) => updateHourlyRate(e.target.value)}
                placeholder="z.B. 150"
              />
            </div>
            
            {hourlyRate > 0 && (
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Gewählter Stundensatz:</span>
                  <span className="font-bold text-purple-600">{formatCurrency(hourlyRate, true, 2)}/Std.</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gesamtkosten Anzeige */}
        {totalHours > 0 && hourlyRate > 0 && (
          <Card className="border-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-green-200 pb-3">
                  <DollarSign className="w-6 h-6 text-green-700" />
                  <h3 className="text-lg font-bold text-green-900">Gesamtkostenbewertung</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Gesamtstunden:</span>
                    <span className="font-semibold text-slate-900">{totalHours.toFixed(1)} h</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Stundensatz:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(hourlyRate, true, 2)}/Std.</span>
                  </div>
                  
                  <div className="border-t border-green-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">GESAMTKOSTEN:</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(totalCost, true, 2)}</span>
                    </div>
                    <p className="text-right text-sm text-slate-600 mt-1">
                      ({totalHours.toFixed(1)} h × {formatCurrency(hourlyRate, true, 2)} = {formatCurrency(totalCost, true, 2)})
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {totalHours > 0 && hourlyRate === 0 && (
          <Card className="border-orange-400 bg-orange-50">
            <CardContent className="p-4">
              <p className="text-orange-800 text-center">
                ⚠️ Bitte geben Sie einen Stundensatz ein, um die Gesamtkosten zu berechnen.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
