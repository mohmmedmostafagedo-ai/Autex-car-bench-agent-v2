
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2 } from 'lucide-react';
import { generateVoiceBriefing } from '@/ai/flows/voice-briefing-flow';

interface VoiceBriefingButtonProps {
  text: string;
  language?: 'en' | 'ar';
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function VoiceBriefingButton({ 
  text, 
  language = 'en', 
  variant = "ghost", 
  size = "icon",
  className,
  showLabel = false
}: VoiceBriefingButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await generateVoiceBriefing({ text, language });
      const audio = new Audio(response.audioDataUri);
      audio.onended = () => setLoading(false);
      await audio.play();
    } catch (error) {
      console.error("Voice briefing failed:", error);
      setLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        handlePlay();
      }}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {showLabel && <span className="ml-2">{loading ? (language === 'ar' ? 'جاري التوليد...' : 'Generating...') : (language === 'ar' ? 'استمع' : 'Listen')}</span>}
    </Button>
  );
}
