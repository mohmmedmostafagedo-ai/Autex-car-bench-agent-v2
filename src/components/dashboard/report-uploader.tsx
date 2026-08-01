
"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function ReportUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("Manual");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !db) return;

    setUploading(true);
    setProgress(10);

    try {
      // Simulate progress for the prototype
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 300);

      // Save metadata to Firestore
      await addDoc(collection(db, 'reports'), {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: Date.now(),
        machineId: 'CNC-MILL-01',
        category: category
      });

      clearInterval(interval);
      setProgress(100);

      toast({
        title: "Report Registered",
        description: `${file.name} has been added to the system archives.`,
      });

      // Reset
      setTimeout(() => {
        setFile(null);
        setUploading(false);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1000);

    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "Failed to register report metadata.",
      });
      setUploading(false);
    }
  };

  return (
    <Card className="border-border bg-card/40">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5 text-accent" />
          Archive Maintenance Report
        </CardTitle>
        <CardDescription>
          Upload technical manuals, inspection results, or certification documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Document Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manual">Technical Manual</SelectItem>
                <SelectItem value="Inspection">Inspection Report</SelectItem>
                <SelectItem value="Repair Log">Repair Log</SelectItem>
                <SelectItem value="Certification">Certification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              file ? 'border-accent/50 bg-accent/5' : 'border-border hover:border-accent/30 hover:bg-muted/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.png,.jpg"
            />
            {file ? (
              <div className="text-center space-y-2">
                <FileText className="h-10 w-10 text-accent mx-auto" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-medium">Click to browse or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, or Images up to 10MB</p>
              </div>
            )}
          </div>
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing document...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <Button 
          className="w-full gap-2" 
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          {uploading ? (
            <>Processing...</>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Commit to Archive
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
