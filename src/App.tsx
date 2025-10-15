import { useState, useEffect } from 'react'
import { DatabaseProvider, useDatabase } from './services/database/DatabaseContext'
import { AIModelConfig } from './services/ai/types'
import { AIService } from './services/ai/aiService'
import { AdvancedZenoCoachingService, UserProfile } from './services/ai/advancedZenoCoachingService'

// Import new components
import Navigation from './components/Navigation'
import Dashboard from './components/Dashboard'
import ChatInterface from './components/ChatInterface'
import ZenoTaskBoard from './components/ZenoTaskBoard'
import HabitTracker from './components/HabitTracker'
import Settings from './components/Settings'
import ConversationalOnboarding from './components/ConversationalOnboarding'

type ActiveTab = 'dashboard' | 'chat' | 'tasks' | 'habits' | 'settings'

function AppContent() {
  const { database } = useDatabase()
  const userId = 'demo-user-123'
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [selectedModelConfig, setSelectedModelConfig] = useState<AIModelConfig>({
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 400
  })
  const [aiService] = useState(() => new AIService(database, userId))
  const [coachingService] = useState(() => new AdvancedZenoCoachingService(aiService))
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isOnboarding, setIsOnboarding] = useState(false)

  useEffect(() => {
    // Check if user has completed onboarding
    const savedProfile = localStorage.getItem('zeno-user-profile')
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        setUserProfile(profile)
        coachingService.createUserProfile(profile)
      } catch (error) {
        console.error('Failed to load user profile:', error)
        setIsOnboarding(true)
      }
    } else {
      setIsOnboarding(true)
    }
  }, [coachingService])

  const handleModelChange = (config: AIModelConfig) => {
    setSelectedModelConfig(config)
  }

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile)
    setIsOnboarding(false)
    localStorage.setItem('zeno-user-profile', JSON.stringify(profile))
  }

  const renderContent = () => {
    if (isOnboarding) {
      return <ConversationalOnboarding onComplete={handleOnboardingComplete} coachingService={coachingService} />
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard coachingService={coachingService} userProfile={userProfile} />
      case 'chat':
        return <ChatInterface />
      case 'tasks':
        return <ZenoTaskBoard coachingService={coachingService} userProfile={userProfile} />
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
        return <Dashboard coachingService={coachingService} userProfile={userProfile} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {!isOnboarding && (
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} userProfile={userProfile} />
      )}
      
      <main className={isOnboarding ? '' : 'pt-16'}>
        {renderContent()}
      </main>
    </div>
  )
}

function App() {
  const userId = 'demo-user-123'
  
  return (
    <DatabaseProvider userId={userId}>
      <AppContent />
    </DatabaseProvider>
  )
}

export default App