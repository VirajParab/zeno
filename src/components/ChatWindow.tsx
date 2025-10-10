import React, { useState, useEffect } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'
import { Message } from '../services/database/types'
import { chatWithAssistant } from '../services/apiClient'

interface ChatWindowProps {
  userId: string
}

const ChatWindow: React.FC<ChatWindowProps> = ({ userId }) => {
  const { database } = useDatabase()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [database])

  const fetchMessages = async () => {
    try {
      const messages = await database.getMessages()
      setMessages(messages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  // Refresh messages when database changes
  useEffect(() => {
    fetchMessages()
  }, [database])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    try {
      await chatWithAssistant(userId, userMessage)
      fetchMessages() // Refresh messages after sending
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
            Start a conversation with your AI assistant!
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div>{message.content}</div>
              <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
                {new Date(message.inserted_at).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div>Thinking...</div>
          </div>
        )}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatWindow
