"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { BellRing, ShieldCheck, ThermometerSnowflake, Zap } from 'lucide-react';

interface ThresholdSettingsProps {
  thresholds: { min: number; max: number };
  onUpdate: (thresholds: { min: number; max: number }) => void;
}

export function ThresholdSettings({ thresholds, onUpdate }: ThresholdSettingsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-border bg-card/40">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg">Vibration Thresholds</CardTitle>
          </div>
          <CardDescription>
            Configure boundaries for anomaly triggering. Values outside these ranges will invoke AI analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Upper Bound (High Intensity)</Label>
              <span className="text-sm font-mono text-accent font-bold">{thresholds.max} m/s²</span>
            </div>
            <Slider 
              defaultValue={[thresholds.max]} 
              max={120} 
              step={1} 
              onValueChange={([val]) => onUpdate({ ...thresholds, max: val })}
              className="py-4"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Lower Bound (Critical Underrun)</Label>
              <span className="text-sm font-mono text-accent font-bold">{thresholds.min} m/s²</span>
            </div>
            <Slider 
              defaultValue={[thresholds.min]} 
              max={50} 
              step={1} 
              onValueChange={([val]) => onUpdate({ ...thresholds, min: val })}
              className="py-4"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/40">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <BellRing className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg">Alert Policies</CardTitle>
          </div>
          <CardDescription>
            Customize how notifications are handled for detected anomalies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-semibold">Immediate AI Breakdown</Label>
              <p className="text-xs text-muted-foreground">
                Automatically generate detailed technical reports on every anomaly.
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-semibold">Firebase Cloud Logging</Label>
              <p className="text-xs text-muted-foreground">
                Sync all sensor readings to the Realtime Database for audit.
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-semibold">Strict Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">
                Lock machine interface upon critical anomaly detection.
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
