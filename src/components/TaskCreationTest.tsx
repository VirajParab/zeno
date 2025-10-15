import React, { useState } from 'react'
import { IntelligentDailyPlanner } from '../services/ai/intelligentDailyPlanner'
import { AIService } from '../services/ai/aiService'
import { useDatabase } from '../services/database/DatabaseContext'
import { UserProfile } from '../services/ai/advancedZenoCoachingService'

interface TaskCreationTestProps {
  userProfile: UserProfile
}

const TaskCreationTest: React.FC<TaskCreationTestProps> = ({ userProfile }) => {
  const { database } = useDatabase()
  const [testMessage, setTestMessage] = useState('I need to work on Zeono app development, fix bugs, and make client calls')
  const [result, setResult] = useState<string>('')
  const [isTesting, setIsTesting] = useState(false)

  const testTaskCreation = async () => {
    if (!database || !testMessage.trim()) return

    setIsTesting(true)
    setResult('Testing...')

    try {
      const aiService = new AIService(database, userProfile.id)
      const planner = new IntelligentDailyPlanner(aiService, database, userProfile.id)

      // Generate plan
      const { plan } = await planner.generateQuickPlan(testMessage)
      
      // Create confirmation
      const confirmation = {
        planId: plan.id,
        approvedBlocks: plan.timeBlocks.map(block => block.id),
        rejectedBlocks: [],
        modifications: [],
        userFeedback: 'Test approval'
      }

      // Process confirmation
      const result = await planner.processPlanConfirmation(plan, confirmation)
      
      setResult(`✅ Success! Created ${result.createdTasks.length} tasks:
${result.createdTasks.map(task => `- ${task.title} (${task.priority === 1 ? 'High' : task.priority === 2 ? 'Medium' : 'Low'} priority)`).join('\n')}`)

    } catch (error) {
      console.error('Test error:', error)
      setResult(`❌ Error: ${error.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Task Creation Test</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Message:
        </label>
        <textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <button
        onClick={testTaskCreation}
        disabled={isTesting || !testMessage.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {isTesting ? 'Testing...' : 'Test Task Creation'}
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <pre className="text-sm whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  )
}

export default TaskCreationTest
