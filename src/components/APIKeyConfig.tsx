import { useState, useEffect } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'
import { AIService } from '../services/ai/aiService'
import { AIProvider, AIModel, APIKey, AVAILABLE_MODELS } from '../services/ai/types'

interface APIKeyConfigProps {
  className?: string
}

export function APIKeyConfig({ className = '' }: APIKeyConfigProps) {
  const { database } = useDatabase()
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [keys, models] = await Promise.all([
        database.getAPIKeys(),
        Promise.resolve(AVAILABLE_MODELS)
      ])
      setApiKeys(keys)
      setAvailableModels(models)
    } catch (error) {
      console.error('Failed to load API keys:', error)
      setError('Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAPIKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return
    }

    setIsValidating(true)
    setError('')
    setSuccess('')

    try {
      const trimmedKey = apiKey.trim()
      
      // Basic validation
      if (!trimmedKey) {
        setError('Please enter an API key.')
        return
      }

      if (trimmedKey.length < 10) {
        setError('API key appears to be too short. Please check your key.')
        return
      }

      const aiService = new AIService(database, 'demo-user-123')
      const isValid = await aiService.validateAPIKey(selectedProvider, trimmedKey)
      
      if (!isValid) {
        if (selectedProvider === 'openai' && !trimmedKey.startsWith('sk-')) {
          setError('OpenAI API key should start with "sk-". Please check your key.')
        } else if (selectedProvider === 'gemini' && trimmedKey.length < 20) {
          setError('Gemini API key appears to be too short. Please check your key.')
        } else {
          setError('Invalid API key format. Please check your key and try again.')
        }
        return
      }

      // Check if there's already an active key for this provider
      const existingKey = await database.getActiveAPIKey(selectedProvider)
      if (existingKey) {
        // Deactivate the existing key
        await database.updateAPIKey(existingKey.id, { is_active: false })
      }

      // Create new API key
      await database.createAPIKey({
        user_id: 'demo-user-123',
        provider: selectedProvider,
        key: trimmedKey,
        is_active: true,
        usage_count: 0
      })

      setSuccess(`API key for ${selectedProvider} added successfully!`)
      setApiKey('')
      await loadData()
    } catch (error) {
      console.error('Failed to add API key:', error)
      setError(`Failed to add API key: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsValidating(false)
    }
  }

  const handleToggleActive = async (keyId: string, isActive: boolean) => {
    try {
      if (isActive) {
        // If activating, deactivate other keys for the same provider
        const key = apiKeys.find(k => k.id === keyId)
        if (key) {
          const otherKeys = apiKeys.filter(k => k.provider === key.provider && k.id !== keyId)
          for (const otherKey of otherKeys) {
            await database.updateAPIKey(otherKey.id, { is_active: false })
          }
        }
      }
      
      await database.updateAPIKey(keyId, { is_active: !isActive })
      await loadData()
    } catch (error) {
      console.error('Failed to toggle API key:', error)
      setError('Failed to update API key')
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return
    }

    try {
      await database.deleteAPIKey(keyId)
      await loadData()
      setSuccess('API key deleted successfully')
    } catch (error) {
      console.error('Failed to delete API key:', error)
      setError('Failed to delete API key')
    }
  }

  const getProviderModels = (provider: AIProvider) => {
    return availableModels.filter(model => model.provider === provider)
  }

  const getActiveKeyForProvider = (provider: AIProvider) => {
    return apiKeys.find(key => key.provider === provider && key.is_active)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading API keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800">Success</h3>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Add New API Key */}
      <div className="card hover:shadow-lg transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl mr-4">
            ➕
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Add New API Key</h3>
            <p className="text-gray-600">Configure your AI service API keys to enable intelligent features</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="provider-select" className="block text-sm font-medium text-gray-700">
                AI Provider
              </label>
              <div className="relative">
                <select
                  id="provider-select"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white appearance-none cursor-pointer"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700">
                API Key
              </label>
              <div className="relative">
                <input
                  id="api-key-input"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${selectedProvider} API key`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleAddAPIKey}
              disabled={isValidating || !apiKey.trim()}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                isValidating || !apiKey.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add API Key</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Provider Information */}
      <div className="card hover:shadow-lg transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 text-xl mr-4">
            🤖
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">AI Provider Status</h3>
            <p className="text-gray-600">Monitor your AI service providers and available models</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['openai', 'gemini'] as AIProvider[]).map(provider => {
            const activeKey = getActiveKeyForProvider(provider)
            const models = getProviderModels(provider)
            
            return (
              <div key={provider} className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                activeKey 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-4">
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
                      <p className="text-sm text-gray-600">{models.length} models available</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                    activeKey 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      activeKey ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span>{activeKey ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Available Models:</span>
                  </div>
                  <div className="space-y-2">
                    {models.slice(0, 3).map(model => (
                      <div key={model.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">{model.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{model.description}</span>
                      </div>
                    ))}
                    {models.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{models.length - 3} more models
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Existing API Keys */}
      {apiKeys.length > 0 && (
        <div className="card hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 text-xl mr-4">
              🔑
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Manage API Keys</h3>
              <p className="text-gray-600">View, activate, or delete your existing API keys</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {apiKeys.map(key => (
              <div key={key.id} className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                key.is_active 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg ${
                      key.provider === 'openai' ? 'bg-green-600' : 'bg-blue-600'
                    }`}>
                      {key.provider === 'openai' ? '🧠' : '💎'}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900 capitalize">{key.provider}</h4>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          key.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            key.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span>{key.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Used {key.usage_count} times</span>
                          </div>
                          
                          {key.last_used_at && (
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(key.id, key.is_active)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                        key.is_active
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {key.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition-all duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="card hover:shadow-lg transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-xl mr-4">
            📚
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">How to Get API Keys</h3>
            <p className="text-gray-600">Follow these step-by-step guides to obtain your API keys</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white text-lg mr-3">
                🧠
              </div>
              <h4 className="text-lg font-semibold text-gray-900">OpenAI API Key</h4>
            </div>
            
            <div className="space-y-3">
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-medium">1</span>
                  <span>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 underline font-medium">OpenAI Platform</a></span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-medium">2</span>
                  <span>Sign in or create an account</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-medium">3</span>
                  <span>Go to API Keys section</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-medium">4</span>
                  <span>Click "Create new secret key"</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-medium">5</span>
                  <span>Copy the generated key</span>
                </li>
              </ol>
              
              <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Note:</span>
                  <span>OpenAI keys start with "sk-"</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg mr-3">
                💎
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Google Gemini API Key</h4>
            </div>
            
            <div className="space-y-3">
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">1</span>
                  <span>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 underline font-medium">Google AI Studio</a></span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">2</span>
                  <span>Sign in with your Google account</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">3</span>
                  <span>Click "Create API Key"</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">4</span>
                  <span>Copy the generated key</span>
                </li>
              </ol>
              
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Note:</span>
                  <span>Gemini keys are typically longer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Security Tips</h4>
              <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                <li>• Keep your API keys secure and never share them publicly</li>
                <li>• Monitor your usage to avoid unexpected charges</li>
                <li>• Use environment variables in production environments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
