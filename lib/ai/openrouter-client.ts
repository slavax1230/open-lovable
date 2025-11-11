/**
 * OpenRouter Provider for Vercel AI SDK
 * Creates an OpenAI-compatible client that routes to OpenRouter API
 * Since OpenRouter is OpenAI-compatible, we can use the OpenAI SDK with a custom base URL
 */

import { createOpenAI } from '@ai-sdk/openai';

interface OpenRouterClientConfig {
  apiKey: string;
  baseURL?: string;
}

/**
 * Creates an OpenRouter client compatible with Vercel AI SDK
 * Uses OpenAI SDK since OpenRouter implements the OpenAI API spec
 */
export function createOpenRouter(config: OpenRouterClientConfig) {
  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
  });
}

export default createOpenRouter;
