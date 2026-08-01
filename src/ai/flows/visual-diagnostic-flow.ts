'use server';
/**
 * @fileOverview A multi-modal AI flow for visual automotive diagnostics.
 * Identifies mechanical issues from photos of engines, parts, or dashboard lights.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VisualDiagnosticInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the engine component or dashboard, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().optional().describe('Additional context from the user.'),
});

const VisualDiagnosticOutputSchema = z.object({
  identification: z.string().describe('What the AI identified in the photo.'),
  diagnosis: z.string().describe('The identified mechanical or electrical issue.'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Severity of the visual issue.'),
  recommendation: z.string().describe('Actionable repair steps.'),
  confidence: z.number().describe('Confidence score of the visual analysis (0-1).'),
});

export type VisualDiagnosticOutput = z.infer<typeof VisualDiagnosticOutputSchema>;

const visualScanPrompt = ai.definePrompt({
  name: 'visualScanPrompt',
  input: {schema: VisualDiagnosticInputSchema},
  output: {schema: VisualDiagnosticOutputSchema},
  prompt: `You are an expert Master Mechanic with advanced computer vision capabilities.
Analyze the provided image of a vehicle component or dashboard.

Context: {{{description}}}

Instructions:
1. Identify the part or warning light shown.
2. Look for signs of: fluid leaks (oil, coolant), belt fraying, corrosion, heat damage, or specific OBD error patterns on a dashboard.
3. Provide a professional technical diagnosis.
4. If the image is unclear, state "Insufficient visual data" in identification and ask for a closer shot.

Image: {{media url=photoDataUri}}`,
});

export async function visualDiagnostic(input: z.infer<typeof VisualDiagnosticInputSchema>): Promise<VisualDiagnosticOutput> {
  const {output} = await visualScanPrompt(input);
  if (!output) throw new Error('Visual diagnostic reasoning failed');
  return output;
}
