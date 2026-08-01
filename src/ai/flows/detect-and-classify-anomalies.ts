
'use server';
/**
 * @fileOverview A Genkit flow for detecting and classifying anomalies in automotive engine data.
 * Refined for Toyota Etios 2014 dataset patterns (LTFT and Cold-Run logic).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectAndClassifyAnomaliesInputSchema = z.object({
  sensorId: z.string().describe('The unique identifier for the vehicle sensor.'),
  value: z.number().describe('The current engine load percentage.'),
  rpm: z.number().optional(),
  temp: z.number().optional().describe('Coolant temperature in Celsius.'),
  ltft: z.number().optional().describe('Long Term Fuel Trim percentage.'),
  timestamp: z.number().describe('The Unix timestamp of the sensor reading.'),
  machineId: z.string().optional().describe('Optional: The VIN or Vehicle ID.'),
  historicalContext: z.array(z.object({value: z.number(), timestamp: z.number()})).optional(),
  thresholds: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
});

export type DetectAndClassifyAnomaliesInput = z.infer<typeof DetectAndClassifyAnomaliesInputSchema>;

const DetectAndClassifyAnomaliesOutputSchema = z.object({
  isAnomaly: z.boolean().describe('True if an anomaly is detected.'),
  anomalyType: z.string().optional().describe('The type of anomaly (e.g., "LTFT Drift", "Cold Run Efficiency", "High Load Overrun").'),
  classification: z.string().optional().describe('Mechanical cause (e.g., "O2 Sensor Lag", "Thermostat Stuck", "Normal High Load").'),
  severity: z.enum(['low', 'medium', 'high', 'critical', 'none']).describe('Severity of the issue.'),
  recommendation: z.string().optional().describe('Recommended action.'),
});

export type DetectAndClassifyAnomaliesOutput = z.infer<typeof DetectAndClassifyAnomaliesOutputSchema>;

const anomalyDetectionPrompt = ai.definePrompt({
  name: 'anomalyDetectionPrompt',
  input: {schema: DetectAndClassifyAnomaliesInputSchema},
  output: {schema: DetectAndClassifyAnomaliesOutputSchema},
  prompt: `You are an expert diagnostic AI calibrated for 2014-era fuel-injected vehicles (Toyota Etios platform).
Analyze the following telemetry for anomalies:

Current State:
- Engine Load: {{{value}}}% (Threshold Max: {{{thresholds.max}}})
- Coolant Temp: {{{temp}}}°C
- LTFT: {{{ltft}}}%
- RPM: {{{rpm}}}

Reasoning Protocols:
1. FUEL TRIM: If |LTFT| > 10%, it indicates a lean or rich condition. Classify as "Injector/O2 Performance Issue."
2. COLD RUN: If Temp < 70°C and trip has lasted > 10 mins, flag as "Efficiency Warning: Engine under-temp."
3. LOAD CALIBRATION: Engine loads between 80-92% are NORMAL for this platform during acceleration. Do NOT flag as anomaly unless > {{{thresholds.max}}}.
4. SENSITIVITY: If load is high but LTFT is stable (0-5%), the engine is likely healthy.

Output the diagnostic status.`,
});

export async function detectAndClassifyAnomalies(input: DetectAndClassifyAnomaliesInput): Promise<DetectAndClassifyAnomaliesOutput> {
  const {output} = await anomalyDetectionPrompt(input);
  return output!;
}
