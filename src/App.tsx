import { useState } from 'react'
import HotkeyOverlay from './components/HotkeyOverlay'
import { DatabaseProvider } from './services/database/DatabaseContext'
import { DatabaseModeSelector } from './components/DatabaseModeSelector'
import { APIKeyConfig } from './components/APIKeyConfig'
import { ModelSelector } from './components/ModelSelector'
import { AIModelConfig } from './services/ai/types'

function App() {
  // For demo purposes, using a fixed user ID
  // In a real app, this would come from authentication
  const userId = 'demo-user-123'
  const [selectedModelConfig, setSelectedModelConfig] = useState<AIModelConfig>({
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 400
  })

  const handleModelChange = (config: AIModelConfig) => {
    setSelectedModelConfig(config)
  }

  return (
    <DatabaseProvider userId={userId}>
      <div className="App">
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          minHeight: '100vh',
          color: '#e5e7eb'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', background: 'linear-gradient(45deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Zeno AI
          </h1>
          <p style={{ fontSize: '18px', marginBottom: '40px', color: '#9ca3af' }}>
            Your cross-device personal assistant with dual database support
          </p>
          
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            background: '#374151', 
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <strong>Current Model:</strong> {selectedModelConfig.modelId} ({selectedModelConfig.provider})
            {selectedModelConfig.temperature && (
              <span> • Temperature: {selectedModelConfig.temperature}</span>
            )}
            {selectedModelConfig.maxTokens && (
              <span> • Max Tokens: {selectedModelConfig.maxTokens}</span>
            )}
          </div>
          
          <div style={{ 
            maxWidth: '600px', 
            margin: '0 auto', 
            background: '#1f2937', 
            padding: '30px', 
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#e5e7eb' }}>Configuration</h3>
            
            {/* Database Configuration */}
            <DatabaseModeSelector />
            
            {/* AI Configuration */}
            <APIKeyConfig />
            
            {/* Model Selection */}
            <ModelSelector onModelChange={handleModelChange} />
            
            <div style={{ marginTop: '30px', textAlign: 'left', lineHeight: '1.6' }}>
              <h4 style={{ color: '#e5e7eb', marginBottom: '15px' }}>Features:</h4>
              <p><strong>🖥️ Desktop (Linux):</strong> Press <kbd style={{ background: '#374151', padding: '2px 6px', borderRadius: '3px' }}>Ctrl+Space</kbd> to open the overlay</p>
              <p><strong>📱 Mobile (Android):</strong> Install as PWA and use the same interface</p>
              <p><strong>💬 Chat:</strong> Ask your AI assistant anything</p>
              <p><strong>✅ Tasks:</strong> Drag and drop tasks between To Do, Doing, Done</p>
              <p><strong>📊 Today:</strong> Quick overview of your day's progress</p>
              <p><strong>🗄️ Local Database:</strong> Fast offline access with SQLite</p>
              <p><strong>☁️ Cloud Sync:</strong> Seamless synchronization across devices</p>
              <p><strong>🤖 Multiple AI Providers:</strong> OpenAI and Google Gemini support</p>
              <p><strong>🔑 API Key Management:</strong> Secure storage and management of API keys</p>
            </div>
            
            <div style={{ marginTop: '30px', padding: '20px', background: '#374151', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#e5e7eb' }}>Setup Required:</h4>
              <ol style={{ textAlign: 'left', margin: 0, paddingLeft: '20px' }}>
                <li>Create a Supabase project and run the SQL schema</li>
                <li>Add your environment variables to <code>.env</code></li>
                <li>Run <code>pnpm install && pnpm tauri:dev</code></li>
              </ol>
            </div>
          </div>

          <div style={{ marginTop: '40px', fontSize: '14px', color: '#6b7280' }}>
            <p>Press <kbd style={{ background: '#374151', padding: '2px 6px', borderRadius: '3px' }}>Ctrl+Space</kbd> anywhere to open the assistant</p>
          </div>
        </div>
        
        <HotkeyOverlay />
      </div>
    </DatabaseProvider>
  )
}

export default App
