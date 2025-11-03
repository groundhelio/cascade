import { GoogleGenAI, Type } from "@google/genai";
import type { NodeMemory, SeverityScore } from '../types';

let ai: GoogleGenAI;

// Lazily initialize the AI client to ensure API_KEY is available when needed.
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: API_KEY });
    }
    return ai;
};

const model = 'gemini-2.5-flash';

const generateWithRetries = async <T,>(prompt: string, schema: any, maxRetries = 3): Promise<T> => {
  let attempt = 0;
  const client = getAiClient(); // Get client instance just-in-time

  while (attempt < maxRetries) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.5,
        },
      });
      
      let text = response.text.trim();
      // Clean up potential markdown wrappers from the response
      if (text.startsWith("```json")) {
        text = text.substring(7, text.length - 3).trim();
      } else if (text.startsWith("```")) {
        text = text.substring(3, text.length - 3).trim();
      }

      return JSON.parse(text) as T;
    } catch (error) {
      console.error(`Gemini API call failed on attempt ${attempt + 1}:`, error);
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error("Failed to generate content from Gemini API after multiple retries.");
      }
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
  throw new Error("Exhausted all retries for Gemini API call.");
};

export const generateInitialBranches = async (): Promise<string[]> => {
  const prompt = `Based on the central event "National Riots for Democracy", identify 7 primary categories of cascading societal effects. For each category, provide one concise, impactful label for the initial effect. The categories are: Politics/Governance, Economy/Livelihoods, Social Cohesion/Security, Infrastructure/Mobility, Digital Communication, Family Life/Health, Children/Education. Return a JSON array of 7 strings, one for each category in order.`;
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.STRING,
      description: 'A concise label for a primary societal effect.'
    }
  };
  return generateWithRetries<string[]>(prompt, schema);
};

export const expandNode = async (nodeLabel: string): Promise<{ consequences: string[], responses: string[] }> => {
  const prompt = `The societal effect "${nodeLabel}" has occurred. Generate distinct and plausible cascading outcomes. Provide two categories in a JSON object: "consequences", an array of 3 direct, negative outcomes, and "responses", an array of 2 positive or adaptive societal/community responses to mitigate the effect. Each outcome should be a concise label.`;
  const schema = {
    type: Type.OBJECT,
    properties: {
      consequences: {
        type: Type.ARRAY,
        description: 'An array of 3 direct, negative outcomes.',
        items: { type: Type.STRING }
      },
      responses: {
        type: Type.ARRAY,
        description: 'An array of 2 positive or adaptive societal responses.',
        items: { type: Type.STRING }
      }
    }
  };
  return generateWithRetries<{ consequences: string[], responses: string[] }>(prompt, schema);
};

export const getNodeMemory = async (nodeLabel: string): Promise<NodeMemory> => {
  const prompt = `Analyze the societal effect: "${nodeLabel}". Provide a detailed response in JSON format. The JSON object should have two keys: "context", a single paragraph explaining what this effect entails in a real-world scenario, and "reflections", an array of 3 short, insightful sentences about the deeper, often unseen human consequences of this effect.`;
  const schema = {
    type: Type.OBJECT,
    properties: {
      context: {
        type: Type.STRING,
        description: 'A paragraph explaining the effect in a real-world scenario.'
      },
      reflections: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          description: 'An insightful sentence on human consequences.'
        },
        description: 'An array of 3 insightful reflections.'
      }
    }
  };
  return generateWithRetries<NodeMemory>(prompt, schema);
};

export const getSeverityScores = async (nodeLabel: string): Promise<SeverityScore[]> => {
    const prompt = `For the societal effect "${nodeLabel}", assess its severity on a scale of 0 (no impact) to 10 (critical impact). Provide scores for two layers: "Institutional Stress" and "Human Impact". Evaluate across these 9 domains: Governance Stability, Economic Function, Infrastructure & Mobility, Public Safety & Security, Social Cohesion, Family Stability, Child & Youth Wellbeing, Health & Humanitarian Access, and Information & Expression Freedom. Return a JSON array of objects, where each object has "category", "institutional", and "human" keys.`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                category: { type: Type.STRING },
                institutional: { type: Type.NUMBER },
                human: { type: Type.NUMBER }
            },
            required: ['category', 'institutional', 'human']
        }
    };
    return generateWithRetries<SeverityScore[]>(prompt, schema);
};