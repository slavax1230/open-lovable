# OpenRouter Integration Guide

## Overview

OpenRouter provider has been successfully integrated into Open Lovable, allowing you to access 100+ AI models with unified API support. Many models are completely free to use!

## Architecture

### Backend Components

#### 1. **OpenRouter Client** (`lib/ai/openrouter-client.ts`)
- Creates an OpenAI-compatible client using the Vercel AI SDK
- Routes requests to `https://openrouter.ai/api/v1`
- Automatically managed by the `createOpenRouter` function

#### 2. **Model Service** (`lib/ai/model-service.ts`)
- Fetches available models from OpenRouter API
- Implements 24-hour caching for performance
- Provides filtering capabilities:
  - Filter by free/paid status
  - Filter by model type (text, vision, code)
  - Filter by context length
  - Filter by provider company
  - Search by name or ID

Key exports:
```typescript
- fetchOpenRouterModels(): Promise<OpenRouterModel[]>
- getModels(forceRefresh?: boolean): Promise<OpenRouterModel[]>
- filterModels(models, filter): OpenRouterModel[]
- getFilteredModels(filter): Promise<OpenRouterModel[]>
- getAvailableProviders(): Promise<string[]>
- getModelsByPricing(): Promise<{ free, paid }>
- getRecommendedModels(limit): Promise<OpenRouterModel[]>
```

#### 3. **API Endpoint** (`app/api/models/route.ts`)
- REST API for fetching and filtering models
- Supports query parameters:
  - `free=true` - Free models only
  - `paid=true` - Paid models only
  - `search=term` - Search by name/ID
  - `type=text|vision|code` - Filter by type
  - `minContext=number` - Minimum context length
  - `provider=name` - Filter by provider
  - `recommended=true` - Get recommended models
  - `pricing=true` - Get pricing breakdown
  - `providers=true` - Get available providers

Example requests:
```bash
curl http://localhost:3000/api/models?free=true
curl http://localhost:3000/api/models?search=llama
curl http://localhost:3000/api/models?recommended=true&limit=10
```

### Frontend Components

#### 1. **ModelSelector Component** (`components/app/ModelSelector.tsx`)
- React component for browsing and selecting models
- Features:
  - Search by name/ID/description
  - Filter by free/paid status
  - Shows pricing, context length, provider info
  - Responsive design with compact mode
  - Loading and error states

Usage:
```tsx
import { ModelSelector } from '@/components/app/ModelSelector';

<ModelSelector
  value={selectedModel}
  onChange={(modelId) => setSelectedModel(modelId)}
  showRecommendedOnly={false}
  compact={false}
/>
```

### API Integration Points

#### 1. **generate-ai-code-stream** (`app/api/generate-ai-code-stream/route.ts`)
- Added OpenRouter provider detection
- Model routing logic for `openrouter/` prefixed models
- Completion logic updated to support OpenRouter

#### 2. **analyze-edit-intent** (`app/api/analyze-edit-intent/route.ts`)
- Added OpenRouter provider detection
- Model selection updated to handle OpenRouter models

### Configuration

Updated `config/app.config.ts` with example OpenRouter models:
```typescript
availableModels: [
  'openrouter/meta-llama/llama-3.3-70b-instruct',
  'openrouter/meta-llama/llama-2-70b-chat',
  'openrouter/mistralai/mistral-large',
  'openrouter/cohere/command-r-plus',
  'openrouter/openai/gpt-4-turbo',
  'openrouter/anthropic/claude-3-opus',
  // ... other models
]
```

## Environment Setup

### 1. Get OpenRouter API Key
- Visit https://openrouter.ai
- Sign up (free, no credit card required)
- Navigate to https://openrouter.ai/keys
- Copy your API key

### 2. Configure `.env.local`
```env
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. Optional: Vercel AI Gateway
If using Vercel AI Gateway with OpenRouter:
```env
AI_GATEWAY_API_KEY=your_ai_gateway_key
```

## Model Selection

### Recommended Free Models

1. **Meta Llama 3.3 70B**
   - Model: `meta-llama/llama-3.3-70b-instruct`
   - Context: 8k tokens
   - Best for: Fast, general-purpose code generation

2. **Mistral Large**
   - Model: `mistralai/mistral-large`
   - Context: 32k tokens
   - Best for: Complex tasks with large context

3. **Cohere Command R+**
   - Model: `cohere/command-r-plus`
   - Context: 128k tokens
   - Best for: Long context requirements

### Premium Models

1. **OpenAI GPT-4 Turbo**
   - Model: `openai/gpt-4-turbo`
   - Pricing: ~$0.01-0.03 per 1K tokens

2. **Anthropic Claude 3 Opus**
   - Model: `anthropic/claude-3-opus`
   - Pricing: ~$0.015-0.075 per 1K tokens

3. **Google Gemini**
   - Model: `google/gemini-1.5-pro`
   - Pricing: Variable based on usage

## Usage Examples

### Using in Frontend
```tsx
import { ModelSelector } from '@/components/app/ModelSelector';

function MyComponent() {
  const [model, setModel] = useState('openrouter/meta-llama/llama-3.3-70b-instruct');

  return (
    <ModelSelector
      value={model}
      onChange={setModel}
      showRecommendedOnly={true}
    />
  );
}
```

### Using in API Routes
```typescript
// In app/api/my-route/route.ts
import createOpenRouter from '@/lib/ai/openrouter-client';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(request: NextRequest) {
  const model = 'meta-llama/llama-3.3-70b-instruct';
  
  const result = await streamText({
    model: openrouter(model),
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  });
}
```

### Fetching Models
```typescript
import { getFilteredModels, getRecommendedModels } from '@/lib/ai/model-service';

// Get recommended models
const recommended = await getRecommendedModels(10);

// Get free models only
const freeModels = await getFilteredModels({ free: true });

// Search for Llama models
const llamaModels = await getFilteredModels({ search: 'llama' });
```

## Model Format

Each OpenRouter model has the following structure:
```typescript
interface OpenRouterModel {
  id: string;                              // Full model ID (e.g., "meta-llama/llama-3.3-70b-instruct")
  name: string;                            // Human-readable name
  description?: string;                    // Model description
  pricing: {
    prompt: number;                        // Cost per 1M input tokens
    completion: number;                    // Cost per 1M output tokens
  };
  context_length?: number;                 // Total context window in tokens
  max_tokens?: number;                     // Max output tokens
  supported_output_types?: string[];       // e.g., ["text", "image"]
  architecture?: {
    modality?: string;                     // Type of model
    tokenizer?: string;                    // Tokenizer used
  };
  top_provider?: string;                   // Provider company (OpenAI, Anthropic, etc.)
}
```

## Caching

Models are cached for **24 hours** to optimize performance. To force a refresh:
```typescript
const models = await getModels(true); // forceRefresh = true
```

## Error Handling

### Missing API Key
If `OPENROUTER_API_KEY` is not set:
- OpenRouter models will not be available
- The `createOpenRouter` function will return `null`
- API routes will return a 400 error with message: "OpenRouter API key not configured"

### API Rate Limiting
OpenRouter implements rate limiting based on your plan. Implement retry logic:
```typescript
let retryCount = 0;
const maxRetries = 3;

while (retryCount <= maxRetries) {
  try {
    const result = await streamText(options);
    break;
  } catch (error) {
    if (error.status === 429) { // Too many requests
      retryCount++;
      await new Promise(r => setTimeout(r, retryCount * 1000));
    } else {
      throw error;
    }
  }
}
```

## Pricing Information

### Free Tier
- Limited requests per day
- Access to free models only
- Good for development and testing

### Pay-as-you-go
- No credit card required initially
- Only pay for actual usage
- Costs vary by model ($0.0001 - $0.03 per 1K tokens)

### Enterprise
- Volume discounts
- Dedicated support
- Contact OpenRouter for pricing

Check https://openrouter.ai/pricing for current rates.

## Troubleshooting

### Models Not Loading
1. Check that `OPENROUTER_API_KEY` is set correctly
2. Verify the key has valid credits/quota
3. Check browser console for network errors
4. Try clearing browser cache

### Model Selection Not Working
1. Verify `ModelSelector` component props
2. Check that `onChange` callback is implemented
3. Ensure model IDs match those from `/api/models` endpoint

### Streaming Errors
1. Check API key is correct
2. Verify model ID format: `provider/model-name`
3. Check internet connection
4. Review browser console for detailed errors

### Rate Limiting
1. Reduce request frequency
2. Use recommended free models (have higher limits)
3. Consider upgrading OpenRouter plan
4. Implement exponential backoff in retry logic

## Performance Optimization

### 1. Use Caching
The service automatically caches models for 24 hours, reducing API calls.

### 2. Filter Early
Use the API's filter parameters instead of filtering on the client:
```typescript
// Good - filters on server
const models = await fetch('/api/models?free=true');

// Less efficient - filters on client
const allModels = await fetch('/api/models');
const free = allModels.filter(m => m.pricing.prompt === 0);
```

### 3. Lazy Load Model Selector
```tsx
import dynamic from 'next/dynamic';

const ModelSelector = dynamic(() => import('@/components/app/ModelSelector'), {
  loading: () => <div>Loading...</div>
});
```

## Security Best Practices

1. **Never commit API keys**
   - Use `.env.local` (ignored by git)
   - Use environment variables in production

2. **Validate Model IDs**
   - Always verify model IDs from the API
   - Don't allow arbitrary user input as model IDs

3. **Rate Limit Requests**
   - Implement client-side debouncing
   - Use server-side rate limiting

4. **Monitor Usage**
   - Check OpenRouter dashboard for anomalies
   - Set up billing alerts

## Additional Resources

- **OpenRouter Docs**: https://openrouter.ai/docs
- **Available Models**: https://openrouter.ai/models
- **API Reference**: https://openrouter.ai/api/v1/chat/completions
- **Community**: https://github.com/openrouter-ai/

## Contributing

To improve the OpenRouter integration:

1. Add new model examples to `config/app.config.ts`
2. Enhance filters in `lib/ai/model-service.ts`
3. Improve the `ModelSelector` UI component
4. Submit issues/PRs to the main repository

## License

This OpenRouter integration is part of Open Lovable and follows the same MIT license.
