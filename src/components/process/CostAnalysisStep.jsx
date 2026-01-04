
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/components/utils";

export default function CostAnalysisStep({ data, updateData }) {
  const updateCost = (key, value) => {
    updateData({
      ist_costs: {
        ...data.ist_costs,
        [key]: parseFloat(value) || 0
      }
    });
  };

  const calculatePersonnelCosts = () => {
    const hours = data.ist_costs?.personnel_hours || 0;
    const rate = data.ist_costs?.hourly_rate || 0;
    return hours * rate;
  };

  const calculateTotalCosts = () => {
    const personnel = calculatePersonnelCosts();
    const system = data.ist_costs?.system_costs || 0;
    const other = data.ist_costs?.other_costs || 0;
    return personnel + system + other;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Ist-Kostenanalyse</h3>
          <p className="text-sm text-slate-600">Aktuelle Kosten des Prozesses</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personalkosten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Geschätzte Stunden pro Monat</Label>
                <Input
                  type="number"
                  value={data.ist_costs?.personnel_hours || ""}
                  onChange={(e) => updateCost("personnel_hours", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Stundensatz (€)</Label>
                <Input
                  type="number"
                  value={data.ist_costs?.hourly_rate || ""}
                  onChange={(e) => updateCost("hourly_rate", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Personalkosten pro Monat:</span>
                <span className="text-xl font-bold text-purple-600">
                  {formatCurrency(calculatePersonnelCosts())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Systemkosten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Lizenzgebühren, Wartungskosten pro Monat (€)</Label>
              <Input
                type="number"
                value={data.ist_costs?.system_costs || ""}
                onChange={(e) => updateCost("system_costs", e.target.value)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sonstige Kosten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Materialkosten, externe Dienstleister pro Monat (€)</Label>
              <Input
                type="number"
                value={data.ist_costs?.other_costs || ""}
                onChange={(e) => updateCost("other_costs", e.target.value)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Gesamtkosten pro Monat:</span>
              <span className="text-3xl font-bold text-purple-600">
                {formatCurrency(calculateTotalCosts())}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Pro Jahr: {formatCurrency(calculateTotalCosts() * 12)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
