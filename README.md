# Open Lovable

Chat with AI to build React apps instantly. An example app made by the [Firecrawl](https://firecrawl.dev/?ref=open-lovable-github) team. For a complete cloud solution, check out [Lovable.dev](https://lovable.dev/) ❤️.

<img src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExODAwZGJzcDVmZGYxc3MyNDUycTliYnAwem1qbzhtNHh0c2JrNDdmZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LMYzMkNmOecj3yFw81/giphy.gif" alt="Open Lovable Demo" width="100%"/>

## Setup

1. **Clone & Install**
```bash
git clone https://github.com/firecrawl/open-lovable.git
cd open-lovable
pnpm install  # or npm install / yarn install
```

2. **Add `.env.local`**

```env
# =================================================================
# REQUIRED
# =================================================================
FIRECRAWL_API_KEY=your_firecrawl_api_key    # https://firecrawl.dev

# =================================================================
# AI PROVIDER - Choose your LLM
# =================================================================
GEMINI_API_KEY=your_gemini_api_key        # https://aistudio.google.com/app/apikey
ANTHROPIC_API_KEY=your_anthropic_api_key  # https://console.anthropic.com
OPENAI_API_KEY=your_openai_api_key        # https://platform.openai.com
GROQ_API_KEY=your_groq_api_key            # https://console.groq.com

# Optional: OpenRouter - Access 100+ free and paid AI models
# Get API key at https://openrouter.ai
OPENROUTER_API_KEY=your_openrouter_api_key

# =================================================================
# FAST APPLY (Optional - for faster edits)
# =================================================================
MORPH_API_KEY=your_morphllm_api_key    # https://morphllm.com/dashboard

# =================================================================
# SANDBOX PROVIDER - Choose ONE: Vercel (default) or E2B
# =================================================================
SANDBOX_PROVIDER=vercel  # or 'e2b'

# Option 1: Vercel Sandbox (default)
# Choose one authentication method:

# Method A: OIDC Token (recommended for development)
# Run `vercel link` then `vercel env pull` to get VERCEL_OIDC_TOKEN automatically
VERCEL_OIDC_TOKEN=auto_generated_by_vercel_env_pull

# Method B: Personal Access Token (for production or when OIDC unavailable)
# VERCEL_TEAM_ID=team_xxxxxxxxx      # Your Vercel team ID 
# VERCEL_PROJECT_ID=prj_xxxxxxxxx    # Your Vercel project ID
# VERCEL_TOKEN=vercel_xxxxxxxxxxxx   # Personal access token from Vercel dashboard

# Option 2: E2B Sandbox
# E2B_API_KEY=your_e2b_api_key      # https://e2b.dev
```

3. **Run**
```bash
pnpm dev  # or npm run dev / yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🚀 Using OpenRouter (Recommended!)

OpenRouter gives you access to 100+ AI models, many completely **FREE**. It's the easiest way to try different models without managing multiple API keys!

### Why OpenRouter?
- ✅ **100+ models** including Llama 3.3, Mistral, Claude, GPT-4, and more
- ✅ **Many FREE models** with no credit card required
- ✅ **Pay-as-you-go** - only pay for what you use
- ✅ **Unified API** - same interface for all models
- ✅ **Easy fallbacks** - automatically use alternative models if one fails

### Quick Setup

1. **Get OpenRouter API Key**
   - Visit https://openrouter.ai
   - Sign up (free, no credit card needed)
   - Copy your API key from https://openrouter.ai/keys

2. **Add to `.env.local`**
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

3. **Select an OpenRouter Model**
   - In the UI, find model names starting with `openrouter/`
   - Try free models like:
     - `meta-llama/llama-3.3-70b-instruct` (best free option)
     - `mistralai/mistral-large`
     - `cohere/command-r-plus`

### Available OpenRouter Models

**Free Models:**
- Meta Llama 3.3 70B
- Mistral Large
- Cohere Command R+
- And many more!

**Premium Models:**
- OpenAI GPT-4, GPT-4 Turbo
- Anthropic Claude 3
- Google Gemini

Check https://openrouter.ai/models for the complete list and pricing.

### API Endpoint

Use the `/api/models` endpoint to browse available models:

```bash
# Get all OpenRouter models
curl http://localhost:3000/api/models?provider=openrouter

# Filter free models only
curl http://localhost:3000/api/models?provider=openrouter&free=true

# Search by name
curl http://localhost:3000/api/models?search=llama
```

## License

MIT

````

## License

MIT
