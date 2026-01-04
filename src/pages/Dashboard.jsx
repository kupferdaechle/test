import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl, formatCurrency } from "@/components/utils";
import { Plus, TrendingUp, Building2, CheckCircle, Clock, FileText, ChevronRight, Filter, Eye, LayoutDashboard, DollarSign, Target, Calendar, Video, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  // Lade gespeicherten Kunden aus localStorage, oder verwende "all" als Standard
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_selected_customer');
      return saved || "all";
    }
    return "all";
  });

  // Query, um ALLE Prozesse zu laden, sortiert nach 'updated_date' absteigend
  const { data: allProcessesData = [], isLoading: processesLoading, error: processesError } = useQuery({
    queryKey: ['processes'], // Query-Key nur für 'processes', ohne Kunden-ID
    queryFn: async () => {
      try {
        // Lade alle Prozesse und sortiere sie nach dem neuesten Aktualisierungsdatum
        const result = await base44.entities.Process.list('-updated_date');
        console.log('=== DASHBOARD: Geladene Prozesse ===');
        console.log('Anzahl Prozesse:', result.length);
        result.forEach(p => {
          console.log(`Prozess: ${p.process_name}`);
          console.log('  ROI Data:', p.roi_data);
          console.log('  Payback Months:', p.roi_data?.payback_months);
          console.log('  Ist gültig?', p.roi_data?.payback_months > 0 && isFinite(p.roi_data?.payback_months));
        });
        return result;
      } catch (error) {
        console.error("Error loading processes:", error);
        return [];
      }
    },
    refetchOnWindowFocus: true, // Bei Fokus auf das Fenster neu abrufen
    refetchInterval: false,     // Kein automatisches Refetching in Intervallen
    staleTime: 0,               // Daten sofort als veraltet markieren, um RefetchOnWindowFocus zu triggern
  });

  // Filterung der Prozesse basierend auf der ausgewählten Kunden-ID
  const filteredProcesses = useMemo(() => {
    if (selectedCustomerId === "all") {
      return allProcessesData;
    } else {
      return allProcessesData.filter(p => p.customer_id === selectedCustomerId);
    }
  }, [allProcessesData, selectedCustomerId]); // Neu berechnen, wenn allProcessesData oder selectedCustomerId sich ändern


  const { data: customers = [], isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['kundenstamm'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Kundenstamm.list('-created_date');
        console.log('Geladene Kunden:', result);
        return result;
      } catch (error) {
        console.error("Error loading customers:", error);
        return [];
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    cacheTime: 0,
  });

  const { data: processStatuses = [] } = useQuery({
    queryKey: ['processStatuses'],
    queryFn: () => base44.entities.ProcessStatus.list('sort_order'),
  });

  // Funktion zum Ändern des ausgewählten Kunden und Speichern in localStorage
  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_selected_customer', customerId);
    }
  };

  const getStatusColor = (status) => {
    const statusObj = processStatuses.find(s => s.status_name === status);
    // Fallback to a default grey if status not found or color is missing
    return statusObj?.status_color || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusIcon = (status) => {
    // Simple logic for icon based on status name, case-insensitive
    if (status?.toLowerCase().includes('abgeschlossen') || status?.toLowerCase().includes('fertig')) return CheckCircle;
    if (status?.toLowerCase().includes('umsetzung') || status?.toLowerCase().includes('analyse')) return Clock;
    return FileText;
  };

  const stats = useMemo(() => {
    // Reusing the robust amortization calculation logic
    const processesWithValidAmortization = [];
    
    allProcessesData.forEach(p => {
      if (p.roi_data) {
        const totalSavingsPerYear = 
          (p.roi_data.efficiency_savings || 0) + 
          (p.roi_data.error_reduction_savings || 0) + 
          (p.roi_data.personnel_savings || 0) + 
          (p.roi_data.additional_revenue || 0);
        
        const investment = p.roi_data.investment_cost || 0;
        
        if (totalSavingsPerYear > 0 && investment > 0) {
          const monthlySavings = totalSavingsPerYear / 12;
          const paybackMonths = investment / monthlySavings;
          
          if (paybackMonths > 0 && isFinite(paybackMonths)) {
            processesWithValidAmortization.push({
              name: p.process_name,
              paybackMonths: paybackMonths
            });
          }
        }
      }
    });
    
    let avgPaybackMonths = 0;
    if (processesWithValidAmortization.length > 0) {
      const totalMonths = processesWithValidAmortization.reduce((sum, p) => sum + p.paybackMonths, 0);
      avgPaybackMonths = totalMonths / processesWithValidAmortization.length;
    }

    const totalInvestment = allProcessesData.reduce((sum, p) => {
      const investment = p.roi_data?.investment_cost || 0;
      return sum + investment;
    }, 0);
    
    const totalSavings = allProcessesData.reduce((sum, p) => {
      const savings = 
        (p.roi_data?.efficiency_savings || 0) +
        (p.roi_data?.error_reduction_savings || 0) +
        (p.roi_data?.personnel_savings || 0) +
        (p.roi_data?.additional_revenue || 0);
      return sum + savings;
    }, 0);

    return {
      totalProcesses: allProcessesData.length,
      totalInvestment: totalInvestment,
      totalSavings: totalSavings,
      avgAmortization: avgPaybackMonths 
    };
  }, [allProcessesData]);

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.firma || 'Unbekannt';
  };

  const getProcessDirectLink = (process) => {
    if (!process.bpmn_files || process.bpmn_files.length === 0) return null;

    for (const file of process.bpmn_files) {
      if (file.direct_link && file.direct_link.trim()) {
        return file.direct_link;
      }
    }
    return null;
  };

  const openProcessLink = (e, directLink) => {
    e.preventDefault();
    e.stopPropagation();
    if (directLink) {
      window.open(directLink, '_blank');
    }
  };

  const openBase44App = (e, appLink) => {
    e.preventDefault();
    e.stopPropagation();
    if (appLink) {
      window.open(appLink, '_blank');
    }
  };

  const openPresentationFile = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    if (file && file.url) {
      window.open(file.url, '_blank');
    }
  };

  return (
    <div className="p-6 md:p-8 pt-8 md:pt-10 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600">Anzahl Prozesse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalProcesses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600">Gesamtinvestition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatCurrency(stats.totalInvestment)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600">Gesamteinsparungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(stats.totalSavings)}
            </div>
            <div className="text-xs text-slate-500 mt-1">pro Jahr</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600">Ø Amortisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.avgAmortization > 0 && Number.isFinite(stats.avgAmortization)
                ? stats.avgAmortization.toFixed(1)
                : '∞'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Monate</div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Aktuelle Prozesse
                  {filteredProcesses.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {filteredProcesses.length}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <Select
                    value={selectedCustomerId}
                    onValueChange={handleCustomerChange}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Kunde wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kunden</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {processesError ? (
                <div className="p-6 text-center text-red-600">
                  <p>Fehler beim Laden der Prozesse. Bitte versuchen Sie es später erneut.</p>
                </div>
              ) : processesLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProcesses.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">
                    {selectedCustomerId === "all"
                      ? "Noch keine Prozesse erfasst"
                      : "Keine Prozesse für diesen Kunden"}
                  </p>
                  <Link to={createPageUrl("NewProcess")}>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      {selectedCustomerId === "all"
                        ? "Ersten Prozess erstellen"
                        : "Prozess erstellen"}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Prozessname</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden md:table-cell">Kunde</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Status</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden xl:table-cell">Amortisation</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProcesses.map((process) => {
                        const StatusIcon = getStatusIcon(process.status);

                        return (
                          <tr key={process.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                                  <StatusIcon className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="font-semibold text-slate-900">{process.process_name}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                              {process.customer_id ? getCustomerName(process.customer_id) : '-'}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <Badge variant="outline" className={`text-xs ${getStatusColor(process.status)} border`}>
                                {process.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 hidden xl:table-cell">
                              {process.roi_data?.payback_months != null ? (
                                <span>
                                  {process.roi_data.payback_months === Infinity || process.roi_data.payback_months <= 0 || !Number.isFinite(process.roi_data.payback_months)
                                    ? '∞' 
                                    : process.roi_data.payback_months.toFixed(1)}{" "}Monate
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link to={createPageUrl(`ProcessDetails?id=${process.id}`)}>
                                <Button variant="ghost" size="sm" className="gap-2">
                                  Öffnen
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}