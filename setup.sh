#!/bin/bash

# Zeno AI Setup Script
echo "🚀 Setting up Zeno AI..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "npm install -g pnpm"
    exit 1
fi

# Check if Rust/Tauri is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo is not installed. Please install it first:"
    echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
pnpm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env with your Supabase and OpenAI credentials"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your API keys"
echo "2. Set up Supabase project and run supabase-schema.sql"
echo "3. Run 'pnpm dev' to start the frontend"
echo "4. Run 'pnpm tauri:dev' to start the desktop app"
echo "5. Run 'cd backend && npm run dev' to start the API server"
