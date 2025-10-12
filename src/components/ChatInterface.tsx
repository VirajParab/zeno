import { useState, useEffect, useRef } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'
import { AIService } from '../services/ai/aiService'
import { AIModelConfig, AIProvider, AVAILABLE_MODELS } from '../services/ai/types'

interface ChatInterfaceProps {
  // Remove modelConfig prop since we'll manage it internally
}

const ChatInterface = ({}: ChatInterfaceProps) => {
  const { database } = useDatabase()
  const [messages, setMessages] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai')
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini')
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    loadAPIKeys()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadAPIKeys = async () => {
    if (!database) return
    
    try {
      const keys = await database.getAPIKeys()
      setApiKeys(keys)
      
      // Auto-select a provider that has an active API key
      const activeProvider = keys.find(key => key.is_active)?.provider
      if (activeProvider) {
        setSelectedProvider(activeProvider)
        
        // Fetch available models for the active provider
        const aiService = new AIService(database, 'demo-user-123')
        
        // Debug: Show all available models
        if (activeProvider === 'gemini') {
          await aiService.debugAvailableModels(activeProvider)
        }
        
        const models = await aiService.listAvailableModels(activeProvider)
        setAvailableModels(models)
        
        // Set default model for the provider (prefer flash over pro for better token handling)
        if (models.length > 0) {
          const flashModel = models.find(m => m.includes('flash'))
          setSelectedModel(flashModel || models[0])
        } else {
          // Fallback to predefined models
          const providerModels = AVAILABLE_MODELS.filter(model => model.provider === activeProvider)
          if (providerModels.length > 0) {
            setSelectedModel(providerModels[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const getActiveKeyForProvider = (provider: AIProvider) => {
    return apiKeys.find(key => key.provider === provider && key.is_active)
  }

  const hasActiveKey = (provider: AIProvider) => {
    return !!getActiveKeyForProvider(provider)
  }

  const getAvailableProviders = () => {
    return (['openai', 'gemini'] as AIProvider[]).filter(provider => hasActiveKey(provider))
  }

  const getAvailableModels = () => {
    if (availableModels.length > 0) {
      // Use dynamically fetched models
      return availableModels.map(modelId => ({
        id: modelId,
        name: modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        provider: selectedProvider,
        description: `Available ${selectedProvider} model`,
        maxTokens: 1000000,
        capabilities: ['text']
      }))
    } else {
      // Fallback to predefined models
      return AVAILABLE_MODELS.filter(model => model.provider === selectedProvider)
    }
  }

  const handleProviderChange = async (provider: AIProvider) => {
    setSelectedProvider(provider)
    
    // Fetch available models for the new provider
    if (database) {
      try {
        const aiService = new AIService(database, 'demo-user-123')
        const models = await aiService.listAvailableModels(provider)
        setAvailableModels(models)
        
        // Set default model for the provider (prefer flash over pro for better token handling)
        if (models.length > 0) {
          const flashModel = models.find(m => m.includes('flash'))
          setSelectedModel(flashModel || models[0])
        } else {
          // Fallback to predefined models
          const providerModels = AVAILABLE_MODELS.filter(model => model.provider === provider)
          if (providerModels.length > 0) {
            setSelectedModel(providerModels[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to load models for provider:', error)
      }
    }
  }

  const getCurrentModelConfig = (): AIModelConfig => {
    return {
      provider: selectedProvider,
      modelId: selectedModel,
      temperature: 0.7,
      maxTokens: 400
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    if (!database) return
    
    try {
      const allMessages = await database.getMessages()
      setMessages(allMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !database) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const aiService = new AIService(database, 'demo-user-123')
      const response = await aiService.chatWithAI(inputMessage, getCurrentModelConfig())
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        model: response.model,
        tokens: response.tokens,
        cost: response.cost
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API key configuration.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold mr-3">
              AI
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                AI Assistant
              </h1>
              <p className="text-sm text-gray-500">
                {selectedModel} • {selectedProvider}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Model</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selector Dropdown */}
      {showModelSelector && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">AI Platform</h3>
              <div className="flex space-x-3">
                {getAvailableProviders().map(provider => (
                  <button
                    key={provider}
                    onClick={() => handleProviderChange(provider)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      selectedProvider === provider
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-sm ${
                        provider === 'openai' ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {provider === 'openai' ? '🧠' : '💎'}
                      </div>
                      <span className="font-medium">
                        {provider === 'openai' ? 'OpenAI' : 'Google Gemini'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getAvailableModels().map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{model.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{model.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-gray-500">
                            Max: {model.maxTokens.toLocaleString()} tokens
                          </span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedModel === model.id 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedModel === model.id && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowModelSelector(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              🤖
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-500 mb-6">
              Ask me anything about your tasks, habits, or productivity goals.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => setInputMessage("Help me prioritize my tasks for today")}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all duration-200 text-left"
              >
                <div className="font-medium text-gray-900 mb-1">Task Prioritization</div>
                <div className="text-sm text-gray-500">Get help organizing your tasks</div>
              </button>
              <button
                onClick={() => setInputMessage("Suggest some healthy habits I should start")}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all duration-200 text-left"
              >
                <div className="font-medium text-gray-900 mb-1">Habit Suggestions</div>
                <div className="text-sm text-gray-500">Get personalized habit recommendations</div>
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-900 shadow-sm border border-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.tokens && (
                <div className="text-xs opacity-70 mt-2">
                  {message.tokens} tokens • ${message.cost?.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 shadow-sm border border-gray-200 px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
