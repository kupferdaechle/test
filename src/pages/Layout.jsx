
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Plus, 
  Building2, 
  Settings, 
  TrendingUp, 
  User, 
  ExternalLink, 
  Search, 
  Sparkles, 
  Workflow, 
  Zap, 
  Brain, 
  Globe, 
  Link as LinkIcon,
  Save,
  CheckCircle,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Presentation,
  LogOut
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Neuer Prozess",
    url: createPageUrl("NewProcess"),
    icon: Plus,
  },
  {
    title: "Projekte",
    url: createPageUrl("Projects"),
    icon: Presentation,
  },
  {
    title: "Kundenstamm",
    url: createPageUrl("Kundenstamm"),
    icon: Building2,
  },
  {
    title: "Berater",
    url: createPageUrl("Consultants"),
    icon: User,
  },
  {
    title: "HSxB-Experten",
    url: createPageUrl("HSxBExperts"),
    icon: Sparkles,
  },
  {
    title: "Interne KI",
    url: createPageUrl("InternalAI"),
    icon: Brain,
  },
  {
    title: "Einstellungen",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

// Erweiterte Icon-Map mit allen verfügbaren Icons
const iconMap = {
  Zap,
  Sparkles,
  Workflow,
  TrendingUp,
  Search,
  ExternalLink,
  Globe,
  Link: LinkIcon,
  User,
  Building2,
  Settings,
  Save,
  CheckCircle,
  Loader2,
  Trash2,
  Plus,
  LayoutDashboard,
  Brain,
  Presentation
};

const defaultExternalLinks = [
  {
    title: "InCoreOn",
    url: "https://incoreon.ai/",
    icon: "Zap",
  },
  {
    title: "Gemini",
    url: "https://gemini.google.com/",
    icon: "Sparkles",
  },
  {
    title: "Camunda",
    url: "https://camunda.com/",
    icon: "Workflow",
  },
  {
    title: "Base44",
    url: "https://base44.com/",
    icon: "TrendingUp",
  },
  {
    title: "Suchen",
    url: "https://www.google.com/",
    icon: "Search",
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [externalToolsOpen, setExternalToolsOpen] = React.useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
  });

  const externalLinks = settings[0]?.external_tools || defaultExternalLinks;

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">KI-Workbench</h2>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Neu denken - Zukunft gestalten
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-1">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider px-2 py-1 mb-1">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`rounded-lg mb-0 transition-all duration-200 h-8 ${
                          location.pathname === item.url 
                            ? 'bg-blue-50 text-blue-700 shadow-sm' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-2 px-2 py-1">
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="font-medium text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-1" />

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setExternalToolsOpen(!externalToolsOpen)}
                      className="rounded-lg mb-0 transition-all duration-200 hover:bg-slate-50 h-8"
                    >
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="font-semibold text-sm flex-1">Externe Tools</span>
                      {externalToolsOpen ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </SidebarMenuButton>
                    {externalToolsOpen && (
                      <SidebarMenuSub>
                        {externalLinks.map((item, index) => {
                          const IconComponent = iconMap[item.icon] || ExternalLink;
                          return (
                            <SidebarMenuSubItem key={index}>
                              <SidebarMenuSubButton asChild>
                                <a 
                                  href={item.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-2 py-1"
                                >
                                  <IconComponent className="w-4 h-4 shrink-0" />
                                  <span className="font-medium text-sm flex-1">{item.title}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-slate-200 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLogoutDialogOpen(true)}
                  className="rounded-lg mb-2 transition-all duration-200 hover:bg-red-50 hover:text-red-700 h-8"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm">Abmelden</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="text-[10px] text-slate-500 text-center mt-2">
              © 2025 Klaus Frank
            </div>
            </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-slate-200 px-6 py-4 md:hidden shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors" />
              <h1 className="text-xl font-bold text-slate-900">KI-Workbench</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
          </main>
          </div>

          <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abmelden bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie sich wirklich von der Anwendung abmelden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
              Abmelden
            </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>
          </SidebarProvider>
          );
          }
