import { useState } from 'react'
import { DatabaseProvider } from './services/database/DatabaseContext'
import { AIModelConfig } from './services/ai/types'

// Import new components
import Navigation from './components/Navigation'
import Dashboard from './components/Dashboard'
import ChatInterface from './components/ChatInterface'
import EnhancedTaskBoard from './components/EnhancedTaskBoard'
import HabitTracker from './components/HabitTracker'
import Settings from './components/Settings'

type ActiveTab = 'dashboard' | 'chat' | 'tasks' | 'habits' | 'settings'

function App() {
  const userId = 'demo-user-123'
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [selectedModelConfig, setSelectedModelConfig] = useState<AIModelConfig>({
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 400
  })

  const handleModelChange = (config: AIModelConfig) => {
    setSelectedModelConfig(config)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'chat':
        return <ChatInterface />
      case 'tasks':
        return <EnhancedTaskBoard />
      case 'habits':
        return <HabitTracker />
      case 'settings':
        return (
          <Settings 
            modelConfig={selectedModelConfig}
            onModelChange={handleModelChange}
          />
        )
      default:
        return <Dashboard />
    }
  }

  return (
    <DatabaseProvider userId={userId}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Navigation */}
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Main Content */}
        <main className="pt-16">
          {renderContent()}
        </main>
      </div>
    </DatabaseProvider>
  )
}

export default App