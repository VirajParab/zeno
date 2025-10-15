import React, { useState, useEffect } from 'react'
import { IntelligentDailyPlanner, DailyPlan, DailyPlanConfirmation } from '../services/ai/intelligentDailyPlanner'
import { AIService } from '../services/ai/aiService'
import { useDatabase } from '../services/database/DatabaseContext'
import { UserProfile } from '../services/ai/advancedZenoCoachingService'

interface IntelligentPlanningDemoProps {
  userProfile: UserProfile
}

const IntelligentPlanningDemo: React.FC<IntelligentPlanningDemoProps> = ({ userProfile }) => {
  const { database } = useDatabase()
  const [dailyPlanner, setDailyPlanner] = useState<IntelligentDailyPlanner | null>(null)
  const [userMessage, setUserMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [showPlanConfirmation, setShowPlanConfirmation] = useState(false)
  const [planMessage, setPlanMessage] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (database && userProfile) {
      const aiService = new AIService(database, userProfile.id)
      const planner = new IntelligentDailyPlanner(aiService, database, userProfile.id)
      setDailyPlanner(planner)
    }
  }, [database, userProfile])

  const handleGeneratePlan = async () => {
    if (!userMessage.trim() || !dailyPlanner) return

    setIsGenerating(true)
    try {
      const { plan, confirmationMessage } = await dailyPlanner.generateQuickPlan(userMessage)
      setDailyPlan(plan)
      setPlanMessage(confirmationMessage)
      setShowPlanConfirmation(true)
      setUserMessage('')
    } catch (error) {
      console.error('Error generating plan:', error)
      setPlanMessage("I'm sorry, I couldn't generate a plan right now. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfirmPlan = async (approved: boolean) => {
    if (!dailyPlan || !dailyPlanner) return

    setIsConfirming(true)
    try {
      const confirmation: DailyPlanConfirmation = {
        planId: dailyPlan.id,
        approvedBlocks: approved ? dailyPlan.timeBlocks.map(block => block.id) : [],
        rejectedBlocks: approved ? [] : dailyPlan.timeBlocks.map(block => block.id),
        modifications: [],
        userFeedback: approved ? 'Plan approved' : 'Plan rejected'
      }

      const result = await dailyPlanner.processPlanConfirmation(dailyPlan, confirmation)
      setPlanMessage(result.message)
      setShowPlanConfirmation(false)
      setDailyPlan(null)
    } catch (error) {
      console.error('Error confirming plan:', error)
      setPlanMessage("I'm sorry, there was an error processing your confirmation.")
    } finally {
      setIsConfirming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGeneratePlan()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow p-4">
        <h1 className="text-2xl font-bold text-gray-800">Zeno Intelligent Daily Planner</h1>
        <p className="text-gray-600">Tell me what you want to accomplish today, and I'll create a detailed schedule!</p>
      </header>

      <main className="flex-1 overflow-hidden p-4 flex">
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md p-4 mr-4">
          <h2 className="text-xl font-semibold mb-4">Plan Your Day</h2>
          
          {/* Input Section */}
          <div className="mb-4">
            <textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe what you want to accomplish today... (e.g., 'I need to work on Zeono app development, make client calls for Hugeleap, and plan marketing strategies')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={isGenerating}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleGeneratePlan}
                disabled={!userMessage.trim() || isGenerating}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? 'Generating Plan...' : 'Generate My Schedule'}
              </button>
            </div>
          </div>

          {/* Plan Message */}
          {planMessage && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 whitespace-pre-wrap">{planMessage}</p>
            </div>
          )}

          {/* Daily Plan Confirmation */}
          {showPlanConfirmation && dailyPlan && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-3">📅 Your Daily Schedule</h3>
                <div className="space-y-3">
                  {dailyPlan.timeBlocks.map((block) => (
                    <div key={block.id} className={`p-4 rounded-lg border ${
                      block.isBreak 
                        ? 'bg-gray-100 border-gray-300' 
                        : 'bg-white border-green-300'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-bold text-lg text-gray-800">
                              {block.startTime} - {block.endTime}
                            </span>
                            <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                              block.priority === 1 ? 'bg-red-100 text-red-700' :
                              block.priority === 2 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {block.priority === 1 ? 'High Priority' : block.priority === 2 ? 'Medium Priority' : 'Low Priority'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {block.duration} minutes
                            </span>
                          </div>
                          <h4 className="font-bold text-lg text-gray-800 mb-2">{block.title}</h4>
                          <p className="text-gray-600 mb-3">{block.description}</p>
                          {block.tasks.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Specific Tasks:</p>
                              <ul className="space-y-2">
                                {block.tasks.map((task) => (
                                  <li key={task.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    <div className="flex-1">
                                      <span className="font-medium text-gray-800">{task.title}</span>
                                      <p className="text-sm text-gray-600">{task.description}</p>
                                    </div>
                                    <span className="text-sm text-gray-500 font-medium">
                                      {task.estimatedDuration}min
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={() => handleConfirmPlan(true)}
                    disabled={isConfirming}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:opacity-50"
                  >
                    ✅ Approve & Create Tasks
                  </button>
                  <button
                    onClick={() => handleConfirmPlan(false)}
                    disabled={isConfirming}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold disabled:opacity-50"
                  >
                    ❌ Reject Plan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar with Examples */}
        <div className="w-1/3 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">💡 Example Requests</h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-1">Development Work</p>
              <p className="text-xs text-blue-700">
                "I need to work on Zeono app development, fix bugs, and add new features"
              </p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-1">Client Work</p>
              <p className="text-xs text-green-700">
                "I have client calls for Hugeleap, need to prepare proposals and follow up"
              </p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm font-medium text-purple-800 mb-1">Marketing</p>
              <p className="text-xs text-purple-700">
                "Plan marketing strategies, create content, and analyze campaigns"
              </p>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-800 mb-1">Mixed Day</p>
              <p className="text-xs text-orange-700">
                "Work on app development, make client calls, and plan marketing"
              </p>
            </div>
          </div>

          <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">✨ Features</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Automatic time blocking</li>
              <li>• Priority-based scheduling</li>
              <li>• Break time optimization</li>
              <li>• Task decomposition</li>
              <li>• One-click approval</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

export default IntelligentPlanningDemo
