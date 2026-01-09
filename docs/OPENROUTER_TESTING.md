# OpenRouter Integration - Testing & Migration Guide

## ✅ Pre-Deployment Checklist

- [ ] OpenRouter API key obtained and verified
- [ ] `.env.local` updated with `OPENROUTER_API_KEY`
- [ ] All TypeScript files compile without errors
- [ ] Application starts without warnings
- [ ] Free model selected for testing (no costs)

## 🧪 Testing the Integration

### 1. Verify API Key Configuration

```bash
# In your .env.local, check:
OPENROUTER_API_KEY=your_actual_key_here

# Never commit API keys to git
echo "OPENROUTER_API_KEY" >> .gitignore
```

### 2. Test Models Endpoint

```bash
# Test the models API endpoint
curl http://localhost:3000/api/models | jq '.models | length'

# Test free models filter
curl http://localhost:3000/api/models?free=true | jq '.models[0]'

# Test search
curl http://localhost:3000/api/models?search=llama | jq '.models[0]'
```

### 3. Test Model Selection in UI

1. Open http://localhost:3000
2. Look for model dropdown with `openrouter/` prefixed models
3. Select a free model like `meta-llama/llama-3.3-70b-instruct`
4. Generate code to test the integration

### 4. Monitor First Request

Watch browser developer console (F12) during first request:
- Check Network tab for `/api/models` requests
- Check Console for any error messages
- Verify streaming starts correctly
- Monitor response times

### 5. Test Fallback Scenarios

**Test without OpenRouter key:**
```bash
# Temporarily unset OPENROUTER_API_KEY
OPENROUTER_API_KEY= pnpm dev

# App should still work with other providers
# OpenRouter models should not appear in dropdown
```

**Test with invalid key:**
```env
OPENROUTER_API_KEY=invalid_key_for_testing
```
- Models endpoint should return 400 error
- Other providers should still work

## 📊 Performance Baseline

### Expected Performance Metrics

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Load models API | <100ms | Cached (24h) |
| Search/filter | <50ms | Client-side |
| First code generation | 5-15s | Depends on model |
| Streaming start | <2s | Network + model setup |
| Token generation | 50-150ms/token | Varies by model |

### Stress Testing

Test with multiple rapid requests:
```typescript
// In browser console
for (let i = 0; i < 10; i++) {
  fetch('/api/models').catch(e => console.error(e));
}
```

Expected: All requests should succeed (with caching)

## 🔄 Migration from Existing Providers

### Option 1: Keep Existing Providers (Recommended)

No migration needed! OpenRouter is additive:

```typescript
// All existing providers continue to work
const models = [
  'openai/gpt-5',                                    // Still works
  'anthropic/claude-sonnet-4-20250514',             // Still works
  'google/gemini-2.0-flash-exp',                    // Still works
  'openrouter/meta-llama/llama-3.3-70b-instruct'  // New option
];
```

### Option 2: Replace a Provider (Advanced)

To replace an existing provider with OpenRouter models:

```typescript
// Before
availableModels: [
  'openai/gpt-5',
  'anthropic/claude-sonnet-4-20250514'
]

// After
availableModels: [
  'openrouter/openai/gpt-4-turbo',        // OpenRouter GPT-4
  'openrouter/anthropic/claude-3-opus'   // OpenRouter Claude
]
```

**Considerations:**
- Ensure OpenRouter API key is configured
- Test cost implications on budget
- Update any hardcoded model references

## 🐛 Debugging Guide

### Enable Verbose Logging

Add to `app/api/generate-ai-code-stream/route.ts`:

```typescript
console.log('[generate-ai-code-stream] Model:', model);
console.log('[generate-ai-code-stream] Is OpenRouter:', model.startsWith('openrouter/'));
console.log('[generate-ai-code-stream] Actual model:', actualModel);
```

### Common Issues and Solutions

#### Issue: "OpenRouter API key not configured"

**Cause:** Missing or invalid API key
**Solution:**
1. Verify `OPENROUTER_API_KEY` is set in `.env.local`
2. Check key is valid at https://openrouter.ai/keys
3. Restart dev server after changing env

```bash
# Verify key is set
grep OPENROUTER_API_KEY .env.local

# Restart dev server
pnpm dev
```

#### Issue: Models Not Appearing in Dropdown

**Cause:** API key not set or models failing to load
**Solution:**
1. Open browser DevTools (F12)
2. Check Network tab for `/api/models` request
3. Check response status and error message
4. Verify API key is valid

```javascript
// In browser console
fetch('/api/models').then(r => r.json()).then(console.log);
```

#### Issue: Streaming Fails with "401 Unauthorized"

**Cause:** Invalid or expired API key
**Solution:**
1. Get new API key from https://openrouter.ai/keys
2. Update `.env.local`
3. Restart dev server
4. Try again

#### Issue: Model Takes Too Long to Respond

**Cause:** Popular model under high load
**Solution:**
1. Switch to different free model with lower load
2. Check OpenRouter status: https://openrouter.ai/status
3. Wait a few minutes and try again
4. Consider using premium model if critical

#### Issue: "Rate Limited" Error

**Cause:** Too many requests to OpenRouter
**Solution:**
1. Reduce request frequency
2. Implement exponential backoff retry
3. Switch to lower-traffic model
4. Check OpenRouter usage dashboard

## 📈 Monitoring and Metrics

### What to Monitor in Production

1. **API Response Times**
   - Track `/api/models` response times
   - Track model generation latency
   - Alert if > 30s for generation

2. **Error Rates**
   - Track 4xx errors (API key issues)
   - Track 5xx errors (server issues)
   - Alert if > 1% error rate

3. **Usage Metrics**
   - Track models selected by users
   - Track most popular models
   - Track free vs paid model usage

4. **Cost Tracking**
   - Monitor OpenRouter billing
   - Track cost per request
   - Set budget alerts

### Implementation

```typescript
// Add to your monitoring setup
const trackModelUsage = (model: string) => {
  // Log to your analytics service
  console.log(`[metrics] model_used: ${model}`);
};

const trackGenerationTime = (startTime: number) => {
  const duration = Date.now() - startTime;
  console.log(`[metrics] generation_time: ${duration}ms`);
};
```

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] All TypeScript errors resolved
- [ ] Test with prod API key in staging
- [ ] Monitor error logs for 24 hours
- [ ] Verify cost tracking is working
- [ ] Brief team on new feature
- [ ] Have rollback plan ready

### Deployment Steps

1. **Stage Deployment**
   ```bash
   # Deploy to staging environment
   # Set OPENROUTER_API_KEY in staging env
   # Run full test suite
   ```

2. **Production Deployment**
   ```bash
   # Deploy to production
   # Set OPENROUTER_API_KEY in production env
   # Monitor error logs closely first hour
   ```

3. **Post-Deployment**
   - Monitor error rate
   - Check model selection distribution
   - Verify cost tracking
   - Document any issues

### Rollback Plan

If issues occur:

1. **Quick Disable**
   ```env
   # In production, remove API key
   # OPENROUTER_API_KEY=
   
   # App will gracefully disable OpenRouter
   # Other providers continue working
   ```

2. **Code Rollback**
   ```bash
   # If code-level issues
   git revert <commit-hash>
   git push production
   ```

## ✨ Best Practices

### 1. Resource Usage

```typescript
// ✅ Good: Use caching
const models = await getModels(); // Uses cache by default

// ❌ Avoid: Force refresh on every request
const models = await getModels(true); // Bypasses cache
```

### 2. Error Handling

```typescript
// ✅ Good: Graceful degradation
try {
  const models = await getModels();
} catch (error) {
  console.error('Failed to fetch models:', error);
  return fallbackModels; // Use backup list
}

// ❌ Avoid: Crashing on error
const models = await getModels(); // No error handling
```

### 3. Model Selection

```typescript
// ✅ Good: Validate model before use
if (appConfig.ai.availableModels.includes(model)) {
  // Use model
}

// ❌ Avoid: Trust user input blindly
const result = streamText({
  model: openrouter(userProvidedModel) // Potential security issue
});
```

### 4. Cost Monitoring

```typescript
// ✅ Good: Track costs
const trackCost = (inputTokens: number, outputTokens: number, model: string) => {
  // Calculate and log cost
};

// ❌ Avoid: Ignoring costs
// Just use models without tracking
```

## 📞 Support and Resources

### Getting Help

1. **Integration Issues**
   - Check `/docs/OPENROUTER_INTEGRATION.md`
   - Review troubleshooting section in README

2. **OpenRouter Support**
   - Docs: https://openrouter.ai/docs
   - Issues: https://github.com/openrouter-ai/issues

3. **Open Lovable Support**
   - GitHub: https://github.com/firecrawl/open-lovable
   - Issues: https://github.com/firecrawl/open-lovable/issues

## 🎉 Success Indicators

✅ Integration is working when:

1. Models API returns 100+ models
2. Free models work without costs
3. Streaming generates code successfully
4. UI is responsive and searchable
5. Error messages are helpful
6. Performance is acceptable
7. No TypeScript errors
8. All tests pass
9. Billing dashboard shows usage
10. Users report positive experience

## 📝 Notes

- This integration is backward compatible
- Existing providers continue working
- OpenRouter is optional (app works without it)
- No breaking changes to API
- Safe to deploy incrementally
- Easy to rollback if needed

---

**Document Version**: 1.0.0
**Last Updated**: November 11, 2025
**Status**: Ready for Testing and Deployment
