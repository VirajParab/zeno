import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { DatabaseInterface } from '../database/types'
import { AIProvider, AIModel, AIModelConfig, ChatMessage, AVAILABLE_MODELS } from './types'

export class AIService {
  private database: DatabaseInterface
  private userId: string

  constructor(database: DatabaseInterface, userId: string) {
    this.database = database
    this.userId = userId
  }

  async chatWithAI(
    text: string, 
    modelConfig: AIModelConfig,
    systemPrompt?: string,
    chatSessionId?: string
  ): Promise<ChatMessage> {
    const apiKey = await this.database.getActiveAPIKey(modelConfig.provider)
    if (!apiKey) {
      throw new Error(`No active API key found for provider: ${modelConfig.provider}`)
    }

    // Validate model dynamically by checking if it's available for the provider
    const availableModels = await this.listAvailableModels(modelConfig.provider)
    if (!availableModels.includes(modelConfig.modelId)) {
      throw new Error(`Model ${modelConfig.modelId} is not available for provider ${modelConfig.provider}`)
    }

    // Get recent messages for context
    const recentMessages = await this.database.getMessages()
    const lastMessages = recentMessages.slice(-10)

    let response: string
    let tokens: number = 0
    let cost: number = 0

    try {
      if (modelConfig.provider === 'openai') {
        const result = await this.chatWithOpenAI(
          apiKey.key,
          modelConfig,
          text,
          lastMessages,
          systemPrompt
        )
        response = result.response
        tokens = result.tokens
        cost = result.cost
      } else if (modelConfig.provider === 'gemini') {
        const result = await this.chatWithGemini(
          apiKey.key,
          modelConfig,
          text,
          lastMessages,
          systemPrompt
        )
        response = result.response
        tokens = result.tokens
        cost = result.cost
      } else {
        throw new Error(`Unsupported provider: ${modelConfig.provider}`)
      }

      // Update API key usage
      await this.database.updateAPIKey(apiKey.id, {
        usage_count: apiKey.usage_count + 1,
        last_used_at: new Date().toISOString()
      })

      // Save both user message and assistant reply
      await this.database.createMessage({
        user_id: this.userId,
        role: 'user',
        content: text,
        model: modelConfig.modelId,
        provider: modelConfig.provider,
        tokens: 0, // We don't count input tokens for simplicity
        cost: 0,
        chat_session_id: chatSessionId
      })

      const assistantMessage = await this.database.createMessage({
        user_id: this.userId,
        role: 'assistant',
        content: response,
        model: modelConfig.modelId,
        provider: modelConfig.provider,
        tokens,
        cost,
        chat_session_id: chatSessionId
      })

      return {
        role: 'assistant',
        content: response,
        timestamp: assistantMessage.inserted_at,
        model: modelConfig.modelId,
        provider: modelConfig.provider,
        tokens,
        cost
      }
    } catch (error) {
      console.error('Error in chatWithAI:', error)
      throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async chatWithOpenAI(
    apiKey: string,
    modelConfig: AIModelConfig,
    text: string,
    recentMessages: any[],
    systemPrompt?: string
  ): Promise<{ response: string; tokens: number; cost: number }> {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Only for development
    })

    // Prepare messages for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt || 'You are a helpful personal assistant. Keep responses concise and actionable. Help users manage their tasks and plan their day.'
      },
      ...recentMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: text
      }
    ]

    const completion = await openai.chat.completions.create({
      model: modelConfig.modelId,
      messages,
      max_tokens: modelConfig.maxTokens || 400,
      temperature: modelConfig.temperature || 0.7
    })

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not process that request.'
    const tokens = completion.usage?.total_tokens || 0
    
    // Simple cost calculation (approximate)
    const costPerToken = 0.00003 // Rough estimate for GPT-4
    const cost = tokens * costPerToken

    return { response, tokens, cost }
  }

  private async chatWithGemini(
    apiKey: string,
    modelConfig: AIModelConfig,
    text: string,
    recentMessages: any[],
    systemPrompt?: string
  ): Promise<{ response: string; tokens: number; cost: number }> {
    const genAI = new GoogleGenAI({ apiKey })
    
    // Build conversation history
    let conversationHistory = ''
    if (systemPrompt) {
      conversationHistory += `System: ${systemPrompt}\n\n`
    }
    
    recentMessages.forEach(msg => {
      conversationHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`
    })

    const prompt = conversationHistory + `User: ${text}\n\nAssistant:`

    const requestConfig = {
      model: modelConfig.modelId,
      contents: prompt,
      config: {
        temperature: modelConfig.temperature || 0.7,
        generationConfig: {
          maxOutputTokens: modelConfig.maxTokens || 32768,
        }
      }
    }

    console.log('Sending request with config:', JSON.stringify(requestConfig, null, 2))

    const response = await genAI.models.generateContent(requestConfig)
    
    const responseText = response.text || ''
    
    // Debug token usage
    const usageMetadata = response.usageMetadata
    console.log('Token usage debug:', {
      promptTokens: usageMetadata?.promptTokenCount,
      thoughtsTokens: usageMetadata?.thoughtsTokenCount,
      totalTokens: usageMetadata?.totalTokenCount,
      maxOutputTokens: modelConfig.maxTokens || 32768,
      responseLength: responseText.length,
      finishReason: response.candidates?.[0]?.finishReason
    })
    
    // Check if response was cut off due to token limits
    if (!responseText && response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      throw new Error(`Response was cut off due to token limit. Used ${usageMetadata?.totalTokenCount || 'unknown'} tokens (${usageMetadata?.thoughtsTokenCount || 'unknown'} for thinking). Try increasing max tokens.`)
    }
    
    // Use actual token count from usage metadata if available
    const tokens = usageMetadata?.totalTokenCount || Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4)
    const costPerToken = 0.00001 // Rough estimate for Gemini
    const cost = tokens * costPerToken

    return { response: responseText, tokens, cost }
  }

  async getAvailableModels(): Promise<AIModel[]> {
    // Return a combination of static models and dynamic models
    const staticModels = AVAILABLE_MODELS
    return staticModels
  }

  async getModelsByProvider(provider: AIProvider): Promise<AIModel[]> {
    // Get dynamic models for the provider
    const dynamicModelIds = await this.listAvailableModels(provider)
    
    if (dynamicModelIds.length > 0) {
      // Convert dynamic model IDs to AIModel objects
      return dynamicModelIds.map(modelId => ({
        id: modelId,
        name: modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        provider: provider,
        description: `Available ${provider} model`,
        maxTokens: 1000000,
        capabilities: ['text']
      }))
    } else {
      // Fallback to static models
      return AVAILABLE_MODELS.filter(model => model.provider === provider)
    }
  }

  async validateAPIKey(provider: AIProvider, apiKey: string): Promise<boolean> {
    try {
      // Basic validation - check if key format looks correct
      if (!apiKey || apiKey.trim().length < 10) {
        return false
      }

      if (provider === 'openai') {
        // OpenAI keys typically start with 'sk-'
        if (!apiKey.startsWith('sk-')) {
          console.warn('OpenAI key format warning: Expected key to start with "sk-"')
        }
        
        // For Tauri, we'll do a basic format check instead of API call
        // to avoid CORS issues in the desktop environment
        return apiKey.startsWith('sk-') && apiKey.length > 20
      } else if (provider === 'gemini') {
        // Gemini keys are typically longer and don't have a specific prefix
        // We'll do a basic length check
        return apiKey.length > 20
      }
      return false
    } catch (error) {
      console.error('API key validation failed:', error)
      return false
    }
  }

  async validateModel(provider: AIProvider, modelId: string): Promise<boolean> {
    try {
      const availableModels = await this.listAvailableModels(provider)
      return availableModels.includes(modelId)
    } catch (error) {
      console.error('Model validation failed:', error)
      return false
    }
  }

  async debugAvailableModels(provider: AIProvider): Promise<void> {
    try {
      if (provider === 'gemini') {
        const apiKey = await this.database.getActiveAPIKey(provider)
        if (!apiKey) {
          console.error('No active API key found for Gemini')
          return
        }
        
        console.log('=== DEBUG: Fetching Gemini Models via Direct API ===')
        
        // Use direct API call for debugging
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.key}`)
        
        if (!response.ok) {
          console.error(`API Error: ${response.status} ${response.statusText}`)
          const errorText = await response.text()
          console.error('Error response:', errorText)
          return
        }
        
        const data = await response.json()
        console.log('Full API response:', data)
        
        const models = data.models || []
        console.log(`Found ${models.length} total models via direct API`)
        
        models.forEach((model: any, index: number) => {
          console.log(`Model ${index + 1}:`, {
            name: model.name,
            displayName: model.displayName,
            state: model.state,
            supportedGenerationMethods: model.supportedGenerationMethods,
            description: model.description
          })
        })
        
        const generateContentModels = models.filter((model: any) => 
          model.supportedGenerationMethods?.includes('generateContent')
        )
        
        console.log(`Found ${generateContentModels.length} models that support generateContent:`)
        generateContentModels.forEach((model: any) => {
          console.log(`- ${model.name} (${model.displayName})`)
        })
        
      }
    } catch (error) {
      console.error('Debug failed:', error)
    }
  }

  async getUsageStats(): Promise<{
    totalTokens: number
    totalCost: number
    totalMessages: number
    byProvider: Record<string, { tokens: number; cost: number; messages: number }>
  }> {
    const messages = await this.database.getMessages()
    
    const stats = {
      totalTokens: 0,
      totalCost: 0,
      totalMessages: messages.length,
      byProvider: {} as Record<string, { tokens: number; cost: number; messages: number }>
    }

    messages.forEach(message => {
      if (message.tokens) stats.totalTokens += message.tokens
      if (message.cost) stats.totalCost += message.cost
      
      if (message.provider) {
        if (!stats.byProvider[message.provider]) {
          stats.byProvider[message.provider] = { tokens: 0, cost: 0, messages: 0 }
        }
        stats.byProvider[message.provider].tokens += message.tokens || 0
        stats.byProvider[message.provider].cost += message.cost || 0
        stats.byProvider[message.provider].messages += 1
      }
    })

    return stats
  }

  async listAvailableModels(provider: AIProvider): Promise<string[]> {
    try {
      if (provider === 'gemini') {
        const apiKey = await this.database.getActiveAPIKey(provider)
        if (!apiKey) {
          throw new Error('No active API key found for Gemini')
        }
        
        // Use direct API call for model listing (more reliable than SDK)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.key}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        const models = data.models || []
        
        console.log('Raw models from API:', models.map((m: any) => ({
          name: m.name,
          supportedMethods: m.supportedGenerationMethods,
          displayName: m.displayName
        })))
        
        // Filter models that support generateContent and are available
        const availableModels = models
          .filter((model: any) => {
            const hasGenerateContent = model.supportedGenerationMethods?.includes('generateContent')
            const isAvailable = model.state === 'ACTIVE' || !model.state // Some models don't have state field
            const isModel = model.name.startsWith('models/')
            
            console.log(`Model ${model.name}: generateContent=${hasGenerateContent}, available=${isAvailable}, isModel=${isModel}`)
            
            return hasGenerateContent && isAvailable && isModel
          })
          .map((model: any) => model.name.replace('models/', ''))
        
        console.log('Filtered available Gemini models:', availableModels)
        return availableModels
      } else if (provider === 'openai') {
        // For OpenAI, return our predefined models
        return AVAILABLE_MODELS
          .filter(model => model.provider === 'openai')
          .map(model => model.id)
      }
      return []
    } catch (error) {
      console.error(`Failed to list models for ${provider}:`, error)
      // Fallback to predefined models if API call fails
      if (provider === 'gemini') {
        return ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro']
      }
      return []
    }
  }
}
