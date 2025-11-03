import { GoogleGenAI, Type } from "@google/genai";
import type { NodeMemory, SeverityScore } from '../types';

// Cache for API responses
const memoryCache = new Map<string, NodeMemory>();
const severityCache = new Map<string, SeverityScore[]>();
const expandCache = new Map<string, { consequences: string[]; responses: string[] }>();

// If no API key is provided (common during local dev), fall back to deterministic mocks
const API_KEY = (process.env as any).API_KEY as string | undefined;
const isMock = !API_KEY;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Declare exported symbols and assign implementations below.
export let generateInitialBranches: () => Promise<string[]>;
export let expandNode: (nodeLabel: string, parentChain?: string[]) => Promise<{ consequences: string[]; responses: string[] }>;
export let getNodeMemory: (nodeLabel: string, parentChain?: string[]) => Promise<NodeMemory>;
export let getSeverityScores: (nodeLabel: string, parentChain?: string[]) => Promise<SeverityScore[]>;

if (isMock) {
  // --- Mock implementations for local development ---
  generateInitialBranches = async (): Promise<string[]> => {
    await wait(300);
    return [
      "Government Crackdown",
      "Economic Disruption",
      "Community Polarization",
      "Transport Shutdowns",
      "Online Misinformation Spread",
      "Public Health Strain",
      "School Closures"
    ];
  };

  expandNode = async (nodeLabel: string, parentChain: string[] = []): Promise<{ consequences: string[]; responses: string[] }> => {
    // Check cache first (cache key includes the chain for context-specific results)
    const cacheKey = parentChain.length > 0 ? `${nodeLabel}|${parentChain.join('>')}` : nodeLabel;
    if (expandCache.has(cacheKey)) {
      console.log(`[Cache Hit] expandNode: ${nodeLabel}`);
      return expandCache.get(cacheKey)!;
    }
    
    await wait(300);
    const chainContext = parentChain.length > 0 ? ` (Following: ${parentChain.join(' → ')})` : '';
    const result = {
      consequences: [
        `${nodeLabel}${chainContext} — Supply chain interruptions`,
        `${nodeLabel}${chainContext} — Local business collapse`,
        `${nodeLabel}${chainContext} — Increased civil unrest`
      ],
      responses: [
        `${nodeLabel}${chainContext} — Community-led relief efforts`,
        `${nodeLabel}${chainContext} — Policy interventions and emergency funds`
      ]
    };
    
    // Cache the result
    expandCache.set(cacheKey, result);
    return result;
  };

  getNodeMemory = async (nodeLabel: string): Promise<NodeMemory> => {
    // Check cache first
    if (memoryCache.has(nodeLabel)) {
      console.log(`[Cache Hit] getNodeMemory: ${nodeLabel}`);
      return memoryCache.get(nodeLabel)!;
    }
    
    await wait(200);
    const result = {
      context: `"${nodeLabel}" often manifests as a localized but rapidly compounding disruption — affecting services, livelihoods, and the social fabric of affected communities. In many cases the initial shock reveals systemic weaknesses that magnify downstream impacts.`,
      reflections: [
        `Individuals often experience prolonged economic and psychological harm beyond the immediate event.`,
        `Social trust frays when institutions appear unresponsive, accelerating fragmentation.`,
        `Children and other vulnerable groups typically face the longest recovery timelines.`
      ]
    };
    
    // Cache the result
    memoryCache.set(nodeLabel, result);
    return result;
  };

  getSeverityScores = async (nodeLabel: string): Promise<SeverityScore[]> => {
    // Check cache first
    if (severityCache.has(nodeLabel)) {
      console.log(`[Cache Hit] getSeverityScores: ${nodeLabel}`);
      return severityCache.get(nodeLabel)!;
    }
    
    await wait(200);
    const categories = [
      'Governance',
      'Economy',
      'Infrastructure',
      'Security',
      'Society',
      'Family & Youth'
    ];

    // deterministic pseudo-scores based on label length
    const base = Math.min(8, Math.max(2, Math.floor(nodeLabel.length % 10)));
    const result = categories.map((c, i) => ({ category: c, institutional: Math.max(0, Math.min(10, base + (i % 3) - 1)), human: Math.max(0, Math.min(10, base + ((i + 1) % 4) - 2)) }));
    
    // Cache the result
    severityCache.set(nodeLabel, result);
    return result;
  };

} else {
  // --- Real Gemini-backed implementations ---
  let ai: GoogleGenAI;

  const getAiClient = (): GoogleGenAI => {
    if (!ai) {
      ai = new GoogleGenAI({ apiKey: API_KEY! });
    }
    return ai;
  };

  const model = 'gemini-2.5-flash';

  const generateWithRetries = async <T,>(prompt: string, schema: any, maxRetries = 3): Promise<T> => {
    let attempt = 0;
    const client = getAiClient();

    while (attempt < maxRetries) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.5,
          },
        });

        let text = (response as any).text?.trim?.() ?? '';
        if (text.startsWith('```json')) {
          text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
          text = text.substring(3, text.length - 3).trim();
        }

        return JSON.parse(text) as T;
      } catch (error) {
        console.error(`Gemini API call failed on attempt ${attempt + 1}:`, error);
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error('Failed to generate content from Gemini API after multiple retries.');
        }
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
    throw new Error('Exhausted all retries for Gemini API call.');
  };

  generateInitialBranches = async (): Promise<string[]> => {
    const prompt = `Based on the central event "National Riots for Democracy", identify 7 primary categories of cascading societal effects. For each category, provide one concise, impactful label for the initial effect. The categories are: Politics/Governance, Economy/Livelihoods, Social Cohesion/Security, Infrastructure/Mobility, Digital Communication, Family Life/Health, Children/Education. Return a JSON array of 7 strings, one for each category in order.`;
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'A concise label for a primary societal effect.',
      },
    };
    return generateWithRetries<string[]>(prompt, schema);
  };

  expandNode = async (nodeLabel: string, parentChain: string[] = []): Promise<{ consequences: string[]; responses: string[] }> => {
    // Check cache first (cache key includes the chain for context-specific results)
    const cacheKey = parentChain.length > 0 ? `${nodeLabel}|${parentChain.join('>')}` : nodeLabel;
    if (expandCache.has(cacheKey)) {
      console.log(`[Cache Hit] expandNode: ${nodeLabel}`);
      return expandCache.get(cacheKey)!;
    }
    
    // Build context from parent chain
    let contextPrompt = '';
    if (parentChain.length > 0) {
      contextPrompt = `\n\nCascading chain context (what led to this):
${parentChain.map((node, i) => `${i + 1}. ${node}`).join('\n')}
→ ${nodeLabel}

Based on this specific cascading chain, identify what "${nodeLabel}" would directly cause next.`;
    }
    
    const prompt = `The societal effect "${nodeLabel}" has occurred${parentChain.length > 0 ? ' as part of a cascading sequence' : ''}.${contextPrompt}

Analyze what "${nodeLabel}" would directly cause next in the cascading effect chain. Consider the cumulative impact of the preceding events.

Generate distinct and plausible direct outcomes. Provide two categories in a JSON object:
- "consequences": an array of 3 direct, negative outcomes that "${nodeLabel}" specifically causes
- "responses": an array of 2 positive or adaptive societal/community responses to mitigate "${nodeLabel}"

Each outcome should be a concise, specific label (not generic) that shows clear causation from "${nodeLabel}".`;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        consequences: {
          type: Type.ARRAY,
          description: 'An array of 3 direct, negative outcomes caused by this specific effect.',
          items: { type: Type.STRING },
        },
        responses: {
          type: Type.ARRAY,
          description: 'An array of 2 positive or adaptive societal responses to this specific effect.',
          items: { type: Type.STRING },
        },
      },
    };
    
    const result = await generateWithRetries<{ consequences: string[]; responses: string[] }>(prompt, schema);
    
    // Cache the result
    expandCache.set(cacheKey, result);
    return result;
  };

  getNodeMemory = async (nodeLabel: string): Promise<NodeMemory> => {
    // Check cache first
    if (memoryCache.has(nodeLabel)) {
      console.log(`[Cache Hit] getNodeMemory: ${nodeLabel}`);
      return memoryCache.get(nodeLabel)!;
    }
    
    const prompt = `Analyze the societal effect: "${nodeLabel}". Provide a detailed response in JSON format. The JSON object should have two keys: "context", a single paragraph explaining what this effect entails in a real-world scenario, and "reflections", an array of 3 short, insightful sentences about the deeper, often unseen human consequences of this effect.`;
    const schema = {
      type: Type.OBJECT,
      properties: {
        context: {
          type: Type.STRING,
          description: 'A paragraph explaining the effect in a real-world scenario.',
        },
        reflections: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: 'An insightful sentence on human consequences.',
          },
          description: 'An array of 3 insightful reflections.',
        },
      },
    };
    
    const result = await generateWithRetries<NodeMemory>(prompt, schema);
    
    // Cache the result
    memoryCache.set(nodeLabel, result);
    return result;
  };

  getSeverityScores = async (nodeLabel: string): Promise<SeverityScore[]> => {
    // Check cache first
    if (severityCache.has(nodeLabel)) {
      console.log(`[Cache Hit] getSeverityScores: ${nodeLabel}`);
      return severityCache.get(nodeLabel)!;
    }
    
    const prompt = `For the societal effect "${nodeLabel}", assess its severity on a scale of 0 (no impact) to 10 (critical impact). Provide scores for two layers: "Institutional Stress" and "Human Impact". Evaluate across these 6 domains: Governance, Economy, Infrastructure, Security, Society, Family & Youth. Return a JSON array of objects, where each object has "category", "institutional", and "human" keys.`;
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          institutional: { type: Type.NUMBER },
          human: { type: Type.NUMBER },
        },
        required: ['category', 'institutional', 'human'],
      },
    };
    
    const result = await generateWithRetries<SeverityScore[]>(prompt, schema);
    
    // Cache the result
    severityCache.set(nodeLabel, result);
    return result;
  };

}