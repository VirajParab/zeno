import { useState, useEffect } from 'react'
import { AdvancedZenoCoachingService, CoachingConversation, UserProfile } from '../services/ai/advancedZenoCoachingService'

interface ConversationalOnboardingProps {
  onComplete: (profile: UserProfile) => void
  coachingService: AdvancedZenoCoachingService
}

const ConversationalOnboarding = ({ onComplete, coachingService }: ConversationalOnboardingProps) => {
  const [conversation, setConversation] = useState<CoachingConversation | null>(null)
  const [userInput, setUserInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [extractedInfo, setExtractedInfo] = useState<any>({})

  useEffect(() => {
    startConversation()
  }, [])

  const startConversation = async () => {
    try {
      const newConversation = await coachingService.startOnboardingConversation('User')
      setConversation(newConversation)
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  const sendMessage = async () => {
    if (!userInput.trim() || !conversation) return

    setIsTyping(true)
    try {
      const response = await coachingService.processUserResponse(userInput)
      
      // Update conversation
      const updatedConversation = coachingService.getCurrentConversation()
      if (updatedConversation) {
        setConversation(updatedConversation)
      }

      // Extract and store information
      if (response.metadata?.extractedInfo) {
        setExtractedInfo((prev: any) => ({
          ...prev,
          ...response.metadata.extractedInfo
        }))
      }

      setUserInput('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const completeOnboarding = () => {
    // Create user profile from extracted information
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name: extractedInfo.name || 'User',
      wakeTime: extractedInfo.wakeTime || '7:00 AM',
      sleepTime: extractedInfo.sleepTime || '11:00 PM',
      workHours: extractedInfo.workHours || '9:00 AM - 5:00 PM',
      restPatterns: extractedInfo.restPatterns || [],
      planningStyle: extractedInfo.planningStyle || 'flexible',
      focusAreas: extractedInfo.focusAreas || [],
      fiveYearGoals: extractedInfo.fiveYearGoals || [],
      yearlyGoals: extractedInfo.yearlyGoals || [],
      monthlyGoals: extractedInfo.monthlyGoals || [],
      habits: extractedInfo.habits || [],
      blockers: extractedInfo.blockers || [],
      motivationStyle: extractedInfo.motivationStyle || 'gentle',
      timeConstraints: extractedInfo.timeConstraints || [],
      motivationMode: extractedInfo.motivationMode || 'encouragement',
      tonePreference: extractedInfo.tonePreference || 'friendly',
      dailyReflections: [],
      energyLevels: [],
      completionRates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onComplete(profile)
  }

  const scrollToBottom = () => {
    const chatContainer = document.getElementById('chat-container')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4 animate-pulse">
            💬
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Starting Conversation</h3>
          <p className="text-gray-600">Preparing your personalized onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
            🧭
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Getting to Know You</h1>
          <p className="text-gray-600">Let's have a conversation about your world and goals</p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-96 flex flex-col">
          {/* Messages */}
          <div 
            id="chat-container"
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        Z
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      Z
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                disabled={isTyping}
              />
              <button
                onClick={sendMessage}
                disabled={!userInput.trim() || isTyping}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Send
              </button>
            </div>
            
            {/* Progress Indicator */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Conversation Progress</span>
                <span>{conversation.messages.filter(m => m.role === 'assistant').length} questions</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((conversation.messages.filter(m => m.role === 'assistant').length / 8) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Complete Button */}
        {conversation.messages.filter(m => m.role === 'assistant').length >= 8 && (
          <div className="text-center mt-6">
            <button
              onClick={completeOnboarding}
              className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 font-semibold shadow-sm"
            >
              Complete Setup
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Ready to start your journey with Zeno!
            </p>
          </div>
        )}

        {/* Extracted Info Preview (for debugging) */}
        {Object.keys(extractedInfo).length > 0 && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Information Collected:</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify(extractedInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConversationalOnboarding
