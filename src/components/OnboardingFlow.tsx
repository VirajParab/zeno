import { useState, useEffect } from 'react'
import { ZenoCoachingService, UserProfile } from '../services/ai/zenoCoachingService'
import { AIService } from '../services/ai/aiService'

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void
  coachingService: ZenoCoachingService
}

const OnboardingFlow = ({ onComplete, coachingService }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    focusAreas: [],
    intentStyle: 'balanced',
    vision: '',
    fiveYearGoals: [],
    yearlyGoals: [],
    monthlyFocus: [],
    weeklyMilestones: [],
    energyLevel: 7,
    preferredPlanningTime: 'morning',
    motivationStyle: 'calm'
  })

  const focusAreas = [
    { id: 'career', label: 'Career', icon: '💼', description: 'Professional growth and development' },
    { id: 'finance', label: 'Finance', icon: '💰', description: 'Financial planning and wealth building' },
    { id: 'health', label: 'Health', icon: '🏃', description: 'Physical and mental wellness' },
    { id: 'learning', label: 'Learning', icon: '📚', description: 'Skills and knowledge acquisition' },
    { id: 'relationships', label: 'Relationships', icon: '❤️', description: 'Family, friends, and social connections' },
    { id: 'creativity', label: 'Creativity', icon: '🎨', description: 'Artistic expression and innovation' },
    { id: 'spirituality', label: 'Spirituality', icon: '🧘', description: 'Inner peace and purpose' },
    { id: 'adventure', label: 'Adventure', icon: '🌍', description: 'Travel and new experiences' }
  ]

  const intentStyles = [
    {
      id: 'growth',
      label: 'Growth',
      icon: '🧘',
      description: 'Slow & steady progress',
      details: 'Focus on sustainable habits and gradual improvement'
    },
    {
      id: 'hustle',
      label: 'Hustle',
      icon: '⚡',
      description: 'High-performance mode',
      details: 'Aggressive goals and maximum productivity'
    },
    {
      id: 'balanced',
      label: 'Balanced',
      icon: '💡',
      description: 'Life + productivity harmony',
      details: 'Equal focus on work, relationships, and personal growth'
    }
  ]

  const motivationStyles = [
    { id: 'calm', label: 'Calm & Gentle', icon: '🌊', description: 'Peaceful encouragement' },
    { id: 'push', label: 'Motivational Push', icon: '🔥', description: 'Energetic motivation' },
    { id: 'humor', label: 'Playful & Fun', icon: '😄', description: 'Light-hearted support' }
  ]

  const handleFocusAreaToggle = (areaId: string) => {
    setProfile(prev => ({
      ...prev,
      focusAreas: prev.focusAreas?.includes(areaId)
        ? prev.focusAreas.filter(id => id !== areaId)
        : [...(prev.focusAreas || []), areaId]
    }))
  }

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete onboarding
      coachingService.createUserProfile(profile).then(onComplete)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return profile.name?.trim().length > 0
      case 2: return profile.focusAreas && profile.focusAreas.length > 0
      case 3: return profile.intentStyle
      case 4: return profile.vision?.trim().length > 0
      case 5: return profile.fiveYearGoals && profile.fiveYearGoals.length > 0
      case 6: return true
      default: return false
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8">
              👋
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Zeno</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              I'm your personal AI coach, here to help you live intentionally — one day at a time.
            </p>
            <div className="max-w-md mx-auto">
              <input
                type="text"
                placeholder="What's your name?"
                value={profile.name || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                autoFocus
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What matters to you?</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Choose the areas you want to focus on. You can select multiple areas.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {focusAreas.map(area => (
                <button
                  key={area.id}
                  onClick={() => handleFocusAreaToggle(area.id)}
                  className={`p-6 rounded-lg border-2 transition-all duration-300 text-center group ${
                    profile.focusAreas?.includes(area.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{area.icon}</div>
                  <div className="font-semibold mb-1">{area.label}</div>
                  <div className="text-xs opacity-70">{area.description}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How do you like to work?</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Choose your preferred approach to achieving goals.
            </p>
            <div className="max-w-2xl mx-auto space-y-4">
              {intentStyles.map(style => (
                <button
                  key={style.id}
                  onClick={() => setProfile(prev => ({ ...prev, intentStyle: style.id as any }))}
                  className={`w-full p-6 rounded-lg border-2 transition-all duration-300 text-left group ${
                    profile.intentStyle === style.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{style.icon}</div>
                    <div>
                      <div className="font-semibold text-lg">{style.label}</div>
                      <div className="text-sm opacity-70">{style.description}</div>
                      <div className="text-xs opacity-50 mt-1">{style.details}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What's your vision?</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Where do you see yourself 5 years from now? What kind of person do you want to become?
            </p>
            <div className="max-w-2xl mx-auto">
              <textarea
                placeholder="Describe your vision for the future..."
                value={profile.vision || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, vision: e.target.value }))}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
                rows={6}
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Break down your vision</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              What are your 3-5 most important 5-year goals?
            </p>
            <div className="max-w-2xl mx-auto">
              <div className="space-y-4 mb-6">
                {(profile.fiveYearGoals || []).map((goal, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => {
                        const newGoals = [...(profile.fiveYearGoals || [])]
                        newGoals[index] = e.target.value
                        setProfile(prev => ({ ...prev, fiveYearGoals: newGoals }))
                      }}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      placeholder={`5-year goal ${index + 1}`}
                    />
                    <button
                      onClick={() => {
                        const newGoals = (profile.fiveYearGoals || []).filter((_, i) => i !== index)
                        setProfile(prev => ({ ...prev, fiveYearGoals: newGoals }))
                      }}
                      className="p-2 text-red-500 hover:text-red-600 transition-colors duration-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const newGoals = [...(profile.fiveYearGoals || []), '']
                  setProfile(prev => ({ ...prev, fiveYearGoals: newGoals }))
                }}
                className="px-6 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-all duration-300 flex items-center space-x-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Goal</span>
              </button>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Personalize your experience</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Let's fine-tune how I'll support you.
            </p>
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-3">Energy Level (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={profile.energyLevel || 7}
                  onChange={(e) => setProfile(prev => ({ ...prev, energyLevel: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-center text-gray-600 mt-2">{profile.energyLevel}/10</div>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-3">Preferred Planning Time</label>
                <select
                  value={profile.preferredPlanningTime || 'morning'}
                  onChange={(e) => setProfile(prev => ({ ...prev, preferredPlanningTime: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-3">Motivation Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {motivationStyles.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setProfile(prev => ({ ...prev, motivationStyle: style.id as any }))}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 text-center ${
                        profile.motivationStyle === style.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{style.icon}</div>
                      <div className="text-sm font-medium">{style.label}</div>
                      <div className="text-xs opacity-70">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-gray-600 text-sm mb-2">
            <span>Step {currentStep} of 6</span>
            <span>{Math.round((currentStep / 6) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="px-8 py-3 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {currentStep === 6 ? 'Complete Setup' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingFlow
