"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, Zap, Thermometer, ShieldCheck, BrainCircuit } from 'lucide-react';

interface KpiCardsProps {
  healthScore: number;
  rpm: number;
  temp: number;
  activeAlertsCount: number;
  inferenceCount: number;
  language?: 'en' | 'ar';
}

export function KpiCards({ 
  healthScore,
  rpm,
  temp,
  activeAlertsCount, 
  inferenceCount, 
  language = 'en'
}: KpiCardsProps) {
  const translations = {
    en: {
      health: "Health",
      rpm: "RPM",
      temp: "Temp",
      alerts: "Alerts",
      edge: "Edge"
    },
    ar: {
      health: "الصحة",
      rpm: "دوران",
      temp: "حرارة",
      alerts: "تنبيهات",
      edge: "الحافة"
    }
  };

  const t = translations[language];
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
      {/* HPI Card */}
      <Card className="bg-card/40 border-accent/10 relative overflow-hidden col-span-2 sm:col-span-1">
        <CardContent className="p-3 sm:p-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.health}</p>
            <h3 className={`text-xl sm:text-2xl font-black ${healthScore > 85 ? 'text-emerald-500' : 'text-accent'}`}>
              {healthScore}%
            </h3>
          </div>
          <ShieldCheck className="h-5 w-5 sm:h-7 sm:w-7 text-accent/30" />
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border">
        <CardContent className="p-3 sm:p-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.rpm}</p>
            <h3 className="text-xl sm:text-2xl font-bold font-mono">{Math.round(rpm)}</h3>
          </div>
          <Zap className="h-5 w-5 text-accent/30" />
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border">
        <CardContent className="p-3 sm:p-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.temp}</p>
            <h3 className="text-xl sm:text-2xl font-bold font-mono">{Math.round(temp)}°</h3>
          </div>
          <Thermometer className="h-5 w-5 text-orange-500/30" />
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border">
        <CardContent className="p-3 sm:p-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.alerts}</p>
            <h3 className={`text-xl sm:text-2xl font-bold ${activeAlertsCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {activeAlertsCount}
            </h3>
          </div>
          <ShieldAlert className="h-5 w-5 text-destructive/30" />
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border hidden lg:flex">
        <CardContent className="p-3 sm:p-5 flex items-center justify-between w-full">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.edge}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-500">{inferenceCount}</h3>
          </div>
          <BrainCircuit className="h-5 w-5 text-emerald-500/30" />
        </CardContent>
      </Card>
    </div>
  );
}