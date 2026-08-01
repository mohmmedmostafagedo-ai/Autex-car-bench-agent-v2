
"use client";

import Image from "next/image";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  ShieldAlert, 
  Zap, 
  Database,
  TrendingUp,
  ShieldCheck,
  FileText,
  Cpu
} from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface DashboardSidebarProps {
  language?: 'en' | 'ar';
  hasGreenBox?: boolean;
}

export function DashboardSidebar({ language = 'en', hasGreenBox = false }: DashboardSidebarProps) {
  const logo = PlaceHolderImages.find(img => img.id === 'autex-logo');

  const translations = {
    en: {
      brand: "AUTEX",
      core: "Vehicle Operations",
      command: "Command Center",
      incident: "Diagnostic Log",
      roi: "Fuel & ROI Insights",
      compliance: "Certification",
      proof: "Vehicle Proof",
      manuals: "Service Manuals",
      ledger: "Maintenance History",
      connectivity: "OBD Connectivity",
      cloud: "Black Box Active",
      config: "Scanner Config",
      greenBox: "Green Box: Offline",
      greenBoxActive: "Green Box: Active"
    },
    ar: {
      brand: "أوتيكس",
      core: "عمليات المركبة",
      command: "مركز القيادة",
      incident: "سجل التشخيص",
      roi: "رؤى الوقود والعائد",
      compliance: "الشهادات",
      proof: "إثبات المركبة",
      manuals: "كتيبات الخدمة",
      ledger: "تاريخ الصيانة",
      connectivity: "اتصال OBD",
      cloud: "الصندوق الأسود نشط",
      config: "إعدادات الماسح",
      greenBox: "الصندوق الأخضر: متوقف",
      greenBoxActive: "الصندوق الأخضر: نشط"
    }
  };

  const t = translations[language];

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          {logo && (
            <div className="relative h-8 w-8 min-w-[32px] overflow-hidden rounded-md bg-black">
              <Image 
                src={logo.imageUrl} 
                alt="Autex Logo" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover invert opacity-80"
                data-ai-hint="automotive logo"
              />
            </div>
          )}
          <span className="font-black text-lg group-data-[collapsible=icon]:hidden tracking-tighter whitespace-nowrap">{t.brand}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{t.core}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip={t.command}>
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="font-medium">{t.command}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t.incident}>
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <span className="font-medium">{t.incident}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t.roi}>
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <span className="font-medium">{t.roi}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{t.compliance}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t.proof}>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">{t.proof}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t.manuals}>
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{t.manuals}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t.ledger}>
                  <History className="h-4 w-4" />
                  <span className="font-medium">{t.ledger}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{t.connectivity}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={hasGreenBox ? t.greenBoxActive : t.greenBox}>
                  <Cpu className={`h-4 w-4 ${hasGreenBox ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                  <span className={`font-medium ${hasGreenBox ? 'text-emerald-500' : 'text-muted-foreground/40'}`}>
                    {hasGreenBox ? t.greenBoxActive : t.greenBox}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t.cloud}>
                  <Database className="h-4 w-4" />
                  <span className="font-medium text-xs">{t.cloud}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t.config}>
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">{t.config}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
