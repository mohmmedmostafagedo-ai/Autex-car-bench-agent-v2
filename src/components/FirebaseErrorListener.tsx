
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // In development, we want to see the rich contextual error
      // In production, we might show a generic message
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: error.message || "You do not have permission to perform this action.",
      });
      
      // We throw the error so it bubbles up to the Next.js error boundary/overlay in dev
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
