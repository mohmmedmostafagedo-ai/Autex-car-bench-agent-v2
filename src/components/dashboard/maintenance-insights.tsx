
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingDown, 
  DollarSign, 
  Leaf, 
  AlertCircle, 
  BarChart3, 
  ArrowUpRight,
  ZapOff,
  Activity,
  History
} from 'lucide-react';
import { SensorReading, AnomalyAlert } from './monitoring-dashboard';

interface MaintenanceInsightsProps {
  readings: SensorReading[];
  alerts: AnomalyAlert[];
  language?: 'en' | 'ar';
}

export function MaintenanceInsights({ readings, alerts, language = 'en' }: MaintenanceInsightsProps) {
  // Simulate ROI and efficiency metrics
  const avgVibration = readings.length > 0 ? readings.reduce((acc, r) => acc + r.value, 0) / readings.length : 40;
  const efficiencyLoss = Math.min(15, Math.max(0, (avgVibration - 30) * 0.2));
  const potentialSavings = alerts.length * 1250; // Average cost avoided per early detection
  
  const translations = {
    en: {
      roi: "Maintenance ROI",
      roi_desc: "Estimated cost avoided via early detection",
      improvement: "24% Improvement",
      efficiency: "Predictive Energy Efficiency",
      efficiency_desc: "Detection of power drift due to mechanical friction",
      drift: "Excess Consumption Drift",
      impact: "Impact Analysis",
      heat: "Heat Dissipation Leak",
      suggestion: "AI Suggestion",
      bearings: "Re-calibrate Bearings",
      cost_benefit: "Maintenance Cost-Benefit Breakdown",
      downtime: "Unscheduled Downtime Prevention",
      lifecycle: "Component Lifecycle Extension",
      accuracy: "Operational Accuracy Drift",
      footprint: "Energy Footprint Reduction"
    },
    ar: {
      roi: "عائد الاستثمار في الصيانة",
      roi_desc: "التكلفة التقديرية التي تم تجنبها عبر الاكتشاف المبكر",
      improvement: "24% تحسن",
      efficiency: "كفاءة الطاقة التنبؤية",
      efficiency_desc: "اكتشاف انحراف الطاقة بسبب الاحتكاك الميكانيكي",
      drift: "انحراف الاستهلاك الزائد",
      impact: "تحليل التأثير",
      heat: "تسرب تبديد الحرارة",
      suggestion: "اقتراح الذكاء الاصطناعي",
      bearings: "إعادة معايرة المحامل",
      cost_benefit: "تفصيل التكلفة مقابل الفائدة",
      downtime: "منع التوقف غير المجدول",
      lifecycle: "إطالة عمر المكونات",
      accuracy: "انحراف الدقة التشغيلية",
      footprint: "تقليل بصمة الطاقة"
    }
  };

  const t = translations[language];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ROI / Economic Impact */}
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-500">
              <DollarSign className="h-5 w-5" />
              {t.roi}
            </CardTitle>
            <CardDescription>{t.roi_desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-emerald-500">${potentialSavings.toLocaleString()}</span>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 gap-1">
                <ArrowUpRight className="h-3 w-3" /> {t.improvement}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on the prevention of critical failures detected by Edge AI.
            </p>
          </CardContent>
        </Card>

        {/* Predictive Efficiency Monitor */}
        <Card className="bg-accent/5 border-accent/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="h-5 w-5 text-accent" />
              {t.efficiency}
            </CardTitle>
            <CardDescription>{t.efficiency_desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">{t.drift}</span>
              <span className={`text-sm font-bold ${efficiencyLoss > 5 ? 'text-destructive' : 'text-accent'}`}>
                +{efficiencyLoss.toFixed(1)}% KWh
              </span>
            </div>
            <Progress value={efficiencyLoss * 6.6} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-background/50 p-3 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t.impact}</p>
                <div className="flex items-center gap-2">
                  <ZapOff className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium">{t.heat}</span>
                </div>
              </div>
              <div className="bg-background/50 p-3 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t.suggestion}</p>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium">{t.bearings}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            {t.cost_benefit}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: t.downtime, score: 88, color: 'bg-emerald-500' },
              { label: t.lifecycle, score: 72, color: 'bg-accent' },
              { label: t.accuracy, score: 94, color: 'bg-emerald-500' },
              { label: t.footprint, score: 65, color: 'bg-orange-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{item.label}</span>
                  <span className="font-bold">{item.score}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
