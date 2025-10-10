# Zeno AI - API Key Management System

This document describes the comprehensive API key management system implemented in Zeno AI, which supports multiple AI providers (OpenAI and Google Gemini) with secure storage and management capabilities.

## Overview

The API key management system provides:
- **Multi-Provider Support**: OpenAI and Google Gemini APIs
- **Secure Storage**: API keys stored in encrypted database (local and cloud)
- **Model Selection**: Choose from various AI models with different capabilities
- **Usage Tracking**: Monitor token usage and costs
- **Key Validation**: Automatic validation of API keys before storage
- **Sync Support**: API keys synchronized across devices

## Supported AI Providers

### OpenAI
- **Models Available**:
  - GPT-4o (Most capable with vision)
  - GPT-4o Mini (Faster and cheaper)
  - GPT-4 Turbo (Latest GPT-4)
  - GPT-3.5 Turbo (Fast and efficient)

- **Capabilities**: Text generation, vision, function calling
- **API Endpoint**: https://api.openai.com/v1/

### Google Gemini
- **Models Available**:
  - Gemini 1.5 Pro (Most capable multimodal)
  - Gemini 1.5 Flash (Fast and efficient)
  - Gemini 1.0 Pro (Reliable for text)

- **Capabilities**: Text, vision, audio, function calling
- **API Endpoint**: https://generativelanguage.googleapis.com/v1/

## Architecture

### Core Components

#### 1. AI Service (`AIService`)
- Unified interface for all AI providers
- Handles model selection and configuration
- Manages API key retrieval and usage tracking
- Provides cost estimation and token counting

#### 2. API Key Management
- **Database Storage**: Secure storage in local and cloud databases
- **Validation**: Automatic API key validation before storage
- **Usage Tracking**: Monitor usage count and last used timestamps
- **Active Management**: Only one active key per provider

#### 3. Model Configuration
- **Dynamic Selection**: Choose models based on provider and capabilities
- **Parameter Tuning**: Adjust temperature, max tokens, system prompts
- **Cost Optimization**: Select models based on cost and performance needs

## Features

### API Key Management

#### Adding API Keys
1. **Provider Selection**: Choose between OpenAI or Gemini
2. **Key Input**: Secure password field for API key entry
3. **Validation**: Automatic validation against provider APIs
4. **Storage**: Encrypted storage in local and cloud databases
5. **Activation**: Automatic activation (deactivates previous keys)

#### Key Operations
- **View Keys**: List all stored API keys with usage statistics
- **Toggle Active**: Activate/deactivate keys for different providers
- **Delete Keys**: Remove unused or compromised keys
- **Usage Tracking**: Monitor usage count and last used timestamps

### Model Selection

#### Available Models
Each provider offers multiple models with different capabilities:

**OpenAI Models**:
- GPT-4o: 128K tokens, vision, function calling
- GPT-4o Mini: 128K tokens, faster, cheaper
- GPT-4 Turbo: 128K tokens, latest features
- GPT-3.5 Turbo: 16K tokens, fast, efficient

**Gemini Models**:
- Gemini 1.5 Pro: 2M tokens, multimodal
- Gemini 1.5 Flash: 1M tokens, fast
- Gemini 1.0 Pro: 30K tokens, reliable

#### Configuration Options
- **Temperature**: Control creativity (0.0 = focused, 2.0 = creative)
- **Max Tokens**: Limit response length
- **System Prompt**: Define AI behavior and personality
- **Provider Selection**: Switch between OpenAI and Gemini

### Usage Tracking

#### Statistics Available
- **Total Tokens**: Cumulative token usage across all conversations
- **Total Cost**: Estimated cost based on provider pricing
- **Usage by Provider**: Breakdown of usage by AI provider
- **Message Count**: Total number of conversations

#### Cost Estimation
- **OpenAI**: ~$0.00003 per token (approximate)
- **Gemini**: ~$0.00001 per token (approximate)
- **Real-time Calculation**: Costs calculated per message

## Usage

### Basic Setup

1. **Add API Keys**:
   ```typescript
   // API keys are added through the UI
   // No code changes needed for basic usage
   ```

2. **Select Model**:
   ```typescript
   const modelConfig: AIModelConfig = {
     provider: 'openai',
     modelId: 'gpt-4o-mini',
     temperature: 0.7,
     maxTokens: 400
   }
   ```

3. **Chat with AI**:
   ```typescript
   const response = await chatWithAssistant(userId, message, modelConfig)
   ```

### Advanced Usage

#### Custom Model Configuration
```typescript
const customConfig: AIModelConfig = {
  provider: 'gemini',
  modelId: 'gemini-1.5-pro',
  temperature: 0.9,
  maxTokens: 1000,
  systemPrompt: 'You are a creative writing assistant...'
}
```

#### Usage Statistics
```typescript
const aiService = new AIService(database, userId)
const stats = await aiService.getUsageStats()
console.log(`Total tokens: ${stats.totalTokens}`)
console.log(`Total cost: $${stats.totalCost.toFixed(4)}`)
```

#### API Key Validation
```typescript
const isValid = await aiService.validateAPIKey('openai', apiKey)
if (isValid) {
  // Proceed with API key storage
}
```

## Security Features

### API Key Protection
- **Encrypted Storage**: API keys encrypted in database
- **No Logging**: Keys never logged to console or files
- **Secure Transmission**: HTTPS for all API communications
- **Access Control**: User-specific key access with RLS

### Validation
- **Pre-storage Validation**: Keys validated before storage
- **Error Handling**: Graceful handling of invalid keys
- **Rate Limiting**: Built-in rate limiting for API calls

## Database Schema

### API Keys Table
```sql
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai', 'gemini')),
  key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  usage_count int DEFAULT 0
);
```

### Enhanced Messages Table
```sql
-- Messages now include AI model information
ALTER TABLE messages ADD COLUMN model text;
ALTER TABLE messages ADD COLUMN provider text;
ALTER TABLE messages ADD COLUMN tokens int;
ALTER TABLE messages ADD COLUMN cost decimal(10,6);
```

## Configuration

### Environment Variables
No environment variables needed for API keys - they're stored in the database.

### Provider Configuration
Each provider is configured with:
- **API Endpoints**: Provider-specific endpoints
- **Authentication**: API key-based authentication
- **Rate Limits**: Provider-specific rate limiting
- **Cost Models**: Token-based pricing models

## Error Handling

### Common Errors
1. **Invalid API Key**: Clear error messages for invalid keys
2. **Rate Limiting**: Graceful handling of rate limit exceeded
3. **Network Issues**: Retry mechanisms for network failures
4. **Model Unavailable**: Fallback to available models

### Error Messages
- **API Key Issues**: "Invalid API key. Please check your key and try again."
- **Network Issues**: "Failed to connect to AI service. Please try again."
- **Rate Limiting**: "Rate limit exceeded. Please wait before trying again."

## Best Practices

### API Key Management
1. **Regular Rotation**: Rotate API keys periodically
2. **Monitor Usage**: Track usage to avoid unexpected costs
3. **Secure Storage**: Never store keys in code or environment files
4. **Access Control**: Use different keys for different environments

### Model Selection
1. **Cost Optimization**: Use cheaper models for simple tasks
2. **Performance**: Choose faster models for real-time applications
3. **Capabilities**: Select models based on required features
4. **Testing**: Test different models for optimal results

### Usage Monitoring
1. **Set Limits**: Monitor usage to avoid excessive costs
2. **Track Performance**: Monitor response times and quality
3. **Optimize Prompts**: Use efficient prompts to reduce token usage
4. **Regular Review**: Review usage patterns and optimize

## Troubleshooting

### Common Issues

#### API Key Not Working
1. Check key validity in provider dashboard
2. Verify key has necessary permissions
3. Check for typos in key entry
4. Ensure key is active in the system

#### High Costs
1. Monitor token usage per conversation
2. Optimize prompts to reduce token count
3. Use cheaper models for simple tasks
4. Set usage limits and alerts

#### Slow Responses
1. Check network connectivity
2. Try different models or providers
3. Reduce max tokens for faster responses
4. Check provider status pages

### Debug Tools
- **Usage Statistics**: Monitor token usage and costs
- **API Key Status**: Check active keys and usage
- **Model Performance**: Compare response times
- **Error Logs**: Review error messages and patterns

## Future Enhancements

### Planned Features
- **Multi-Key Support**: Support for multiple keys per provider
- **Usage Alerts**: Alerts for high usage or costs
- **Model Comparison**: Side-by-side model performance comparison
- **Custom Models**: Support for fine-tuned models
- **Batch Processing**: Batch API calls for efficiency
- **Caching**: Response caching for repeated queries

### Integration Opportunities
- **Webhook Support**: Real-time usage notifications
- **Analytics Dashboard**: Detailed usage analytics
- **Cost Optimization**: Automatic model selection based on cost
- **A/B Testing**: Compare different models and configurations
