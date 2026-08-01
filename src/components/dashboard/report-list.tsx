
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Calendar, HardDrive, Filter } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';

export function ReportList() {
  const db = useFirestore();
  
  const reportsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'reports'), orderBy('uploadedAt', 'desc'), limit(20));
  }, [db]);

  const { data: reports, loading } = useCollection(reportsQuery);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-12 flex justify-center items-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <FileText className="h-12 w-12 text-muted-foreground/20" />
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-accent" />
          Document Repository
        </CardTitle>
        <Badge variant="outline" className="gap-1 font-normal">
          <Filter className="h-3 w-3" />
          Sorted: Recent
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {reports && reports.length > 0 ? (
            <div className="divide-y divide-border">
              {reports.map((report: any) => (
                <div key={report.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold truncate max-w-[200px] md:max-w-md">
                        {report.fileName}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-tighter">
                          {report.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(report.uploadedAt, 'MMM dd, yyyy')}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {(report.fileSize / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 rounded-full hover:bg-accent/20 text-muted-foreground hover:text-accent transition-all">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto opacity-20 mb-4" />
              <p className="text-sm">No documents archived for this unit yet.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
