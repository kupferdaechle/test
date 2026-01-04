import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, User, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function BasicInfoStep({ data, updateData, consultants }) {
  const { data: processStatuses = [] } = useQuery({
    queryKey: ['processStatuses'],
    queryFn: () => base44.entities.ProcessStatus.list('sort_order'),
  });

  const { data: kundenstamm = [] } = useQuery({
    queryKey: ['kundenstamm'],
    queryFn: () => base44.entities.Kundenstamm.list('firma'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Building2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Grunddaten des Prozesses</h3>
          <p className="text-sm text-slate-600">Basisinformationen zur Prozessoptimierung</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="process_name">Prozessname *</Label>
          <Input
            id="process_name"
            value={data.process_name}
            onChange={(e) => updateData({ process_name: e.target.value })}
            placeholder="z.B. Rechnungsverarbeitung automatisieren"
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_id">Firma</Label>
          <Select
            value={data.customer_id}
            onValueChange={(value) => updateData({ customer_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Firma auswählen" />
            </SelectTrigger>
            <SelectContent>
              {kundenstamm.map((kunde) => (
                <SelectItem key={kunde.id} value={kunde.id}>
                  {kunde.firma}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={data.status}
            onValueChange={(value) => updateData({ status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {processStatuses
                .filter(status => status.is_active)
                .map((status) => (
                  <SelectItem key={status.id} value={status.status_name}>
                    {status.status_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="erfasser" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Berater *
          </Label>
          <Select
            value={data.erfasser || ""}
            onValueChange={(value) => updateData({ erfasser: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Berater auswählen" />
            </SelectTrigger>
            <SelectContent>
              {consultants && consultants.map((consultant) => (
                <SelectItem key={consultant.id} value={`${consultant.first_name} ${consultant.last_name}`}>
                  {consultant.first_name} {consultant.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="erfassungsdatum" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Erfassungsdatum
          </Label>
          <Input
            id="erfassungsdatum"
            type="date"
            value={data.erfassungsdatum || ""}
            onChange={(e) => updateData({ erfassungsdatum: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}