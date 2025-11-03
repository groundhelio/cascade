import { GoogleGenAI, Type } from "@google/genai";
import type { NodeMemory, SeverityScore } from '../types';
import { loadCacheFromFirebase, saveToCacheFirebase } from './firebaseService';

// Cache for API responses
let memoryCache = new Map<string, NodeMemory>();
let severityCache = new Map<string, SeverityScore[]>();
let expandCache = new Map<string, { consequences: string[]; responses: string[] }>();

// Load caches from Firebase on module initialization
let cachesLoaded = false;
const loadCachesOnce = async () => {
  if (!cachesLoaded) {
    cachesLoaded = true;
    try {
      const caches = await loadCacheFromFirebase();
      memoryCache = caches.memory;
      severityCache = caches.severity;
      expandCache = caches.expand;
      console.log('[Cache] Loaded from Firebase');
    } catch (error) {
      console.error('[Cache] Error loading from Firebase:', error);
    }
  }
};

// Initialize cache loading (non-blocking)
loadCachesOnce().catch(console.error);

// If no API key is provided (common during local dev), fall back to deterministic mocks
const API_KEY = (process.env as any).API_KEY as string | undefined;
const isMock = !API_KEY;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Declare exported symbols and assign implementations below.
export let generateInitialBranches: (country?: string | null) => Promise<string[]>;
export let expandNode: (nodeLabel: string, parentChain?: string[], country?: string | null) => Promise<{ consequences: string[]; responses: string[] }>;
export let getNodeMemory: (nodeLabel: string, parentChain?: string[], country?: string | null) => Promise<NodeMemory>;
export let getSeverityScores: (nodeLabel: string, parentChain?: string[], country?: string | null) => Promise<SeverityScore[]>;

// Export function to clear cache for a specific node (used for refresh)
export const clearNodeCache = (nodeLabel: string, parentChain: string[] = []): void => {
  const cacheKey = parentChain.length > 0 ? `${nodeLabel}|${parentChain.join('>')}` : nodeLabel;
  expandCache.delete(cacheKey);
  console.log(`[Cache] Cleared cache for: ${cacheKey}`);
};

// Export function to clear all caches (used for country context change)
export const clearAllCaches = (): void => {
  memoryCache.clear();
  severityCache.clear();
  expandCache.clear();
  console.log(`[Cache] Cleared all caches`);
};

if (isMock) {
  // --- Mock implementations for local development ---
  generateInitialBranches = async (country?: string | null): Promise<string[]> => {
    await wait(300);
    const contextSuffix = country ? ` in ${country}` : '';
    return [
      `Government Response Measures${contextSuffix}`,
      `Economic Disruption Waves${contextSuffix}`,
      `Social Cohesion Challenges${contextSuffix}`,
      `Infrastructure Strain${contextSuffix}`,
      `Information Ecosystem Changes${contextSuffix}`,
      `Public Health Impact${contextSuffix}`,
      `Educational System Disruption${contextSuffix}`
    ];
  };

  expandNode = async (nodeLabel: string, parentChain: string[] = [], country?: string | null): Promise<{ consequences: string[]; responses: string[] }> => {
    // Check cache first (cache key includes the chain for context-specific results)
    const cacheKey = parentChain.length > 0 ? `${nodeLabel}|${parentChain.join('>')}` : nodeLabel;
    if (expandCache.has(cacheKey)) {
      console.log(`[Cache Hit] expandNode: ${nodeLabel}`);
      return expandCache.get(cacheKey)!;
    }
    
    await wait(300);
    const chainContext = parentChain.length > 0 ? ` (Following: ${parentChain.join(' → ')})` : '';
    const countryContext = country ? ` [${country} Context]` : '';
    const result = {
      consequences: [
        `Critical Supply Chain Breakdown${chainContext}${countryContext}`,
        `Mass Unemployment Crisis${chainContext}${countryContext}`,
        `Escalating Social Unrest${chainContext}${countryContext}`
      ],
      responses: [
        `Emergency Relief Programs${chainContext}${countryContext}`,
        `Community Solidarity Networks${chainContext}${countryContext}`
      ]
    };
    
    // Cache the result
    expandCache.set(cacheKey, result);
    // Save to Firebase (non-blocking)
    saveToCacheFirebase('expand', cacheKey, result).catch(console.error);
    return result;
  };

  getNodeMemory = async (nodeLabel: string, parentChain: string[] = [], country?: string | null): Promise<NodeMemory> => {
    // Check cache first
    if (memoryCache.has(nodeLabel)) {
      console.log(`[Cache Hit] getNodeMemory: ${nodeLabel}`);
      return memoryCache.get(nodeLabel)!;
    }
    
    await wait(200);
    const countryNote = country ? ` This analysis focuses on ${country}'s context.` : '';
    const result = {
      context: `"${nodeLabel}" often manifests as a localized but rapidly compounding disruption — affecting services, livelihoods, and the social fabric of affected communities. In many cases the initial shock reveals systemic weaknesses that magnify downstream impacts.${countryNote}`,
      reflections: [
        `Individuals often experience prolonged economic and psychological harm beyond the immediate event.`,
        `Social trust frays when institutions appear unresponsive, accelerating fragmentation.`,
        `Children and other vulnerable groups typically face the longest recovery timelines.`
      ]
    };
    
    // Cache the result
    memoryCache.set(nodeLabel, result);
    // Save to Firebase (non-blocking)
    saveToCacheFirebase('memory', nodeLabel, result).catch(console.error);
    return result;
  };

  getSeverityScores = async (nodeLabel: string, parentChain: string[] = [], country?: string | null): Promise<SeverityScore[]> => {
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
    // Save to Firebase (non-blocking)
    saveToCacheFirebase('severity', nodeLabel, result).catch(console.error);
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

  generateInitialBranches = async (country?: string | null): Promise<string[]> => {
    const countryContext = country 
      ? `\n\nCOUNTRY CONTEXT: Analyze specifically from ${country}'s perspective. Consider ${country}'s unique political system, economic structure, social dynamics, and cultural context when identifying these effects.`
      : `\n\nProvide general analysis applicable across different countries.`;
    
    const prompt = `Based on the central event "National Riots for Democracy", identify 7 primary categories of cascading societal effects.${countryContext}

For each category, provide one concise, impactful label for the initial effect. These should be NEUTRAL or MIXED in tone (not inherently positive or negative), as they represent the first-level impacts that can lead to both consequences and responses.

The categories are: 
1. Politics/Governance
2. Economy/Livelihoods
3. Social Cohesion/Security
4. Infrastructure/Mobility
5. Digital Communication
6. Family Life/Health
7. Children/Education

Return a JSON array of 7 strings, one for each category in order. Each should describe the initial societal impact or change in that domain.`;
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'A concise, neutral label for a primary societal effect in this category.',
      },
    };
    return generateWithRetries<string[]>(prompt, schema);
  };

  expandNode = async (nodeLabel: string, parentChain: string[] = [], country?: string | null): Promise<{ consequences: string[]; responses: string[] }> => {
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
    
    const countryContext = country
      ? `\n\nCOUNTRY CONTEXT: Analyze from ${country}'s specific perspective. Consider ${country}'s political institutions, economic conditions, social structures, infrastructure capabilities, and cultural norms when identifying these cascading effects.`
      : '';
    
    const prompt = `The societal effect "${nodeLabel}" has occurred${parentChain.length > 0 ? ' as part of a cascading sequence' : ''}.${contextPrompt}${countryContext}

Analyze what "${nodeLabel}" would directly cause next in the cascading effect chain. Consider the cumulative impact of the preceding events.

Generate distinct and plausible direct outcomes. Provide two categories in a JSON object:

**CONSEQUENCES (Negative/Harmful)**: 
- Must be 3 direct NEGATIVE, HARMFUL, or DETERIORATING outcomes
- These represent problems that WORSEN, COMPOUND, or create NEW HARM
- Should reflect disruption, damage, suffering, or systemic breakdown
- Examples: "Mass Unemployment", "Health System Collapse", "Increased Crime Rates"

**RESPONSES (Positive/Adaptive)**:
- Must be 2 POSITIVE, HOPEFUL, or CONSTRUCTIVE societal responses
- These represent interventions, support, resilience, or recovery efforts
- Should reflect community action, policy fixes, aid programs, or rebuilding
- Examples: "Emergency Relief Programs", "Community Solidarity Networks", "Policy Reform Initiatives"

Each outcome should be a concise, specific label that shows clear causation from "${nodeLabel}".

IMPORTANT: Consequences must be negative (darker shades in visualization), responses must be positive (green color in visualization).`;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        consequences: {
          type: Type.ARRAY,
          description: 'An array of 3 NEGATIVE, HARMFUL, or DETERIORATING outcomes that worsen the situation.',
          items: { type: Type.STRING },
        },
        responses: {
          type: Type.ARRAY,
          description: 'An array of 2 POSITIVE, HOPEFUL, or CONSTRUCTIVE interventions that help or heal.',
          items: { type: Type.STRING },
        },
      },
      required: ['consequences', 'responses'],
    };
    
    const result = await generateWithRetries<{ consequences: string[]; responses: string[] }>(prompt, schema);
    
    // Cache the result
    expandCache.set(cacheKey, result);
    // Save to Firebase (non-blocking)
    saveToCacheFirebase('expand', cacheKey, result).catch(console.error);
    return result;
  };

  getNodeMemory = async (nodeLabel: string, parentChain: string[] = [], country?: string | null): Promise<NodeMemory> => {
    // Check cache first
    if (memoryCache.has(nodeLabel)) {
      console.log(`[Cache Hit] getNodeMemory: ${nodeLabel}`);
      return memoryCache.get(nodeLabel)!;
    }
    
    const countryContext = country
      ? ` Focus specifically on ${country}'s context, considering its unique societal, political, and economic landscape.`
      : '';
    
    const prompt = `Analyze the societal effect: "${nodeLabel}".${countryContext} Provide a detailed response in JSON format. The JSON object should have two keys: "context", a single paragraph explaining what this effect entails in a real-world scenario, and "reflections", an array of 3 short, insightful sentences about the deeper, often unseen human consequences of this effect.`;
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
    // Save to Firebase (non-blocking)
    saveToCacheFirebase('memory', nodeLabel, result).catch(console.error);
    return result;
  };

  getSeverityScores = async (nodeLabel: string, parentChain: string[] = [], country?: string | null): Promise<SeverityScore[]> => {
    // Check cache first
    if (severityCache.has(nodeLabel)) {
      console.log(`[Cache Hit] getSeverityScores: ${nodeLabel}`);
      return severityCache.get(nodeLabel)!;
    }
    
    const countryContext = country
      ? ` Assess severity specifically for ${country}, considering its institutional capacity, resilience, and societal vulnerabilities.`
      : '';
    
    const prompt = `For the societal effect "${nodeLabel}", assess its severity on a scale of 0 (no impact) to 10 (critical impact).${countryContext} Provide scores for two layers: "Institutional Stress" and "Human Impact". Evaluate across these 6 domains: Governance, Economy, Infrastructure, Security, Society, Family & Youth. Return a JSON array of objects, where each object has "category", "institutional", and "human" keys.`;
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
    // Save to Firebase (non-blocking)
    saveToCacheFirebase('severity', nodeLabel, result).catch(console.error);
    return result;
  };

}