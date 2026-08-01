"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { SensorReading } from './monitoring-dashboard';
import { Activity, Waves } from 'lucide-react';

interface LiveSensorChartProps {
  readings: SensorReading[];
  thresholds: { min: number; max: number };
  inferenceCount: number;
  lastFaultType: string | null;
}

export function LiveSensorChart({ readings, thresholds, inferenceCount, lastFaultType }: LiveSensorChartProps) {
  const [view, setView] = useState<'telemetry' | 'spectrogram'>('telemetry');
  
  const chartData = readings.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: parseFloat(r.value.toFixed(2)),
    rpm: r.rpm,
    temp: r.temp,
    // Simulate spectral power for the spectrogram view
    freq_low: r.value * 0.4 + Math.random() * 5,
    freq_mid: r.value * 0.3 + Math.random() * 10,
    freq_high: r.value * 0.1 + Math.random() * 20
  }));

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm relative overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl font-black uppercase tracking-tight">Spectral Telemetry</CardTitle>
          <CardDescription>Advanced frequency analysis of Sensor ID: VIB-001</CardDescription>
        </div>

        <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-auto">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="telemetry" className="gap-2 text-[10px] uppercase font-bold">
              <Activity className="h-3 w-3" /> Time Domain
            </TabsTrigger>
            <TabsTrigger value="spectrogram" className="gap-2 text-[10px] uppercase font-bold">
              <Waves className="h-3 w-3" /> Spectrogram
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="h-[450px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'telemetry' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="time" hide={chartData.length < 5} fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 120]} fontSize={10} stroke="hsl(var(--muted-foreground))" unit="m/s²" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ fontSize: '10px' }}
              />
              <ReferenceLine y={thresholds.max} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'CRITICAL', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 8 }} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="time" hide={chartData.length < 5} fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar dataKey="freq_low" stackId="a" fill="hsl(var(--accent))" opacity={0.8} isAnimationActive={false} />
              <Bar dataKey="freq_mid" stackId="a" fill="hsl(var(--chart-2))" opacity={0.6} isAnimationActive={false} />
              <Bar dataKey="freq_high" stackId="a" fill="hsl(var(--chart-5))" opacity={0.4} isAnimationActive={false} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>

      <div className="absolute bottom-6 right-6 bg-black/60 p-4 rounded-xl border border-emerald-500/20 backdrop-blur-md shadow-2xl z-20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">AI Edge Engine Active</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black font-mono text-emerald-400">{inferenceCount}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Local Syncs</span> 
        </div> 
        {lastFaultType && ( 
          <div className="text-[10px] text-destructive mt-1 font-bold animate-pulse uppercase"> 
            Fault: {lastFaultType} 
          </div> 
        )}
      </div>
    </Card>
  );
}
