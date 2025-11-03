import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, child } from 'firebase/database';
import type { NodeMemory, SeverityScore, GraphData } from '../types';

// Firebase configuration
const firebaseConfig = {
  databaseURL: "https://the-cascade-bd339-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
let app: any;
let database: any;
let isInitialized = false;

export const initializeFirebase = () => {
  if (!isInitialized) {
    try {
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
      isInitialized = true;
      console.log('[Firebase] Initialized successfully');
    } catch (error) {
      console.error('[Firebase] Initialization failed:', error);
      isInitialized = false;
    }
  }
  return isInitialized;
};

// Sanitize cache keys for Firebase (replace special characters)
export const sanitizeKey = (key: string): string => {
  return key
    .replace(/\|/g, '_pipe_')
    .replace(/>/g, '_gt_')
    .replace(/</g, '_lt_')
    .replace(/\//g, '_slash_')
    .replace(/\./g, '_dot_')
    .replace(/#/g, '_hash_')
    .replace(/\$/g, '_dollar_')
    .replace(/\[/g, '_lbracket_')
    .replace(/\]/g, '_rbracket_');
};

export const unsanitizeKey = (key: string): string => {
  return key
    .replace(/_pipe_/g, '|')
    .replace(/_gt_/g, '>')
    .replace(/_lt_/g, '<')
    .replace(/_slash_/g, '/')
    .replace(/_dot_/g, '.')
    .replace(/_hash_/g, '#')
    .replace(/_dollar_/g, '$')
    .replace(/_lbracket_/g, '[')
    .replace(/_rbracket_/g, ']');
};

// Load all caches from Firebase
export const loadCacheFromFirebase = async (): Promise<{
  memory: Map<string, NodeMemory>;
  severity: Map<string, SeverityScore[]>;
  expand: Map<string, { consequences: string[]; responses: string[] }>;
}> => {
  const memory = new Map<string, NodeMemory>();
  const severity = new Map<string, SeverityScore[]>();
  const expand = new Map<string, { consequences: string[]; responses: string[] }>();

  if (!initializeFirebase()) {
    console.warn('[Firebase] Not initialized, returning empty caches');
    return { memory, severity, expand };
  }

  try {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, 'caches'));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Load memory cache
      if (data.memory) {
        Object.entries(data.memory).forEach(([sanitizedKey, value]) => {
          const key = unsanitizeKey(sanitizedKey);
          memory.set(key, value as NodeMemory);
        });
        console.log(`[Firebase] Loaded ${memory.size} memory cache entries`);
      }
      
      // Load severity cache
      if (data.severity) {
        Object.entries(data.severity).forEach(([sanitizedKey, value]) => {
          const key = unsanitizeKey(sanitizedKey);
          severity.set(key, value as SeverityScore[]);
        });
        console.log(`[Firebase] Loaded ${severity.size} severity cache entries`);
      }
      
      // Load expand cache
      if (data.expand) {
        Object.entries(data.expand).forEach(([sanitizedKey, value]) => {
          const key = unsanitizeKey(sanitizedKey);
          expand.set(key, value as { consequences: string[]; responses: string[] });
        });
        console.log(`[Firebase] Loaded ${expand.size} expand cache entries`);
      }
    } else {
      console.log('[Firebase] No cached data found');
    }
  } catch (error) {
    console.error('[Firebase] Error loading caches:', error);
  }

  return { memory, severity, expand };
};

// Save to a specific cache type
export const saveToCacheFirebase = async (
  type: 'memory' | 'severity' | 'expand',
  key: string,
  value: any
): Promise<void> => {
  if (!initializeFirebase()) {
    return; // Silently fail if Firebase not available
  }

  try {
    const sanitizedKey = sanitizeKey(key);
    const cacheRef = ref(database, `caches/${type}/${sanitizedKey}`);
    await set(cacheRef, value);
    console.log(`[Firebase] Saved to ${type} cache: ${key}`);
  } catch (error) {
    console.error(`[Firebase] Error saving to ${type} cache:`, error);
  }
};

// Save graph state to Firebase
export const saveGraphState = async (graphData: GraphData): Promise<void> => {
  if (!initializeFirebase()) {
    return;
  }

  try {
    const graphRef = ref(database, 'graphState');
    await set(graphRef, {
      lastUpdated: Date.now(),
      nodes: graphData.nodes,
      links: graphData.links
    });
    console.log('[Firebase] Saved graph state');
  } catch (error) {
    console.error('[Firebase] Error saving graph state:', error);
  }
};

// Load graph state from Firebase
export const loadGraphState = async (): Promise<GraphData | null> => {
  if (!initializeFirebase()) {
    return null;
  }

  try {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, 'graphState'));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('[Firebase] Loaded graph state');
      return {
        nodes: data.nodes || [],
        links: data.links || []
      };
    } else {
      console.log('[Firebase] No graph state found');
      return null;
    }
  } catch (error) {
    console.error('[Firebase] Error loading graph state:', error);
    return null;
  }
};
