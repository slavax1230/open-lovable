import { NextRequest, NextResponse } from 'next/server';
import {
  getModels,
  filterModels,
  getAvailableProviders,
  getModelsByPricing,
  getRecommendedModels,
  ModelFilter,
} from '@/lib/ai/model-service';
import { appConfig } from '@/config/app.config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/models
 * 
 * Query parameters:
 * - free: boolean - only free models
 * - paid: boolean - only paid models
 * - search: string - search by name or ID
 * - type: 'text' | 'vision' | 'code' - filter by type
 * - minContext: number - minimum context length
 * - provider: string - filter by provider
 * - recommended: boolean - get recommended models only
 * - pricing: boolean - group by pricing
 * - providers: boolean - get available providers only
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Check if OPENROUTER_API_KEY is configured
    const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;

    // If requesting OpenRouter models specifically
    const requestOpenRouter = searchParams.get('provider') === 'openrouter' || 
                            searchParams.get('search')?.includes('openrouter');

    if (requestOpenRouter && !hasOpenRouterKey) {
      return NextResponse.json({
        error: 'OpenRouter API key not configured',
        available: false,
      }, { status: 400 });
    }

    // Get providers only
    if (searchParams.get('providers') === 'true') {
      const providers = await getAvailableProviders();
      return NextResponse.json({ providers });
    }

    // Get pricing breakdown
    if (searchParams.get('pricing') === 'true') {
      const pricing = await getModelsByPricing();
      return NextResponse.json(pricing);
    }

    // Get recommended models
    if (searchParams.get('recommended') === 'true') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const recommended = await getRecommendedModels(limit);
      return NextResponse.json({ models: recommended });
    }

    // Build filter
    const filter: ModelFilter = {};

    if (searchParams.get('free') === 'true') filter.free = true;
    if (searchParams.get('paid') === 'true') filter.paid = true;

    const search = searchParams.get('search');
    if (search) filter.search = search;

    const type = searchParams.get('type');
    if (type && ['text', 'vision', 'code'].includes(type)) {
      filter.type = type as 'text' | 'vision' | 'code';
    }

    const minContext = searchParams.get('minContext');
    if (minContext) filter.minContextLength = parseInt(minContext);

    const provider = searchParams.get('provider');
    if (provider) filter.provider = provider;

    // Get all models and filter
    const models = await getModels();
    const filtered = filterModels(models, filter);

    return NextResponse.json({
      models: filtered,
      count: filtered.length,
      hasOpenRouterKey,
      availableModels: appConfig.ai.availableModels,
    });
  } catch (error) {
    console.error('[models API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
