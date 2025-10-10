import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
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
    systemPrompt?: string
  ): Promise<ChatMessage> {
    const apiKey = await this.database.getActiveAPIKey(modelConfig.provider)
    if (!apiKey) {
      throw new Error(`No active API key found for provider: ${modelConfig.provider}`)
    }

    const model = AVAILABLE_MODELS.find(m => m.id === modelConfig.modelId)
    if (!model) {
      throw new Error(`Model not found: ${modelConfig.modelId}`)
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
        cost: 0
      })

      const assistantMessage = await this.database.createMessage({
        user_id: this.userId,
        role: 'assistant',
        content: response,
        model: modelConfig.modelId,
        provider: modelConfig.provider,
        tokens,
        cost
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
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: modelConfig.modelId,
      generationConfig: {
        temperature: modelConfig.temperature || 0.7,
        maxOutputTokens: modelConfig.maxTokens || 400,
      }
    })

    // Build conversation history
    let conversationHistory = ''
    if (systemPrompt) {
      conversationHistory += `System: ${systemPrompt}\n\n`
    }
    
    recentMessages.forEach(msg => {
      conversationHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`
    })

    const prompt = conversationHistory + `User: ${text}\n\nAssistant:`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    // Gemini doesn't provide token count in the same way, so we estimate
    const tokens = Math.ceil(prompt.length / 4) + Math.ceil(response.length / 4) // Rough estimate
    const costPerToken = 0.00001 // Rough estimate for Gemini
    const cost = tokens * costPerToken

    return { response, tokens, cost }
  }

  async getAvailableModels(): Promise<AIModel[]> {
    return AVAILABLE_MODELS
  }

  async getModelsByProvider(provider: AIProvider): Promise<AIModel[]> {
    return AVAILABLE_MODELS.filter(model => model.provider === provider)
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
}
