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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [apiKeyRefreshTrigger, setApiKeyRefreshTrigger] = useState(0)

  const handleApiKeyChange = () => {
    setApiKeyRefreshTrigger(prev => prev + 1)
  }

  const sections = [
    { 
      id: 'api-keys', 
      label: 'API Keys', 
      icon: '🔑',
      description: 'Manage your AI service keys',
      color: 'bg-blue-500'
    },
    { 
      id: 'models', 
      label: 'AI Models', 
      icon: '🤖',
      description: 'Configure AI model preferences',
      color: 'bg-purple-500'
    },
    { 
      id: 'database', 
      label: 'Data & Storage', 
      icon: '💾',
      description: 'Manage your data and storage',
      color: 'bg-green-500'
    },
    { 
      id: 'appearance', 
      label: 'Appearance', 
      icon: '🎨',
      description: 'Customize look and feel',
      color: 'bg-pink-500'
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: '🔔',
      description: 'Configure notification settings',
      color: 'bg-orange-500'
    },
    { 
      id: 'about', 
      label: 'About', 
      icon: 'ℹ️',
      description: 'App information and support',
      color: 'bg-gray-500'
    }
  ]

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' }
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'api-keys':
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
                🔑
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                API Key Management
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Configure your API keys for OpenAI and Google Gemini to enable AI features and unlock the full potential of Zeno AI.
              </p>
            </div>
            <APIKeyConfig onApiKeyChange={handleApiKeyChange} />
          </div>
        )
      
      case 'models':
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
                🤖
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                AI Model Configuration
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Select and configure your preferred AI models, adjust parameters, and customize the AI experience to match your needs.
              </p>
            </div>
            <ModelSelector key={apiKeyRefreshTrigger} onModelChange={onModelChange} />
          </div>
        )
      
      case 'database':
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
                💾
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Data & Storage
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Manage your data storage preferences, sync settings, and data management options.
              </p>
            </div>
            
            {/* Storage Mode */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-xl mr-4">
                  🗄️
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Storage Mode</h3>
                  <p className="text-gray-600">Choose how your data is stored and synchronized</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="relative cursor-pointer">
                  <input type="radio" name="storage" value="local" className="sr-only peer" defaultChecked />
                  <div className="p-6 border-2 border-gray-200 rounded-xl peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-gray-300 transition-all duration-200">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 text-xl mx-auto mb-3">
                        💻
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">Local Only</h4>
                      <p className="text-sm text-gray-600">Store data locally on your device</p>
                    </div>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input type="radio" name="storage" value="cloud" className="sr-only peer" />
                  <div className="p-6 border-2 border-gray-200 rounded-xl peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-gray-300 transition-all duration-200">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 text-xl mx-auto mb-3">
                        ☁️
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">Cloud Only</h4>
                      <p className="text-sm text-gray-600">Store data in the cloud</p>
                    </div>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input type="radio" name="storage" value="sync" className="sr-only peer" />
                  <div className="p-6 border-2 border-gray-200 rounded-xl peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-gray-300 transition-all duration-200">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 text-xl mx-auto mb-3">
                        🔄
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">Sync Mode</h4>
                      <p className="text-sm text-gray-600">Sync between local and cloud</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Data Management */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl mr-4">
                  📊
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Data Management</h3>
                  <p className="text-gray-600">Export, import, or manage your data</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mr-3 group-hover:bg-green-200">
                    📤
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Export Data</div>
                    <div className="text-sm text-gray-500">Download your data as CSV or JSON</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mr-3 group-hover:bg-blue-200">
                    📥
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Import Data</div>
                    <div className="text-sm text-gray-500">Upload data from backup files</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mr-3 group-hover:bg-purple-200">
                    🔄
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Sync Now</div>
                    <div className="text-sm text-gray-500">Manually trigger data sync</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 bg-gray-50 hover:bg-red-50 rounded-xl transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 mr-3 group-hover:bg-red-200">
                    🗑️
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Clear All Data</div>
                    <div className="text-sm text-gray-500">Permanently delete all data</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )
      
      case 'appearance':
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
                🎨
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Appearance Settings
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Customize the look and feel of your Zeno AI experience to match your preferences.
              </p>
            </div>
            
            {/* Theme Selection */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center text-pink-600 text-xl mr-4">
                  🌓
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Theme</h3>
                  <p className="text-gray-600">Choose your preferred color scheme</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setIsDarkMode(false)}
                  className={`p-6 border-2 rounded-xl transition-all duration-200 ${
                    !isDarkMode ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-16 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg mb-3 mx-auto"></div>
                    <h4 className="font-semibold text-gray-900 mb-1">Light</h4>
                    <p className="text-sm text-gray-600">Clean and bright interface</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => setIsDarkMode(true)}
                  className={`p-6 border-2 rounded-xl transition-all duration-200 ${
                    isDarkMode ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-16 h-10 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg mb-3 mx-auto"></div>
                    <h4 className="font-semibold text-gray-900 mb-1">Dark</h4>
                    <p className="text-sm text-gray-600">Easy on the eyes</p>
                  </div>
                </button>
                
                <button className="p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200">
                  <div className="text-center">
                    <div className="w-16 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mb-3 mx-auto"></div>
                    <h4 className="font-semibold text-gray-900 mb-1">Auto</h4>
                    <p className="text-sm text-gray-600">Follow system preference</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Language Selection */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-xl mr-4">
                  🌍
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Language</h3>
                  <p className="text-gray-600">Select your preferred language</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      selectedLanguage === lang.code 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{lang.flag}</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{lang.name}</div>
                        <div className="text-sm text-gray-500 uppercase">{lang.code}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      
      case 'notifications':
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
                🔔
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Notification Settings
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Configure how and when you receive notifications from Zeno AI.
              </p>
            </div>
            
            {/* Notification Toggles */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-xl mr-4">
                      🔔
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Enable Notifications</h3>
                      <p className="text-gray-600">Receive notifications from the app</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl mr-4">
                      🔄
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Auto Sync</h3>
                      <p className="text-gray-600">Automatically sync data in background</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Notification Types */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Notification Types</h3>
              <div className="space-y-4">
                {[
                  { icon: '📋', title: 'Task Reminders', description: 'Get reminded about upcoming tasks' },
                  { icon: '🎯', title: 'Habit Streaks', description: 'Celebrate your habit achievements' },
                  { icon: '💬', title: 'AI Responses', description: 'Notifications when AI completes tasks' },
                  { icon: '🔄', title: 'Sync Updates', description: 'Data synchronization status updates' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl mr-3">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-sm text-gray-600">{item.description}</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      
      case 'about':
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
                ℹ️
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                About Zeno AI
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Your personal productivity assistant powered by artificial intelligence.
              </p>
            </div>
            
            {/* App Info */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-4">
                  Z
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Zeno AI</h3>
                <p className="text-gray-600 mb-4">Version 1.0.0</p>
                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✓ Latest Version
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-600 mb-4">
                  Zeno AI is your personal productivity assistant that helps you manage tasks, 
                  track habits, and achieve your goals with the power of artificial intelligence.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary-600 mb-1">100%</div>
                    <div className="text-sm text-gray-600">Privacy Focused</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary-600 mb-1">24/7</div>
                    <div className="text-sm text-gray-600">AI Assistant</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary-600 mb-1">∞</div>
                    <div className="text-sm text-gray-600">Offline Ready</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary-600 mb-1">🚀</div>
                    <div className="text-sm text-gray-600">Fast & Reliable</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Key Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: '🤖', title: 'AI-Powered Chat', desc: 'Intelligent conversations' },
                  { icon: '📋', title: 'Task Management', desc: 'Organize your work' },
                  { icon: '🎯', title: 'Habit Tracking', desc: 'Build better habits' },
                  { icon: '💾', title: 'Dual Database', desc: 'Local & cloud storage' },
                  { icon: '🔄', title: 'Real-time Sync', desc: 'Seamless data sync' },
                  { icon: '🎨', title: 'Customizable UI', desc: 'Personalized experience' }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl mr-3">
                      {feature.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{feature.title}</div>
                      <div className="text-sm text-gray-600">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support */}
            <div className="card hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Support & Resources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mr-3 group-hover:bg-blue-200">
                    📚
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Documentation</div>
                    <div className="text-sm text-gray-500">User guide and tutorials</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mr-3 group-hover:bg-green-200">
                    💬
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Contact Support</div>
                    <div className="text-sm text-gray-500">Get help from our team</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mr-3 group-hover:bg-purple-200">
                    🔄
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Check Updates</div>
                    <div className="text-sm text-gray-500">Look for new features</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mr-3 group-hover:bg-orange-200">
                    ⭐
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Rate App</div>
                    <div className="text-sm text-gray-500">Share your feedback</div>
                  </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="card sticky top-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
                <p className="text-gray-600">Customize your Zeno AI experience</p>
              </div>
              
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                      activeSection === section.id
                        ? 'bg-primary-50 border-2 border-primary-200 shadow-sm'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-10 h-10 ${section.color} rounded-lg flex items-center justify-center text-white text-lg mr-3 group-hover:scale-105 transition-transform duration-200`}>
                        {section.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          activeSection === section.id ? 'text-primary-700' : 'text-gray-900'
                        }`}>
                          {section.label}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {section.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="card min-h-[600px]">
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings