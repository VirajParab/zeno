import { useState } from 'react'
import { AIModelConfig } from '../services/ai/types'
import { APIKeyConfig } from './APIKeyConfig'
import { ModelSelector } from './ModelSelector'

interface SettingsProps {
  modelConfig: AIModelConfig
  onModelChange: (config: AIModelConfig) => void
}

const Settings = ({ onModelChange }: SettingsProps) => {
  const [activeSection, setActiveSection] = useState('api-keys')

  const sections = [
    { id: 'api-keys', label: 'API Keys', icon: '🔑' },
    { id: 'models', label: 'AI Models', icon: '🤖' },
    { id: 'database', label: 'Database', icon: '💾' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'about', label: 'About', icon: 'ℹ️' }
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'api-keys':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                API Key Management
              </h2>
              <p className="text-gray-600 mb-6">
                Configure your API keys for OpenAI and Google Gemini to enable AI features.
              </p>
            </div>
            <APIKeyConfig />
          </div>
        )
      
      case 'models':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                AI Model Configuration
              </h2>
              <p className="text-gray-600 mb-6">
                Select and configure your preferred AI models and parameters.
              </p>
            </div>
            <ModelSelector onModelChange={onModelChange} />
          </div>
        )
      
      case 'database':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Database Settings
              </h2>
              <p className="text-gray-600 mb-6">
                Manage your data storage and synchronization preferences.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Storage Mode
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input type="radio" name="storage" value="local" className="mr-3" defaultChecked />
                  <div>
                    <div className="font-medium text-gray-900">Local Only</div>
                    <div className="text-sm text-gray-500">Store data locally on your device</div>
                  </div>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="storage" value="cloud" className="mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Cloud Only</div>
                    <div className="text-sm text-gray-500">Store data in the cloud</div>
                  </div>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="storage" value="sync" className="mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Sync Mode</div>
                    <div className="text-sm text-gray-500">Sync between local and cloud</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Data Management
              </h3>
              <div className="space-y-3">
                <button className="btn-secondary w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Export Data
                </button>
                <button className="btn-secondary w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Import Data
                </button>
                <button className="btn-danger w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        )
      
      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Appearance Settings
              </h2>
              <p className="text-gray-600 mb-6">
                Customize the look and feel of your application.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Theme
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <button className="p-4 border-2 border-primary-500 rounded-lg bg-primary-50">
                  <div className="w-full h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded mb-2"></div>
                  <div className="text-sm font-medium text-gray-900">Light</div>
                </button>
                <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-gray-400">
                  <div className="w-full h-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded mb-2"></div>
                  <div className="text-sm font-medium text-gray-900">Dark</div>
                </button>
                <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-gray-400">
                  <div className="w-full h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded mb-2"></div>
                  <div className="text-sm font-medium text-gray-900">Auto</div>
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Language
              </h3>
              <select className="input-field">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
          </div>
        )
      
      case 'about':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4">
                Z
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Zeno AI
              </h2>
              <p className="text-gray-600 mb-6">
                Version 1.0.0
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                About
              </h3>
              <p className="text-gray-600 mb-4">
                Zeno AI is your personal productivity assistant that helps you manage tasks, 
                track habits, and achieve your goals with the power of artificial intelligence.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• Dual database system (local/cloud)</div>
                <div>• AI-powered task management</div>
                <div>• Habit tracking and analytics</div>
                <div>• Cross-platform desktop app</div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Support
              </h3>
              <div className="space-y-3">
                <button className="btn-secondary w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Help & Documentation
                </button>
                <button className="btn-secondary w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Support
                </button>
                <button className="btn-secondary w-full justify-start">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Check for Updates
                </button>
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Settings
            </h2>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="card">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
