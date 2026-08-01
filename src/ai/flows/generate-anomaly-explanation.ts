
'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating automotive maintenance 
 * explanations, integrating engine data with part inventory.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MONGO_API_KEY = process.env.MONGO_DATA_API_KEY;
const MONGO_ENDPOINT = process.env.MONGO_DATA_API_ENDPOINT;

const getInventoryFromMongo = ai.defineTool(
  {
    name: 'getInventoryFromMongo',
    description: 'Fetches available automotive spare parts and stock levels.',
    inputSchema: z.object({
      category: z.string().optional().describe('Filter by part category (e.g., "Ignition", "Cooling")'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const fallbackInventory = [
      { partId: "SP-42", part: "Iridium Spark Plug", stock: 24, location: "Bay 1" },
      { partId: "CO-09", part: "Coolant Expansion Tank", stock: 2, location: "Bay 4" },
      { partId: "SN-12", part: "O2 Sensor - Upstream", stock: 5, location: "Shelf A" }
    ];

    if (!MONGO_API_KEY || !MONGO_ENDPOINT) {
      return JSON.stringify(fallbackInventory);
    }

    try {
      const response = await fetch(MONGO_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'api-key': MONGO_API_KEY 
        },
        body: JSON.stringify({
          collection: "AutomotiveInventory",
          database: "VehicleData",
          dataSource: "Cluster0",
          filter: input.category ? { category: input.category } : {}
        })
      });

      if (!response.ok) {
        return JSON.stringify(fallbackInventory);
      }

      const data = await response.json();
      return JSON.stringify(data.documents || []);
    } catch (error) {
      return JSON.stringify(fallbackInventory);
    }
  }
);

const AnomalyExplanationInputSchema = z.object({
  vibrationValue: z.number().describe('The current engine vibration or load reading.'),
  anomalyDetails: z.string().describe('Type of automotive anomaly detected.'),
  machineType: z.string().default('Passenger Vehicle'),
});

const AnomalyExplanationOutputSchema = z.object({
  status: z.string().describe('Vehicle status (e.g., "Critical", "Warning").'),
  vibration: z.number().describe('The vibration value.'),
  recommendation: z.string().describe('The specific automotive repair recommendation.'),
  part_details: z.object({
    id: z.string().describe('The part ID.'),
    location: z.string().describe('The storage location.'),
    stock: z.number().describe('Stock level.'),
  }).optional().describe('Details about the spare part required.'),
});

const anomalyAdvicePrompt = ai.definePrompt({
  name: 'anomalyAdvicePrompt',
  tools: [getInventoryFromMongo],
  input: { schema: AnomalyExplanationInputSchema },
  output: { schema: AnomalyExplanationOutputSchema },
  prompt: `You are a professional Master Automotive Mechanic AI Agent.
Your goal is to diagnose the vehicle and provide a complete repair strategy.

Current Engine Reading: {{{vibrationValue}}}.
Issue Detected: {{{anomalyDetails}}}.
Vehicle Type: {{{machineType}}}.

Instructions:
1. Use the getInventoryFromMongo tool to find the specific auto part for this repair.
2. Formulate a structured diagnostic response that reasons about the mechanical failure.
3. Keep the recommendation technical, professional, and actionable.
4. Set status to 'Critical' if vibration > 80 (engine instability), otherwise 'Warning'.`,
});

export type AnomalyExplanationOutput = z.infer<typeof AnomalyExplanationOutputSchema>;

export async function generateAnomalyExplanation(
  input: z.infer<typeof AnomalyExplanationInputSchema>
): Promise<AnomalyExplanationOutput> {
  const { output } = await anomalyAdvicePrompt(input);
  if (!output) throw new Error('Failed to generate diagnostic advice');
  return output;
}
