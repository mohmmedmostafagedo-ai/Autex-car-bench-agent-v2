
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnomalyAlert } from './monitoring-dashboard';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Package, 
  MapPin, 
  Database,
  Search,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { VoiceBriefingButton } from './voice-briefing-button';
import { Button } from '@/components/ui/button';

interface AlertListProps {
  alerts: AnomalyAlert[];
  language?: 'en' | 'ar';
}

export function AlertList({ alerts, language = 'en' }: AlertListProps) {
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  if (alerts.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-transparent">
        <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-4" />
        <CardTitle className="text-muted-foreground font-medium">No active alerts detected</CardTitle>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          The vehicle is operating within safe parameters. All sensor streams are stable.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Active Incident Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="flex flex-col divide-y divide-border">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      alert.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                      alert.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
                      'bg-accent/20 text-accent'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{alert.anomalyType}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="uppercase text-[10px]">
                    {alert.severity}
                  </Badge>
                </div>

                <div className="ml-11 mt-3 space-y-4">
                  {alert.advice && (
                    <div className="bg-accent/10 p-3 rounded-lg border border-accent/20 relative group/voice">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3 w-3 text-accent" />
                          <span className="text-xs font-bold text-accent uppercase">MAINTENANCE RECOMMENDATION</span>
                        </div>
                        <VoiceBriefingButton 
                          text={`${alert.anomalyType}. ${alert.advice}`} 
                          language={language}
                          className="h-6 w-6 text-accent hover:bg-accent/20"
                        />
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90 font-medium">
                        {alert.advice}
                      </p>
                    </div>
                  )}

                  {alert.part_details && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/30 p-2 rounded-md border border-border/50">
                      <div className="flex items-center gap-2 text-xs">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">ID:</span>
                        <span className="font-mono font-medium">{alert.part_details.id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">LOC:</span>
                        <span className="font-medium">{alert.part_details.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">STOCK:</span>
                        <span className={`font-bold ${alert.part_details.stock < 5 ? 'text-destructive' : 'text-emerald-500'}`}>
                          {alert.part_details.stock}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {alert.classification && (
                      <Badge variant="outline" className="bg-background/50 text-[10px] font-normal">
                        Malfunction: {alert.classification}
                      </Badge>
                    )}
                    
                    {alert.trace && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-[9px] gap-1 text-accent uppercase font-bold hover:bg-accent/10"
                        onClick={() => setExpandedTrace(expandedTrace === alert.id ? null : alert.id)}
                      >
                        <Search className="h-2.5 w-2.5" />
                        {expandedTrace === alert.id ? 'Hide Technical Trace' : 'View Technical Trace'}
                        {expandedTrace === alert.id ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                      </Button>
                    )}
                  </div>

                  {expandedTrace === alert.id && alert.trace && (
                    <div className="mt-2 bg-black p-3 rounded-md border border-accent/20 font-mono text-[9px] text-accent/80 overflow-x-auto">
                      <div className="flex items-center gap-2 mb-2 border-b border-accent/20 pb-1">
                        <BrainCircuit className="h-3 w-3" />
                        <span>AI REASONING TRACE (RAW OUTPUT)</span>
                      </div>
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(alert.trace, null, 2)}
                      </pre>
                      <div className="mt-2 pt-2 border-t border-accent/20 flex items-center gap-2 italic text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        <span>Confidence Level verified by Edge-to-Cloud handshake.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
