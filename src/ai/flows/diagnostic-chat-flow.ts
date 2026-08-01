
'use server';
/**
 * @fileOverview A conversational AI agent for real-time automotive diagnostics.
 *
 * - diagnosticChat - A function that handles the interactive chat session.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Re-using the inventory tool defined in the other flow file or defining it here for modularity
const getInventory = ai.defineTool(
  {
    name: 'getInventory',
    description: 'Queries the warehouse for specific automotive spare parts.',
    inputSchema: z.object({
      partDescription: z.string().describe('The name or description of the part (e.g., "spark plug", "belt")'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Simulated database query
    return JSON.stringify([
      { partId: "SP-X1", part: "High-Performance Spark Plug", stock: 12, price: "$24.99" },
      { partId: "BT-Y2", part: "Serpentine Belt", stock: 3, price: "$45.00" },
      { partId: "SN-Z3", part: "O2 Sensor", stock: 8, price: "$89.99" }
    ]);
  }
);

const DiagnosticChatInputSchema = z.object({
  message: z.string().describe('The user message or question.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional().describe('Chat history for context.'),
  currentSensors: z.object({
    rpm: z.number(),
    vibration: z.number(),
    temp: z.number(),
    healthScore: z.number()
  }).optional().describe('Live sensor data for context.'),
});

export type DiagnosticChatInput = z.infer<typeof DiagnosticChatInputSchema>;

const DiagnosticChatOutputSchema = z.object({
  text: z.string().describe('The AI response message.'),
  actionRequired: z.boolean().describe('Whether a physical repair is suggested.'),
  suggestedParts: z.array(z.string()).optional().describe('List of part IDs suggested for repair.'),
});

export type DiagnosticChatOutput = z.infer<typeof DiagnosticChatOutputSchema>;

const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: DiagnosticChatInputSchema },
  output: { schema: DiagnosticChatOutputSchema },
  tools: [getInventory],
  system: `You are the "Autex" Master AI Mechanic. You are a professional, technical, and helpful automotive expert.
    
    CRITICAL: Use the following LIVE SENSOR DATA in your reasoning. Do NOT use template placeholders like {{{currentSensors.rpm}}} in your final response to the user. Instead, use the actual numbers provided below.

    LIVE DATA:
    - Current RPM: {{currentSensors.rpm}}
    - Current Vibration: {{currentSensors.vibration}} m/s²
    - System Temperature: {{currentSensors.temp}}°C
    - Overall Health Score: {{currentSensors.healthScore}}%

    Instructions:
    1. If the user describes a sound (e.g., ticking, squealing), use your expertise to diagnose the likely mechanical cause.
    2. If the user asks about the live data, reference the specific numbers above (e.g., "Your engine is idling at {{currentSensors.rpm}} RPM...").
    3. Use the getInventory tool if the user asks about parts or if a repair is needed.
    4. Keep the tone authoritative but conversational.
    5. Support both English and Arabic.`,
  prompt: `{{#if history}}
History:
{{#each history}}
{{role}}: {{{content}}}
{{/each}}
{{/if}}
User: {{{message}}}`,
});

export async function diagnosticChat(input: DiagnosticChatInput): Promise<DiagnosticChatOutput> {
  const { output } = await chatPrompt(input);
  if (!output) throw new Error('Failed to generate diagnostic response');
  return output;
}
