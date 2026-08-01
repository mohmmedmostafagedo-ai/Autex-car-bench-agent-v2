
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Bot, User, Loader2, Sparkles, Wrench, X } from 'lucide-react';
import { diagnosticChat, DiagnosticChatOutput } from '@/ai/flows/diagnostic-chat-flow';
import { Badge } from '@/components/ui/badge';
import { VoiceBriefingButton } from './voice-briefing-button';

interface Message {
  role: 'user' | 'model';
  content: string;
  isAction?: boolean;
}

interface DiagnosticChatProps {
  currentSensors: {
    rpm: number;
    vibration: number;
    temp: number;
    healthScore: number;
  };
  language?: 'en' | 'ar';
}

export function DiagnosticChat({ currentSensors, language = 'en' }: DiagnosticChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: language === 'en' ? "I am the Autex AI Mechanic. How can I assist with your vehicle today?" : "أنا ميكانيكي الذكاء الاصطناعي أوتيكس. كيف يمكنني مساعدتك في مركبتك اليوم؟" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await diagnosticChat({
        message: userMessage,
        currentSensors,
        history: messages.map(m => ({ role: m.role, content: m.content }))
      });

      setMessages(prev => [...prev, { 
        role: 'model', 
        content: response.text,
        isAction: response.actionRequired
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "I encountered a communication error with the vehicle core. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-accent text-accent-foreground hover:scale-110 transition-all z-50 animate-bounce"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[350px] md:w-[400px] h-[500px] shadow-2xl flex flex-col z-50 border-accent/20 overflow-hidden animate-in slide-in-from-bottom-5">
      <CardHeader className="bg-accent text-accent-foreground py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle className="text-sm font-black uppercase">Autex Mechanic AI</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/20" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-0 bg-card/50">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className={msg.role === 'model' ? 'bg-accent/20 text-accent' : 'bg-muted'}>
                    {msg.role === 'model' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed group relative ${
                    msg.role === 'user' 
                      ? 'bg-accent text-accent-foreground rounded-tr-none' 
                      : 'bg-muted text-foreground rounded-tl-none'
                  }`}>
                    {msg.content}
                    {msg.role === 'model' && (
                      <VoiceBriefingButton 
                        text={msg.content} 
                        language={language}
                        className="absolute -right-10 top-0 h-8 w-8 text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    )}
                  </div>
                  {msg.isAction && (
                    <Badge variant="destructive" className="text-[9px] gap-1 px-1.5 py-0">
                      <Wrench className="h-2.5 w-2.5" /> Maintenance Required
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 animate-pulse">
                  <AvatarFallback className="bg-accent/20 text-accent"><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="bg-muted p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  <span className="text-[10px] text-muted-foreground italic font-medium">Analyzing telemetry...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-3 border-t bg-card/80">
        <form 
          className="flex w-full gap-2" 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'en' ? "Describe a sound or ask a question..." : "صف صوتاً أو اطرح سؤالاً..."}
            className="h-9 text-xs bg-muted/50 border-border"
          />
          <Button type="submit" size="icon" className="h-9 w-9 bg-accent" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
      <div className="bg-accent/5 px-3 py-1 flex items-center justify-center gap-2 border-t border-accent/10">
        <Sparkles className="h-3 w-3 text-accent" />
        <span className="text-[9px] text-accent font-bold uppercase tracking-tighter">Live Sensor Sync Active</span>
      </div>
    </Card>
  );
}
