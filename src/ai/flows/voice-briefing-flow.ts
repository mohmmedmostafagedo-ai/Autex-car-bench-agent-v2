'use server';
/**
 * @fileOverview A Genkit flow for converting diagnostic text to speech for hands-free maintenance.
 *
 * - generateVoiceBriefing - A function that handles the TTS conversion.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Use require for the 'wav' package to avoid module resolution issues in Next.js/Turbopack
const wav = require('wav');

const VoiceBriefingInputSchema = z.object({
  text: z.string().describe('The diagnostic text to convert to speech.'),
  language: z.enum(['en', 'ar']).default('en'),
});

const VoiceBriefingOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a WAV data URI.'),
});

export async function generateVoiceBriefing(input: z.infer<typeof VoiceBriefingInputSchema>): Promise<z.infer<typeof VoiceBriefingOutputSchema>> {
  return voiceBriefingFlow(input);
}

const voiceBriefingFlow = ai.defineFlow(
  {
    name: 'voiceBriefingFlow',
    inputSchema: VoiceBriefingInputSchema,
    outputSchema: VoiceBriefingOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: `Translate and speak this automotive diagnostic briefing in ${input.language === 'en' ? 'English' : 'Arabic'}: ${input.text}`,
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate audio media');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavData = await toWav(audioBuffer);
    return {
      audioDataUri: 'data:audio/wav;base64,' + wavData,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Creating the wav Writer using the required module
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', function (d: Buffer) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
