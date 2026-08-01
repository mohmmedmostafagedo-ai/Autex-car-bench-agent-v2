'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, CheckCircle2, AlertTriangle, ArrowRight, BrainCircuit } from 'lucide-react';
import { visualDiagnostic, VisualDiagnosticOutput } from '@/ai/flows/visual-diagnostic-flow';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

interface VisualScanModalProps {
  onScanComplete: (result: VisualDiagnosticOutput) => void;
  language?: 'en' | 'ar';
}

export function VisualScanModal({ onScanComplete, language = 'en' }: VisualScanModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VisualDiagnosticOutput | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runVisualScan = async () => {
    if (!preview) return;
    setIsScanning(true);
    try {
      const response = await visualDiagnostic({
        photoDataUri: preview,
        description: "User initiated visual inspection via mobile command."
      });
      setResult(response);
      onScanComplete(response);
    } catch (error) {
      console.error("Visual scan failed:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
  };

  return (
    <Dialog onOpenChange={(open) => !open && reset()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 border-accent/30 hover:bg-accent/10 text-accent">
          <Camera className="h-4 w-4" />
          <span className="hidden xs:inline">Visual Scan</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-accent" />
            Multi-Modal Visual Inspection
          </DialogTitle>
          <DialogDescription>
            Upload a photo of your engine, a specific part, or your dashboard warning lights for AI analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div 
            className={`relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden bg-muted/20 transition-all ${
              preview ? 'border-accent/50' : 'border-border hover:border-accent/30'
            }`}
            onClick={() => !preview && fileInputRef.current?.click()}
          >
            {preview ? (
              <Image src={preview} alt="Inspection Preview" fill className="object-cover" />
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Select Engine Photo</p>
                <p className="text-[10px] text-muted-foreground/50">Supports JPG, PNG, WEBP</p>
              </>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          {preview && !result && (
            <Button className="w-full gap-2 bg-accent hover:bg-accent/90" onClick={runVisualScan} disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Pixels...
                </>
              ) : (
                <>
                  <BrainCircuit className="h-4 w-4" />
                  Initialize Visual Reasoning
                </>
              )}
            </Button>
          )}

          {result && (
            <ScrollArea className="max-h-[300px] bg-black/40 p-4 rounded-xl border border-accent/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant={result.severity === 'critical' ? 'destructive' : 'secondary'} className="uppercase text-[10px]">
                    {result.severity} Priority
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] text-accent">
                    <CheckCircle2 className="h-3 w-3" />
                    Confidence: {Math.round(result.confidence * 100)}%
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Identification</h4>
                  <p className="text-sm text-foreground">{result.identification}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Diagnosis</h4>
                  <p className="text-sm text-foreground font-semibold">{result.diagnosis}</p>
                </div>

                <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="h-3 w-3 text-accent" />
                    <span className="text-[10px] font-bold text-accent uppercase">Repair Strategy</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/90">
                    {result.recommendation}
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}

          {preview && (
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={reset}>
              Clear Image
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
