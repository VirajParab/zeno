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
    <div className={`model-selector ${className}`}>
      <h4>AI Model Configuration</h4>
      
      {/* Provider Selection */}
      <div className="form-group">
        <label htmlFor="provider-select">AI Provider:</label>
        <select
          id="provider-select"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
          className="provider-select"
        >
          <option value="openai" disabled={!hasActiveKey('openai')}>
            OpenAI {!hasActiveKey('openai') && '(No API Key)'}
          </option>
          <option value="gemini" disabled={!hasActiveKey('gemini')}>
            Google Gemini {!hasActiveKey('gemini') && '(No API Key)'}
          </option>
        </select>
      </div>

      {/* Model Selection */}
      <div className="form-group">
        <label htmlFor="model-select">Model:</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="model-select"
        >
          {availableModels.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} - {model.description}
            </option>
          ))}
        </select>
      </div>

      {/* Model Information */}
      {getSelectedModelInfo() && (
        <div className="model-info">
          <div className="model-details">
            <h5>{getSelectedModelInfo()?.name}</h5>
            <p>{getSelectedModelInfo()?.description}</p>
            <div className="model-specs">
              <span className="spec-item">
                <strong>Max Tokens:</strong> {getSelectedModelInfo()?.maxTokens.toLocaleString()}
              </span>
              <span className="spec-item">
                <strong>Capabilities:</strong> {getSelectedModelInfo()?.capabilities.join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="advanced-settings">
        <h5>Advanced Settings</h5>
        
        <div className="form-group">
          <label htmlFor="temperature-slider">
            Temperature: {temperature}
          </label>
          <input
            id="temperature-slider"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="temperature-slider"
          />
          <div className="slider-labels">
            <span>Focused</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="max-tokens-input">Max Tokens:</label>
          <input
            id="max-tokens-input"
            type="number"
            min="1"
            max={getSelectedModelInfo()?.maxTokens || 4000}
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="max-tokens-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="system-prompt-textarea">System Prompt (Optional):</label>
          <textarea
            id="system-prompt-textarea"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Define the AI's behavior and personality..."
            className="system-prompt-textarea"
            rows={3}
          />
        </div>
      </div>

      {/* API Key Status */}
      <div className="api-key-status">
        {hasActiveKey(selectedProvider) ? (
          <div className="status-success">
            ✅ API key configured for {selectedProvider}
          </div>
        ) : (
          <div className="status-warning">
            ⚠️ No active API key for {selectedProvider}. Please add one in the API Configuration section.
          </div>
        )}
      </div>
    </div>
  )
}
