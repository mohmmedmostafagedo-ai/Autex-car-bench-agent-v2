
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Link as LinkIcon, Unlink, FlaskConical, Info, Cable, Smartphone, Laptop } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConnectionStatusProps {
  isConnected: boolean;
  onToggleConnection: (connected: boolean) => void;
  onNewReading: (value: number, telemetry?: { rpm?: number; temp?: number; ltft?: number; source?: 'hardware' | 'simulation' | 'test' }) => void;
  language?: 'en' | 'ar';
}

export function ConnectionStatus({ isConnected, onToggleConnection, onNewReading, language = 'en' }: ConnectionStatusProps) {
  const [port, setPort] = useState<any>(null);
  const readerRef = useRef<any>(null);
  const { toast } = useToast();

  const translations = {
    en: {
      hardware: "HARDWARE ACTIVE",
      simulated: "SIMULATED",
      standby: "STANDBY",
      test: "Test Anomaly",
      stop: "Stop",
      connect: "Connect OBD-II",
      mobile_tip: "Mobile Connection Guide",
      mobile_desc: "How to link your vehicle to your phone:",
      android_title: "Android (Direct Link)",
      android_steps: "Use a USB-C OTG adapter. Plug the OBD-II cable into your phone. Use Chrome browser to 'Connect'.",
      ios_title: "iOS (Remote Viewer)",
      ios_steps: "Direct USB is restricted by Apple. Connect the cable to a laptop to log data; this PWA will sync your dashboard in real-time.",
      baud_tip: "Set ELM327 to 38400 or 9600 baud."
    },
    ar: {
      hardware: "الجهاز متصل",
      simulated: "محاكاة",
      standby: "وضع الاستعداد",
      test: "اختبار خلل",
      stop: "إيقاف",
      connect: "اتصال OBD-II",
      mobile_tip: "دليل اتصال الهاتف",
      mobile_desc: "كيفية ربط مركبتك بهاتفك:",
      android_title: "أندرويد (اتصال مباشر)",
      android_steps: "استخدم محول OTG. قم بتوصيل كابل OBD-II بهاتفك. استخدم متصفح كروم للاتصال.",
      ios_title: "آيفون (عرض عن بعد)",
      ios_steps: "اتصال USB المباشر مقيد. قم بتوصيل الكابل بجهاز كمبيوتر؛ وسيقوم هذا التطبيق بمزامنة بياناتك فوراً.",
      baud_tip: "تأكد من ضبط ELM327 على 38400 أو 9600 باود."
    }
  };

  const t = translations[language];

  const connectSerial = async () => {
    if (!('serial' in navigator)) {
      toast({
        variant: "destructive",
        title: "Serial Not Supported",
        description: "Your browser doesn't support Web Serial. Use Chrome on a laptop or OTG Android.",
      });
      return;
    }

    try {
      const selectedPort = await (navigator as any).serial.requestPort();
      // Most OBD-II adapters (ELM327) use 38400 or 9600
      await selectedPort.open({ baudRate: 38400 });
      setPort(selectedPort);
      onToggleConnection(true);
      readFromPort(selectedPort);
      
      toast({
        title: "Vehicle Link Established",
        description: "Black Dragon is now receiving live OBD-II telemetry.",
      });
    } catch (err: any) {
      console.error("Connection failed:", err);
      if (err.name !== 'NotFoundError') {
        onToggleConnection(true);
      }
    }
  };

  const readFromPort = async (selectedPort: any) => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = selectedPort.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;

    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || "";

          for (const line of lines) {
            // Match typical OBD-II responses or raw sensor values
            const numericValue = parseFloat(line.replace(/[^0-9.]/g, '').trim());
            if (!isNaN(numericValue)) {
              onNewReading(numericValue, { source: 'hardware' });
            }
          }
        }
      }
    } catch (error) {
      console.error("Read error:", error);
    } finally {
      reader.releaseLock();
    }
  };

  const disconnectSerial = async () => {
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {}
    }
    if (port) {
      try {
        await port.close();
      } catch (e) {}
    }
    setPort(null);
    onToggleConnection(false);
    toast({
      title: "Hardware Disconnected",
      description: "Returning to simulated standby mode.",
    });
  };

  const triggerAnomaly = () => {
    const fakeVibration = Math.floor(Math.random() * (110 - 85 + 1)) + 85;
    onNewReading(fakeVibration, { source: 'test' });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && !port) {
      interval = setInterval(() => {
        const base = 45;
        const noise = (Math.random() - 0.5) * 10;
        onNewReading(base + noise, { source: 'simulation' });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isConnected, port, onNewReading]);

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground/50 hover:text-accent">
            <Smartphone className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cable className="h-5 w-5 text-accent" />
              {t.mobile_tip}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t.mobile_desc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-2">
              <div className="flex items-center gap-2 font-bold text-accent text-xs">
                <Smartphone className="h-4 w-4" />
                {t.android_title}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t.android_steps}</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-2">
              <div className="flex items-center gap-2 font-bold text-muted-foreground text-xs">
                <Laptop className="h-4 w-4" />
                {t.ios_title}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t.ios_steps}</p>
            </div>
            <p className="text-[10px] text-center italic text-muted-foreground/50">{t.baud_tip}</p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        {isConnected ? (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 py-1 px-3 text-[10px] md:text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {port ? t.hardware : t.simulated}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5 py-1 px-3 text-[10px] md:text-xs">
            <WifiOff className="h-3.5 w-3.5" />
            {t.standby}
          </Badge>
        )}
      </div>
      
      {isConnected && (
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 md:gap-2 h-8 text-[10px] md:text-xs border-accent/30 hover:bg-accent/10 text-accent"
          onClick={triggerAnomaly}
        >
          <FlaskConical className="h-3 md:h-4 w-3 md:w-4" />
          <span className="hidden xs:inline">{t.test}</span>
        </Button>
      )}

      {isConnected ? (
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 md:gap-2 h-8 text-[10px] md:text-xs border-destructive/50 hover:bg-destructive/10 text-destructive"
          onClick={disconnectSerial}
        >
          <Unlink className="h-3 md:h-4 w-3 md:w-4" />
          {t.stop}
        </Button>
      ) : (
        <Button 
          variant="default" 
          size="sm" 
          className="gap-1 md:gap-2 h-8 text-[10px] md:text-xs bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={connectSerial}
        >
          <LinkIcon className="h-3 md:h-4 w-3 md:w-4" />
          {t.connect}
        </Button>
      )}
    </div>
  );
}
