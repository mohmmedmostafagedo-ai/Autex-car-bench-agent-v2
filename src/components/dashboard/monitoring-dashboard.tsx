"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from './dashboard-sidebar';
import { ConnectionStatus } from './connection-status';
import { LiveSensorChart } from './live-sensor-chart';
import { AlertList } from './alert-list';
import { KpiCards } from './kpi-cards';
import { ThresholdSettings } from './threshold-settings';
import { ReportUploader } from './report-uploader';
import { ReportList } from './report-list';
import { MaintenanceInsights } from './maintenance-insights';
import { HealthCertificate } from './health-certificate';
import { DiagnosticChat } from './diagnostic-chat';
import { VisualScanModal } from './visual-scan-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Settings, 
  Gauge, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Languages, 
  Terminal,
  BrainCircuit,
  Loader2,
  Camera
} from 'lucide-react';
import { detectAndClassifyAnomalies, DetectAndClassifyAnomaliesOutput } from '@/ai/flows/detect-and-classify-anomalies';
import { generateAnomalyExplanation } from '@/ai/flows/generate-anomaly-explanation';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, query, orderBy, limit, doc } from 'firebase/firestore';
import { useCollection, useDoc } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { VisualDiagnosticOutput } from '@/ai/flows/visual-diagnostic-flow';
import { runMpaeDecision, type MpaeDecision } from '@/lib/mpae';

export type SensorReading = {
  timestamp: number;
  value: number;
  rpm?: number;
  temp?: number;
  ltft?: number;
};

type TelemetrySource = 'hardware' | 'simulation' | 'test';

type TelemetryPayload = {
  rpm?: number;
  temp?: number;
  ltft?: number;
  source?: TelemetrySource;
};

export type AnomalyAlert = DetectAndClassifyAnomaliesOutput & {
  id: string;
  timestamp: number;
  advice?: string;
  trace?: any;
  mpae?: MpaeDecision;
  part_details?: {
    id: string;
    location: string;
    stock: number;
  };
};

type AiLogEntry = {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'brain' | 'hardware' | 'error';
  persona?: 'STALLION' | 'NOMAD' | 'WORKHORSE';
};

function TypedLogEntry({ log }: { log: AiLogEntry }) {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < log.message.length) {
        setDisplayedMessage((prev) => prev + log.message.charAt(index));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 10);
    return () => clearInterval(interval);
  }, [log.message]);

  const colorClass = log.type === 'error' ? 'text-destructive' :
                    log.type === 'brain' ? 'text-yellow-400' :
                    log.type === 'hardware' ? 'text-emerald-500' :
                    'text-muted-foreground';

  return (
    <div className="flex gap-2 leading-tight mb-1">
      <span className="text-[10px] text-muted-foreground shrink-0 opacity-50 font-mono">
        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span className={`${colorClass} font-mono text-[10px] break-words`}>
        {log.type === 'brain' && <BrainCircuit className="inline h-2.5 w-2.5 mr-1" />}
        {displayedMessage}
        {isTyping && <span className="animate-pulse ml-0.5 border-l-2 border-current">&nbsp;</span>}
      </span>
    </div>
  );
}

const MIN_AI_INTERVAL = 30000;
const CRITICAL_AI_INTERVAL = 5000;

function createSimulatedTelemetry(value: number): Required<Pick<TelemetryPayload, 'rpm' | 'temp' | 'ltft'>> {
  const severityBoost = Math.max(0, value - 80);

  return {
    rpm: Math.round(900 + value * 4 + (Math.random() - 0.5) * 80),
    temp: Number((82 + value * 0.09 + Math.random() * 1.5).toFixed(1)),
    ltft: Number(((value > 85 ? 12 : 3) + severityBoost * 0.08 + (Math.random() - 0.5) * 1.5).toFixed(1)),
  };
}

function calculateHealthScore(vibration: number, temp: number, ltft: number) {
  const vibPenalty = Math.max(0, (vibration - 50) * 0.5);
  const tempPenalty = Math.max(0, (temp - 95) * 1.5);
  const fuelPenalty = Math.abs(ltft) > 10 ? 10 : 0;

  return Math.round(Math.max(0, Math.min(100, 100 - vibPenalty - tempPenalty - fuelPenalty)));
}

function isCriticalReading(value: number, ltft: number, maxThreshold: number) {
  return value > maxThreshold + 10 || Math.abs(ltft) > 15;
}

export function MonitoringDashboard() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [thresholds, setThresholds] = useState({ min: 20, max: 92 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inferenceCount, setInferenceCount] = useState(0);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [persona, setPersona] = useState<'STALLION' | 'NOMAD' | 'WORKHORSE'>('NOMAD');
  
  const [currentVibration, setCurrentVibration] = useState<number | null>(null);
  const [rpm, setRpm] = useState(0);
  const [temp, setTemp] = useState(85);
  const [ltft, setLtft] = useState(0);
  const [healthScore, setHealthScore] = useState(100);
  
  const [tokenUsage, setTokenUsage] = useState(54000);

  const lastAiCallTimestamp = useRef(0);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const db = useFirestore();
  const { user } = useUser();
  const logo = PlaceHolderImages.find(img => img.id === 'autex-logo');

  const addAiLog = useCallback((message: string, type: AiLogEntry['type'] = 'info') => {
    setAiLogs(prev => [{
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      message,
      type,
      persona: type === 'brain' ? persona : undefined
    }, ...prev].slice(0, 30));
  }, [persona]);

  const userProfileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: userProfile } = useDoc(userProfileRef);
  const hasGreenBox = userProfile?.hasGreenBox || false;

  const readingsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'readings'), orderBy('timestamp', 'desc'), limit(50));
  }, [db]);

  const { data: dbReadings } = useCollection(readingsQuery);

  const allReadings = useMemo(() => {
    return (dbReadings || [])
      .map(doc => ({
        timestamp: typeof doc.timestamp === 'number' ? doc.timestamp : Date.now(),
        value: doc.value,
        rpm: doc.rpm || 0,
        temp: doc.temp || 0,
        ltft: doc.ltft || 0
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [dbReadings]);

  useEffect(() => {
    if (currentVibration !== null) {
      setHealthScore(calculateHealthScore(currentVibration, temp, ltft));
    }
  }, [currentVibration, temp, ltft]);

  const handleVisualScanResult = (result: VisualDiagnosticOutput) => {
    addAiLog(`Visual Audit Complete: ${result.identification}. Diagnosis: ${result.diagnosis}. Confidence: ${Math.round(result.confidence * 100)}%`, 'brain');
    setTokenUsage(prev => prev + 12000); // Visual scans are token-heavy
    setInferenceCount(prev => prev + 1);
    
    // Add to alerts list if severity is high or critical
    if (result.severity === 'high' || result.severity === 'critical') {
      setAlerts(prev => [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        isAnomaly: true,
        anomalyType: `Visual: ${result.identification}`,
        classification: result.diagnosis,
        severity: result.severity,
        recommendation: result.recommendation,
        advice: result.recommendation,
        trace: result
      }, ...prev]);
    }
  };

  const handleNewReading = useCallback(async (value: number, telemetry: TelemetryPayload = {}) => {
    const timestamp = Date.now();
    const source = telemetry.source || 'simulation';
    const simulatedTelemetry = source === 'hardware' ? undefined : createSimulatedTelemetry(value);
    const newRpm = telemetry.rpm ?? simulatedTelemetry?.rpm ?? 0;
    const newTemp = telemetry.temp ?? simulatedTelemetry?.temp ?? temp;
    const newLtft = telemetry.ltft ?? simulatedTelemetry?.ltft ?? ltft;

    const projectedHealthScore = calculateHealthScore(value, newTemp, newLtft);

    setCurrentVibration(value);
    setRpm(newRpm);
    setTemp(newTemp);
    setLtft(newLtft);

    const mpaeDecision = runMpaeDecision({
      vibration: value,
      rpm: newRpm,
      temp: newTemp,
      ltft: newLtft,
      healthScore: projectedHealthScore,
    }, { horizonSteps: isCriticalReading(value, newLtft, thresholds.max) ? 50 : 20 });

    if (mpaeDecision.recommendedStrategy !== 'monitor') {
      addAiLog(`MPAE ${mpaeDecision.recommendedStrategy.toUpperCase()} | ${mpaeDecision.rationale}`, 'brain');
    }

    if (db) {
      try {
        await addDoc(collection(db, 'readings'), {
          sensorId: source === 'hardware' ? 'OBD-LIVE-01' : 'OBD-SIM-01',
          value,
          rpm: newRpm,
          temp: newTemp,
          ltft: newLtft,
          source,
          mpae: mpaeDecision,
          timestamp,
          machineId: 'VIN-AUTEX-001'
        });
      } catch (error) {
        console.error('Failed to persist telemetry reading:', error);
        addAiLog('Black Box Ledger write failed; continuing with local telemetry buffer.', 'error');
        toast({
          variant: 'destructive',
          title: 'Ledger Sync Failed',
          description: 'Telemetry is still visible locally, but Firestore did not accept this reading.',
        });
      }
    }

    const isCritical = isCriticalReading(value, newLtft, thresholds.max);
    const triggerAi = value > thresholds.max || value < thresholds.min || Math.abs(newLtft) > 10 || mpaeDecision.maintenancePriority >= 55;
    
    if (triggerAi) {
      const now = Date.now();
      const requiredInterval = isCritical ? CRITICAL_AI_INTERVAL : MIN_AI_INTERVAL;
      if (now - lastAiCallTimestamp.current > requiredInterval) {
        setIsAnalyzing(true);
        lastAiCallTimestamp.current = now;
        addAiLog(`${source.toUpperCase()} telemetry breach. Load: ${value.toFixed(1)}%, LTFT: ${newLtft.toFixed(1)}%. Running ${persona} Strategist.`, 'brain');
        try {
          const detectionResult = await detectAndClassifyAnomalies({
            sensorId: 'OBD-RPM-01',
            value,
            rpm: newRpm,
            temp: newTemp,
            ltft: newLtft,
            timestamp,
            thresholds,
            historicalContext: allReadings.slice(-5)
          });
          
          if (detectionResult.isAnomaly) {
            const explanationResult = await generateAnomalyExplanation({
              vibrationValue: value,
              anomalyDetails: detectionResult.anomalyType || 'Engine Instability',
              machineType: 'Toyota Etios (2014)'
            });
            
            setTokenUsage(prev => prev + 4800);
            setInferenceCount(prev => prev + 1);

            setAlerts(prev => [{
              ...detectionResult,
              id: crypto.randomUUID(),
              timestamp,
              advice: explanationResult.recommendation,
              part_details: explanationResult.part_details,
              trace: { detectionResult, explanationResult, mpaeDecision },
              mpae: mpaeDecision
            }, ...prev]);
          }
        } catch (error) {
          console.error('AI diagnostic pipeline failed:', error);
          addAiLog("Reasoning pipeline failed. Falling back to local perception.", 'error');
          toast({
            variant: 'destructive',
            title: 'AI Diagnostic Failed',
            description: 'Local thresholds remain active while cloud reasoning recovers.',
          });
        } finally { 
          setIsAnalyzing(false); 
        }
      }
    }
  }, [allReadings, thresholds, db, addAiLog, persona, temp, ltft, toast]);

  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'ar' : 'en');

  const translations = {
    en: {
      title: "Autex CAR-bench",
      monitor: "Monitor",
      alerts: "Alerts",
      insights: "ROI",
      proof: "Proof",
      reports: "Logs",
      settings: "Config",
      situation: "Core",
      ai_log: "A2A Reasoning Evidence"
    },
    ar: {
      title: "أوتيكس CAR-bench",
      monitor: "المراقب",
      alerts: "تنبيهات",
      insights: "عائد",
      proof: "إثبات",
      reports: "سجلات",
      settings: "إعدادات",
      situation: "النواة",
      ai_log: "أدلة الاستدلال A2A"
    }
  };

  const t = translations[language];

  return (
    <SidebarProvider>
      <div className="flex w-full overflow-hidden h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <DashboardSidebar language={language} hasGreenBox={hasGreenBox} />
        <SidebarInset className="flex flex-col bg-background">
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              {logo && (
                <div className="relative h-7 w-7 overflow-hidden rounded-md bg-black hidden xs:block">
                  <Image src={logo.imageUrl} alt="Autex Logo" fill sizes="28px" className="object-cover invert opacity-80" data-ai-hint="automotive logo" />
                </div>
              )}
              <div className="flex flex-col">
                <h1 className="text-xs sm:text-sm font-bold tracking-tight truncate max-w-[100px] xs:max-w-none">{t.title}</h1>
                <Badge variant="outline" className="text-[7px] h-3 w-fit border-emerald-500/50 text-emerald-500">CAR-BENCH FINALIST</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 border-r border-border h-8">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">{t.situation}:</span>
                <div className="flex gap-1">
                  {(['STALLION', 'NOMAD', 'WORKHORSE'] as const).map(p => (
                    <Button key={p} variant={persona === p ? "default" : "outline"} size="sm" className={`h-5 text-[8px] px-1.5 ${persona === p ? 'bg-accent' : 'opacity-50'}`} onClick={() => setPersona(p)}>
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="hidden lg:flex flex-col items-end border-r border-border px-4 h-8 justify-center">
                <span className="text-[8px] text-muted-foreground uppercase font-bold">Inference Budget</span>
                <span className="text-[10px] font-mono font-bold text-accent">{(tokenUsage/1000).toFixed(1)}K / 500K</span>
              </div>

              <VisualScanModal onScanComplete={handleVisualScanResult} language={language} />

              <Button variant="ghost" size="icon" onClick={toggleLanguage} className="h-8 w-8 text-muted-foreground">
                <Languages className="h-4 w-4" />
              </Button>
              <ConnectionStatus isConnected={isConnected} onToggleConnection={setIsConnected} onNewReading={handleNewReading} language={language} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
            <KpiCards activeAlertsCount={alerts.length} inferenceCount={inferenceCount} healthScore={healthScore} rpm={rpm} temp={temp} language={language} />

            <Tabs defaultValue="monitor" className="space-y-4">
              <div className="w-full overflow-x-auto pb-1">
                <TabsList className="flex w-max min-w-full bg-muted/20 p-1 h-9">
                  <TabsTrigger value="monitor" className="gap-1.5 px-3 text-[10px] sm:text-xs"><Gauge className="h-3.5 w-3.5" /> {t.monitor}</TabsTrigger>
                  <TabsTrigger value="alerts" className="gap-1.5 px-3 text-[10px] sm:text-xs"><Bell className="h-3.5 w-3.5" /> {t.alerts}</TabsTrigger>
                  <TabsTrigger value="insights" className="gap-1.5 px-3 text-[10px] sm:text-xs"><TrendingUp className="h-3.5 w-3.5" /> {t.insights}</TabsTrigger>
                  <TabsTrigger value="certificate" className="gap-1.5 px-3 text-[10px] sm:text-xs"><ShieldCheck className="h-3.5 w-3.5" /> {t.proof}</TabsTrigger>
                  <TabsTrigger value="reports" className="gap-1.5 px-3 text-[10px] sm:text-xs"><FileText className="h-3.5 w-3.5" /> {t.reports}</TabsTrigger>
                  <TabsTrigger value="settings" className="gap-1.5 px-3 text-[10px] sm:text-xs"><Settings className="h-3.5 w-3.5" /> {t.settings}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="monitor" className="space-y-4 m-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
                    <LiveSensorChart readings={allReadings} thresholds={thresholds} inferenceCount={inferenceCount} lastFaultType={alerts[0]?.anomalyType || null} />
                    
                    <Card className="border-border bg-black/40 font-mono relative overflow-hidden">
                      <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-3 w-3 text-accent" />
                          <span className="font-bold uppercase tracking-widest text-[9px] text-muted-foreground">{t.ai_log}</span>
                        </div>
                        {isAnalyzing && (
                          <div className="flex items-center gap-1 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/30">
                            <Loader2 className="h-2.5 w-2.5 text-yellow-400 animate-spin" />
                            <span className="text-[8px] text-yellow-400 font-bold uppercase">Reasoning Chain Active</span>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-48 sm:h-64 p-3" ref={logScrollRef}>
                          <div className="space-y-1">
                            {aiLogs.length === 0 && <p className="text-muted-foreground/30 italic text-[9px] text-center py-8">Awaiting sensor ingestion...</p>}
                            {aiLogs.map(log => <TypedLogEntry key={log.id} log={log} />)}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-1">
                    <AlertList alerts={alerts.slice(0, 5)} language={language} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="alerts" className="m-0"><AlertList alerts={alerts} language={language} /></TabsContent>
              <TabsContent value="insights" className="m-0"><MaintenanceInsights readings={allReadings} alerts={alerts} language={language} /></TabsContent>
              <TabsContent value="certificate" className="m-0"><HealthCertificate healthScore={healthScore} machineId="VIN-AUTEX-001" language={language} /></TabsContent>
              <TabsContent value="reports" className="space-y-4 m-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <ReportUploader />
                  <div className="lg:col-span-2"><ReportList /></div>
                </div>
              </TabsContent>
              <TabsContent value="settings" className="m-0"><ThresholdSettings thresholds={thresholds} onUpdate={setThresholds} /></TabsContent>
            </Tabs>
          </main>
          
          <DiagnosticChat currentSensors={{ rpm, vibration: currentVibration || 0, temp, healthScore }} language={language} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
