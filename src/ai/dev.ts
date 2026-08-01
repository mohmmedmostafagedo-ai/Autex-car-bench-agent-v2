import { config } from 'dotenv';
config();

import '@/ai/flows/generate-anomaly-explanation.ts';
import '@/ai/flows/detect-and-classify-anomalies.ts';
import '@/ai/flows/diagnostic-chat-flow.ts';
import '@/ai/flows/voice-briefing-flow.ts';
import '@/ai/flows/visual-diagnostic-flow.ts';
