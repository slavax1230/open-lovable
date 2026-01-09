/**
 * OpenRouter Model Service
 * Handles fetching, caching, and filtering of OpenRouter models
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  context_length?: number;
  max_tokens?: number;
  supported_output_types?: string[];
  architecture?: {
    modality?: string;
    tokenizer?: string;
  };
  top_provider?: string;
}

export interface ModelFilter {
  free?: boolean;
  paid?: boolean;
  search?: string;
  type?: 'text' | 'vision' | 'code';
  minContextLength?: number;
  provider?: string;
}

interface CachedModels {
  models: OpenRouterModel[];
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
let cachedModels: CachedModels | null = null;

/**
 * Fetch available models from OpenRouter API
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.warn('[model-service] OPENROUTER_API_KEY not configured');
    return [];
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/firecrawl/open-lovable',
      },
    });

    if (!response.ok) {
      console.error(`[model-service] Failed to fetch models: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[model-service] Error fetching OpenRouter models:', error);
    return [];
  }
}

/**
 * Get models from cache or fetch fresh data
 */
export async function getModels(forceRefresh = false): Promise<OpenRouterModel[]> {
  const now = Date.now();

  if (!forceRefresh && cachedModels && (now - cachedModels.timestamp) < CACHE_DURATION) {
    return cachedModels.models;
  }

  const models = await fetchOpenRouterModels();
  
  if (models.length > 0) {
    cachedModels = {
      models,
      timestamp: now,
    };
  }

  return models;
}

/**
 * Filter models based on criteria
 */
export function filterModels(models: OpenRouterModel[], filter: ModelFilter): OpenRouterModel[] {
  return models.filter((model) => {
    // Filter by pricing
    if (filter.free === true) {
      if (model.pricing.prompt !== 0 || model.pricing.completion !== 0) {
        return false;
      }
    } else if (filter.paid === true) {
      if (model.pricing.prompt === 0 && model.pricing.completion === 0) {
        return false;
      }
    }

    // Filter by search term
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      if (!model.name.toLowerCase().includes(searchLower) &&
          !model.id.toLowerCase().includes(searchLower) &&
          !(model.description?.toLowerCase().includes(searchLower))) {
        return false;
      }
    }

    // Filter by type (based on supported output types or model name patterns)
    if (filter.type) {
      const supportedTypes = model.supported_output_types || [];
      const modelIdLower = model.id.toLowerCase();
      
      switch (filter.type) {
        case 'vision':
          if (!modelIdLower.includes('vision') && !supportedTypes.includes('image')) {
            return false;
          }
          break;
        case 'code':
          if (!modelIdLower.includes('code') && !modelIdLower.includes('coding')) {
            return false;
          }
          break;
        case 'text':
        default:
          // All models support text
          break;
      }
    }

    // Filter by context length
    if (filter.minContextLength && model.context_length) {
      if (model.context_length < filter.minContextLength) {
        return false;
      }
    }

    // Filter by provider company
    if (filter.provider) {
      if (model.top_provider?.toLowerCase() !== filter.provider.toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get filtered models
 */
export async function getFilteredModels(filter: ModelFilter): Promise<OpenRouterModel[]> {
  const models = await getModels();
  return filterModels(models, filter);
}

/**
 * Get available providers from models
 */
export async function getAvailableProviders(): Promise<string[]> {
  const models = await getModels();
  const providers = new Set<string>();
  
  models.forEach((model) => {
    if (model.top_provider) {
      providers.add(model.top_provider);
    }
  });

  return Array.from(providers).sort();
}

/**
 * Group models by pricing
 */
export async function getModelsByPricing(): Promise<{
  free: OpenRouterModel[];
  paid: OpenRouterModel[];
}> {
  const models = await getModels();
  
  return {
    free: models.filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0),
    paid: models.filter((m) => m.pricing.prompt !== 0 || m.pricing.completion !== 0),
  };
}

/**
 * Get popular/recommended models
 */
export async function getRecommendedModels(limit = 10): Promise<OpenRouterModel[]> {
  const models = await getModels();
  
  // Sort by:
  // 1. Free models first
  // 2. Popular providers (OpenAI, Anthropic, Google, Meta, etc.)
  // 3. Recently added
  
  const popularProviders = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral', 'Cohere'];
  
  return models
    .sort((a, b) => {
      // Free models first
      const aIsFree = a.pricing.prompt === 0 && a.pricing.completion === 0;
      const bIsFree = b.pricing.prompt === 0 && b.pricing.completion === 0;
      if (aIsFree !== bIsFree) return aIsFree ? -1 : 1;
      
      // Popular providers
      const aPopular = popularProviders.includes(a.top_provider || '');
      const bPopular = popularProviders.includes(b.top_provider || '');
      if (aPopular !== bPopular) return aPopular ? -1 : 1;
      
      return 0;
    })
    .slice(0, limit);
}
