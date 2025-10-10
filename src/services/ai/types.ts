export type AIProvider = 'openai' | 'gemini'

export type AIModel = {
  id: string
  name: string
  provider: AIProvider
  description: string
  maxTokens: number
  costPerToken?: number
  capabilities: string[]
}

export interface APIKey {
  id: string
  user_id: string
  provider: AIProvider
  key: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_used_at?: string
  usage_count: number
  sync_status?: 'synced' | 'pending' | 'conflict'
  last_synced_at?: string
}

export interface APIKeyConfig {
  provider: AIProvider
  key: string
  isActive: boolean
}

export interface AIModelConfig {
  provider: AIProvider
  modelId: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

// Available AI models
export const AVAILABLE_MODELS: AIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable GPT-4 model with vision capabilities',
    maxTokens: 128000,
    capabilities: ['text', 'vision', 'function-calling']
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Faster and cheaper GPT-4 model',
    maxTokens: 128000,
    capabilities: ['text', 'vision', 'function-calling']
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Latest GPT-4 model with improved performance',
    maxTokens: 128000,
    capabilities: ['text', 'vision', 'function-calling']
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast and efficient model for most tasks',
    maxTokens: 16385,
    capabilities: ['text', 'function-calling']
  },
  
  // Gemini Models
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Google\'s most capable multimodal model',
    maxTokens: 2000000,
    capabilities: ['text', 'vision', 'audio', 'function-calling']
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Fast and efficient Gemini model',
    maxTokens: 1000000,
    capabilities: ['text', 'vision', 'audio']
  },
  {
    id: 'gemini-1.0-pro',
    name: 'Gemini 1.0 Pro',
    provider: 'gemini',
    description: 'Reliable Gemini model for text tasks',
    maxTokens: 30720,
    capabilities: ['text', 'function-calling']
  }
]

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  model?: string
  provider?: AIProvider
  tokens?: number
  cost?: number
}
