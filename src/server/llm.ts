import dotenv from 'dotenv';
dotenv.config();

export interface GroqCompletionOptions {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  temperature?: number;
}

const GROQ_MODELS_TO_TRY = [
  process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
];

export async function generateGroqCompletion(options: GroqCompletionOptions): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const system = options.systemPrompt || 'You are an AI Opportunity Intelligence Engine for Peter Grigoryev.';
  
  for (const model of GROQ_MODELS_TO_TRY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: options.prompt },
          ],
          temperature: options.temperature ?? 0.2,
          ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Groq API model ${model} returned ${response.status}: ${errText.slice(0, 150)}`);
        continue; // Try next model in list
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return content.trim();
      }
    } catch (err: any) {
      console.warn(`Groq request failed for model ${model}:`, err.message);
    }
  }

  return null;
}
