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
    return <div className="api-key-config">Loading API keys...</div>
  }

  return (
    <div className={`api-key-config ${className}`}>
      <h3>AI API Configuration</h3>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {/* Add New API Key */}
      <div className="add-api-key-section">
        <h4>Add New API Key</h4>
        <div className="api-key-form">
          <div className="form-group">
            <label htmlFor="provider-select">Provider:</label>
            <select
              id="provider-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
              className="provider-select"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="api-key-input">API Key:</label>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${selectedProvider} API key`}
              className="api-key-input"
            />
          </div>
          
          <button
            onClick={handleAddAPIKey}
            disabled={isValidating || !apiKey.trim()}
            className="add-key-button"
          >
            {isValidating ? 'Validating...' : 'Add API Key'}
          </button>
        </div>
      </div>

      {/* Provider Information */}
      <div className="provider-info">
        <h4>Provider Information</h4>
        <div className="providers-grid">
          {(['openai', 'gemini'] as AIProvider[]).map(provider => {
            const activeKey = getActiveKeyForProvider(provider)
            const models = getProviderModels(provider)
            
            return (
              <div key={provider} className="provider-card">
                <div className="provider-header">
                  <h5>{provider === 'openai' ? 'OpenAI' : 'Google Gemini'}</h5>
                  <div className={`status-indicator ${activeKey ? 'active' : 'inactive'}`}>
                    {activeKey ? '🟢 Active' : '🔴 Inactive'}
                  </div>
                </div>
                
                <div className="provider-details">
                  <p><strong>Available Models:</strong> {models.length}</p>
                  <div className="models-list">
                    {models.map(model => (
                      <div key={model.id} className="model-item">
                        <span className="model-name">{model.name}</span>
                        <span className="model-description">{model.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Existing API Keys */}
      {apiKeys.length > 0 && (
        <div className="existing-keys-section">
          <h4>Existing API Keys</h4>
          <div className="api-keys-list">
            {apiKeys.map(key => (
              <div key={key.id} className="api-key-item">
                <div className="key-info">
                  <div className="key-header">
                    <span className="provider-name">{key.provider}</span>
                    <span className={`key-status ${key.is_active ? 'active' : 'inactive'}`}>
                      {key.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="key-details">
                    <span className="key-preview">
                      {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                    </span>
                    <span className="usage-count">
                      Used {key.usage_count} times
                    </span>
                    {key.last_used_at && (
                      <span className="last-used">
                        Last used: {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="key-actions">
                  <button
                    onClick={() => handleToggleActive(key.id, key.is_active)}
                    className={`toggle-button ${key.is_active ? 'deactivate' : 'activate'}`}
                  >
                    {key.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="setup-instructions">
        <h4>How to Get API Keys</h4>
        <div className="instructions-grid">
          <div className="instruction-card">
            <h5>OpenAI API Key</h5>
            <ol>
              <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
              <li>Sign in or create an account</li>
              <li>Go to API Keys section</li>
              <li>Click "Create new secret key"</li>
              <li>Copy the generated key</li>
            </ol>
          </div>
          
          <div className="instruction-card">
            <h5>Google Gemini API Key</h5>
            <ol>
              <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
              <li>Sign in with your Google account</li>
              <li>Click "Create API Key"</li>
              <li>Copy the generated key</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
