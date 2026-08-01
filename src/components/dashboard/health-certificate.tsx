
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  FileSignature, 
  Download, 
  QrCode, 
  CheckCircle2,
  Calendar,
  Activity
} from 'lucide-react';

interface HealthCertificateProps {
  healthScore: number;
  machineId: string;
  language?: 'en' | 'ar';
}

export function HealthCertificate({ healthScore, machineId, language = 'en' }: HealthCertificateProps) {
  const isHealthy = healthScore > 85;

  const translations = {
    en: {
      proof: "Vehicle Proof of Condition",
      certified: "Certified Vehicle Health Document",
      asset: "Vehicle VIN / Identifier",
      index: "Vehicle Health Index",
      status: "Certification Status",
      issued: "Issued On",
      validator: "AI Engine Validator",
      download: "Export PDF",
      sign: "Sign Digital Report",
      certified_label: "Certified Health",
      compliance_text: "This certificate is generated using immutable Autex Black Box hashing. It provides verified proof of consistent engine performance, increasing resale value and ensuring regulatory compliance for high-value assets."
    },
    ar: {
      proof: "إثبات حالة المركبة",
      certified: "وثيقة صحة المركبة المعتمدة",
      asset: "معرف المركبة / VIN",
      index: "مؤشر صحة المركبة",
      status: "حالة الاعتماد",
      issued: "تاريخ الإصدار",
      validator: "مدقق الذكاء الاصطناعي",
      download: "تصدير PDF",
      sign: "توقيع التقرير",
      certified_label: "صحة معتمدة",
      compliance_text: "يتم إنشاء هذه الشهادة باستخدام تشفير أوتيكس الثابت. وهي توفر إثباتًا موثقًا لأداء المحرك، مما يزيد من قيمة إعادة البيع ويضمن الامتثال التنظيمي."
    }
  };

  const t = translations[language];

  return (
    <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 max-w-2xl mx-auto py-4 md:py-8 px-4">
      <Card className="w-full border-accent/20 bg-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-accent/5 rounded-bl-full border-l border-b border-accent/10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-accent/5 rounded-tr-full border-r border-t border-accent/10" />
        
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-accent/10 p-3 md:p-4 rounded-full w-fit mb-4">
            <ShieldCheck className="h-8 md:h-10 w-8 md:w-10 text-accent" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">{t.proof}</CardTitle>
          <CardDescription className="text-xs md:text-sm">{t.certified}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 md:space-y-8 px-4 md:px-10 pb-10">
          <div className="border-y border-border py-6 md:py-8 space-y-6 text-center">
            <div className="space-y-1">
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{t.asset}</p>
              <p className="text-sm md:text-lg font-mono font-bold">{machineId}</p>
            </div>

            <div className="flex justify-center gap-8 md:gap-12">
              <div className="space-y-1">
                <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold">{t.index}</p>
                <p className={`text-2xl md:text-3xl font-black ${isHealthy ? 'text-emerald-500' : 'text-accent'}`}>{healthScore}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold">{t.status}</p>
                <div className="flex items-center gap-2 justify-center mt-1">
                  <CheckCircle2 className="h-4 md:h-5 w-4 md:w-5 text-emerald-500" />
                  <span className="font-bold text-sm md:text-lg uppercase">{t.certified_label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="space-y-4 w-full sm:w-auto">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-left rtl:text-right">
                  <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold">{t.issued}</p>
                  <p className="text-[10px] md:text-xs font-medium">{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div className="text-left rtl:text-right">
                  <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold">{t.validator}</p>
                  <p className="text-[10px] md:text-xs font-medium italic">Autex Edge Automotive v4.2</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-2 rounded-md shadow-inner">
              <QrCode className="h-12 md:h-16 w-12 md:w-16 text-black" />
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <Button className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-xs md:text-sm">
              <Download className="h-4 w-4" />
              {t.download}
            </Button>
            <Button variant="outline" className="flex-1 gap-2 border-accent/20 hover:bg-accent/10 text-xs md:text-sm">
              <FileSignature className="h-4 w-4 text-accent" />
              {t.sign}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-accent/10 p-4 rounded-xl border border-accent/20 flex items-start gap-4">
        <Activity className="h-5 md:h-6 w-5 md:w-6 text-accent shrink-0 mt-1" />
        <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
          {t.compliance_text}
        </p>
      </div>
    </div>
  );
}
