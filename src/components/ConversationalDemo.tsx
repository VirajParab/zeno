import React, { useState, useEffect } from 'react'
import { ZenoConversationalAI } from '../services/ai/zenoConversationalAI'
import { AIService } from '../services/ai/aiService'
import { useDatabase } from '../services/database/DatabaseContext'
import { ConversationalResponse, GoalIntent, ClarificationQuestion } from '../services/ai/conversationalTypes'

interface ConversationalDemoProps {
  userProfile: any
}

const ConversationalDemo: React.FC<ConversationalDemoProps> = ({ userProfile }) => {
  const { database } = useDatabase()
  const [conversationalAI, setConversationalAI] = useState<ZenoConversationalAI | null>(null)
  const [userMessage, setUserMessage] = useState('')
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  const [extractedGoals, setExtractedGoals] = useState<GoalIntent[]>([])
  const [pendingQuestions, setPendingQuestions] = useState<ClarificationQuestion[]>([])
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (database) {
      const aiService = new AIService(database, userProfile.id)
      const conversationalAI = new ZenoConversationalAI(aiService, database, userProfile.id)
      setConversationalAI(conversationalAI)
    }
  }, [database, userProfile])

  const sendMessage = async () => {
    if (!userMessage.trim() || !conversationalAI) return

    setIsTyping(true)
    
    // Add user message to history
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setConversationHistory(prev => [...prev, userMsg])

    try {
      // Process with conversational AI
      const response = await conversationalAI.processConversation(
        userMessage,
        conversationHistory.map(msg => ({
          messageId: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        extractedGoals
      )

      // Handle extracted goals
      if (response.extractedData?.goals.length > 0) {
        setExtractedGoals(prev => [...prev, ...response.extractedData.goals as GoalIntent[]])
      }

      // Handle follow-up questions
      if (response.followUpQuestions.length > 0) {
        setPendingQuestions(prev => [...prev, ...response.followUpQuestions])
      }

      // Add Zeno's response
      const zenoMsg = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, zenoMsg])
      
      setUserMessage('')
    } catch (error) {
      console.error('Error processing message:', error)
    } finally {
      setIsTyping(false)
    }
  }

  const answerQuestion = async (questionId: string, answer: string) => {
    if (!conversationalAI) return

    setIsTyping(true)
    try {
      const result = await conversationalAI.processClarificationAnswer(
        questionId,
        answer,
        conversationHistory.map(msg => ({
          messageId: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      )

      // Remove answered question
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))

      // Add follow-up questions
      if (result.followUpQuestions?.length > 0) {
        setPendingQuestions(prev => [...prev, ...result.followUpQuestions])
      }

      // Add response
      const responseMsg = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, responseMsg])
    } catch (error) {
      console.error('Error processing answer:', error)
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🧠 Zeno Conversational AI Demo
        </h2>
        <p className="text-gray-600 mb-6">
          Try saying things like "I want to get fit" or "I need to launch a side project" 
          and watch Zeno extract goals and ask intelligent follow-up questions!
        </p>

        {/* Conversation History */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 min-h-64 max-h-96 overflow-y-auto">
          {conversationHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Start a conversation with Zeno! Try describing a goal or plan you have in mind.
            </p>
          ) : (
            <div className="space-y-4">
              {conversationHistory.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extracted Goals */}
        {extractedGoals.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-2">🎯 Goals Extracted</h4>
            <div className="space-y-1">
              {extractedGoals.slice(-3).map((goal) => (
                <div key={goal.id} className="text-sm text-green-700">
                  <span className="font-medium">{goal.extractedGoal}</span>
                  <span className="text-green-600 ml-2">({goal.category}, {goal.timeframe})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clarification Questions - SHOW ONLY 1 */}
        {pendingQuestions.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">❓ Quick Question</h4>
            <div className="text-sm">
              {(() => {
                const question = pendingQuestions[0] // Show only the first question
                return (
                  <div>
                    <p className="text-blue-700 mb-2">{question.question}</p>
                    {question.expectedAnswerType === 'choice' && question.options ? (
                      <div className="flex flex-wrap gap-1">
                        {question.options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => answerQuestion(question.id, option)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Your answer..."
                          className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              answerQuestion(question.id, e.currentTarget.value)
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            if (input.value.trim()) {
                              answerQuestion(question.id, input.value.trim())
                              input.value = ''
                            }
                          }}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex space-x-3">
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Describe a goal or plan you have in mind..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!userMessage.trim() || isTyping}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTyping ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Example Prompts */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Try these example prompts:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "I want to get fit",
              "I need to launch a side project",
              "I want to learn Spanish",
              "I need to save money for a house",
              "I want to improve my career"
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setUserMessage(prompt)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConversationalDemo
