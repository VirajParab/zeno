import { useState, useEffect } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'
import { AIProvider, AIModel, AIModelConfig, AVAILABLE_MODELS } from '../services/ai/types'

interface ModelSelectorProps {
  onModelChange: (config: AIModelConfig) => void
  className?: string
}

export function ModelSelector({ onModelChange, className = '' }: ModelSelectorProps) {
  const { database } = useDatabase()
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai')
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(400)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [apiKeys, setApiKeys] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Update available models when provider changes
    const providerModels = AVAILABLE_MODELS.filter(model => model.provider === selectedProvider)
    setAvailableModels(providerModels)
    
    // Select first available model for the provider
    if (providerModels.length > 0) {
      setSelectedModel(providerModels[0].id)
    }
  }, [selectedProvider])

  useEffect(() => {
    // Notify parent component when configuration changes
    const config: AIModelConfig = {
      provider: selectedProvider,
      modelId: selectedModel,
      temperature,
      maxTokens,
      systemPrompt: systemPrompt || undefined
    }
    onModelChange(config)
  }, [selectedProvider, selectedModel, temperature, maxTokens, systemPrompt, onModelChange])

  const loadData = async () => {
    try {
      const keys = await database.getAPIKeys()
      setApiKeys(keys)
      setAvailableModels(AVAILABLE_MODELS)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const getActiveKeyForProvider = (provider: AIProvider) => {
    return apiKeys.find(key => key.provider === provider && key.is_active)
  }

  const getSelectedModelInfo = () => {
    return availableModels.find(model => model.id === selectedModel)
  }

  const hasActiveKey = (provider: AIProvider) => {
    return !!getActiveKeyForProvider(provider)
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Provider Selection */}
      <div className="card hover:shadow-lg transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 text-xl mr-4">
            🏢
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">AI Provider</h3>
            <p className="text-gray-600">Choose your preferred AI service provider</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['openai', 'gemini'] as AIProvider[]).map(provider => {
            const hasKey = hasActiveKey(provider)
            const isSelected = selectedProvider === provider
            
            return (
              <button
                key={provider}
                onClick={() => hasKey && setSelectedProvider(provider)}
                disabled={!hasKey}
                className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : hasKey
                    ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg ${
                      provider === 'openai' ? 'bg-green-600' : 'bg-blue-600'
                    }`}>
                      {provider === 'openai' ? '🧠' : '💎'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {provider === 'openai' ? 'OpenAI' : 'Google Gemini'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {provider === 'openai' ? 'GPT models' : 'Gemini models'}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                    hasKey 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      hasKey ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span>{hasKey ? 'Ready' : 'No API Key'}</span>
                  </div>
                </div>
                
                {!hasKey && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Add API key in the API Keys section</span>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Model Selection */}
      <div className="card hover:shadow-lg transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl mr-4">
            🤖
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">AI Model Selection</h3>
            <p className="text-gray-600">Choose the specific model for your AI interactions</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {availableModels.map(model => {
            const isSelected = selectedModel === model.id
            const isRecommended = model.id.includes('gpt-4') || model.id.includes('gemini-pro')
            
            return (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{model.name}</h4>
                      {isRecommended && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{model.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-600">
                          <span className="font-medium">Max Tokens:</span> {model.maxTokens.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-gray-600">
                          <span className="font-medium">Capabilities:</span> {model.capabilities.slice(0, 2).join(', ')}
                          {model.capabilities.length > 2 && ` +${model.capabilities.length - 2} more`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="card hover:shadow-lg transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-xl mr-4">
            ⚙️
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Advanced Settings</h3>
            <p className="text-gray-600">Fine-tune your AI model behavior and responses</p>
          </div>
        </div>
        
        <div className="space-y-8">
          {/* Temperature Setting */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="temperature-slider" className="text-sm font-medium text-gray-700">
                Temperature
              </label>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                {temperature}
              </span>
            </div>
            
            <div className="space-y-3">
              <input
                id="temperature-slider"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(temperature / 2) * 100}%, #e5e7eb ${(temperature / 2) * 100}%, #e5e7eb 100%)`
                }}
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <div className="text-center">
                  <div className="font-medium">Focused</div>
                  <div className="text-gray-400">More deterministic</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Balanced</div>
                  <div className="text-gray-400">Good balance</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Creative</div>
                  <div className="text-gray-400">More random</div>
                </div>
              </div>
            </div>
          </div>

          {/* Max Tokens Setting */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="max-tokens-input" className="text-sm font-medium text-gray-700">
                Max Tokens
              </label>
              <span className="text-xs text-gray-500">
                Max: {getSelectedModelInfo()?.maxTokens.toLocaleString()}
              </span>
            </div>
            
            <div className="relative">
              <input
                id="max-tokens-input"
                type="number"
                min="1"
                max={getSelectedModelInfo()?.maxTokens || 4000}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Controls the maximum length of the AI's response. Higher values allow longer responses but may increase costs.
            </div>
          </div>

          {/* System Prompt Setting */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="system-prompt-textarea" className="text-sm font-medium text-gray-700">
                System Prompt
              </label>
              <span className="text-xs text-gray-500">Optional</span>
            </div>
            
            <div className="relative">
              <textarea
                id="system-prompt-textarea"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Define the AI's behavior and personality..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
                rows={4}
              />
            </div>
            
            <div className="text-xs text-gray-500">
              Instructions that guide the AI's behavior. This helps customize how the AI responds to your requests.
            </div>
          </div>
        </div>
      </div>

      {/* API Key Status */}
      <div className="card hover:shadow-lg transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-xl mr-4">
            🔑
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">API Key Status</h3>
            <p className="text-gray-600">Current configuration status for your selected provider</p>
          </div>
        </div>
        
        {hasActiveKey(selectedProvider) ? (
          <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800">API Key Configured</h4>
                <p className="text-sm text-green-700 mt-1">
                  Your {selectedProvider} API key is active and ready to use. You can start using AI features immediately.
                </p>
                <div className="mt-3 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Ready for AI interactions</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800">API Key Required</h4>
                <p className="text-sm text-red-700 mt-1">
                  No active API key found for {selectedProvider}. Please add an API key in the API Keys section to enable AI features.
                </p>
                <div className="mt-3">
                  <button className="inline-flex items-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-lg transition-colors duration-200">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Go to API Keys
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
