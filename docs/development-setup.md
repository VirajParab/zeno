# Zeno Development Setup

## 🚀 Getting Started

This guide will help you set up a local development environment for Zeno and get you ready to contribute to the project.

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Git**: Version 2.30 or higher
- **PostgreSQL**: Version 14 or higher
- **Redis**: Version 6.0 or higher (for caching)

### Recommended Tools
- **VS Code**: With recommended extensions
- **Docker**: For containerized development
- **Postman**: For API testing
- **pgAdmin**: For database management

## 🛠️ Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/zeno.git
cd zeno
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd src
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 3. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### Required Environment Variables
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/zeno_dev"
REDIS_URL="redis://localhost:6379"

# AI Service Configuration
GEMINI_API_KEY="your_gemini_api_key"
OPENAI_API_KEY="your_openai_api_key"

# Authentication
JWT_SECRET="your_jwt_secret_key"
JWT_REFRESH_SECRET="your_refresh_secret_key"

# Application Configuration
NODE_ENV="development"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### 4. Database Setup
```bash
# Start PostgreSQL service
sudo service postgresql start

# Create database
createdb zeno_dev

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 5. Start Development Servers
```bash
# Start backend server
npm run dev:backend

# Start frontend development server (in new terminal)
npm run dev:frontend
```

## 🏗️ Project Structure

```
zeno/
├── docs/                    # Documentation
├── src/                     # Frontend React application
│   ├── components/          # React components
│   ├── services/           # API services and utilities
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── backend/                # Backend Node.js application
│   ├── src/
│   │   ├── controllers/    # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   └── prisma/            # Database schema and migrations
├── public/                 # Static assets
├── tests/                  # Test files
└── scripts/               # Build and deployment scripts
```

## 🔧 Development Workflow

### Daily Development
1. **Pull latest changes**: `git pull origin main`
2. **Start development servers**: `npm run dev`
3. **Make changes**: Edit code in your preferred editor
4. **Test changes**: Run tests and check functionality
5. **Commit changes**: `git add . && git commit -m "Description"`
6. **Push changes**: `git push origin feature-branch`

### Code Quality
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run type checking
npm run type-check

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### Database Operations
```bash
# Create new migration
npm run db:migrate:create -- "migration_name"

# Apply migrations
npm run db:migrate

# Rollback migration
npm run db:rollback

# Reset database
npm run db:reset

# Generate Prisma client
npm run db:generate
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
```
tests/
├── frontend/
│   ├── components/        # Component tests
│   ├── services/          # Service tests
│   └── utils/             # Utility tests
├── backend/
│   ├── controllers/       # API endpoint tests
│   ├── services/          # Service logic tests
│   └── models/            # Database model tests
└── integration/           # End-to-end tests
```

### Writing Tests
```typescript
// Example component test
import { render, screen } from '@testing-library/react'
import { DailyCoaching } from '../components/DailyCoaching'

describe('DailyCoaching', () => {
  it('renders the chat interface', () => {
    render(<DailyCoaching coachingService={mockService} userProfile={mockProfile} />)
    expect(screen.getByText('Zeno')).toBeInTheDocument()
  })
})
```

## 🐛 Debugging

### Frontend Debugging
- **React DevTools**: Browser extension for React debugging
- **Redux DevTools**: State management debugging
- **Network Tab**: API request/response inspection
- **Console Logs**: Strategic console.log statements

### Backend Debugging
- **VS Code Debugger**: Attach debugger to Node.js process
- **Postman**: API endpoint testing and debugging
- **Database Logs**: PostgreSQL query logging
- **Application Logs**: Structured logging with Winston

### Common Issues
1. **Port conflicts**: Change ports in environment variables
2. **Database connection**: Verify PostgreSQL is running
3. **AI API errors**: Check API keys and rate limits
4. **Build errors**: Clear node_modules and reinstall

## 📦 Building for Production

### Frontend Build
```bash
# Build for production
npm run build:frontend

# Preview production build
npm run preview
```

### Backend Build
```bash
# Build backend
npm run build:backend

# Start production server
npm run start:production
```

### Docker Build
```bash
# Build Docker image
docker build -t zeno .

# Run container
docker run -p 3000:3000 zeno
```

## 🔌 API Development

### API Documentation
- **Swagger UI**: Available at `/api/docs` in development
- **Postman Collection**: Import from `docs/api/postman-collection.json`
- **OpenAPI Spec**: Available at `docs/api/openapi.yaml`

### Adding New Endpoints
1. **Define Route**: Add route in `backend/src/routes/`
2. **Create Controller**: Implement logic in `backend/src/controllers/`
3. **Add Service**: Business logic in `backend/src/services/`
4. **Write Tests**: Add tests in `tests/backend/`
5. **Update Documentation**: Update API docs

### Example API Endpoint
```typescript
// routes/conversations.ts
router.post('/conversations', async (req, res) => {
  try {
    const conversation = await conversationService.create(req.body)
    res.json(conversation)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

## 🎨 Frontend Development

### Component Development
```typescript
// Example component structure
interface ComponentProps {
  // Define props
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    <div>
      {/* JSX */}
    </div>
  )
}

export default Component
```

### State Management
```typescript
// Using Zustand for state management
import { create } from 'zustand'

interface AppState {
  user: User | null
  setUser: (user: User) => void
}

const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
```

### Styling Guidelines
- **Tailwind CSS**: Use utility classes for styling
- **Component Library**: Use shared components from `components/shared/`
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Follow WCAG 2.1 AA guidelines

## 🤖 AI Service Integration

### Adding New AI Features
1. **Define Interface**: Create service interface
2. **Implement Service**: Add AI service implementation
3. **Add Tests**: Test AI service integration
4. **Update Frontend**: Add UI for new feature

### Example AI Service
```typescript
// services/ai/planningService.ts
export class PlanningService {
  async generatePlan(userInput: string): Promise<Plan> {
    const prompt = `Generate a plan based on: ${userInput}`
    const response = await this.aiService.chatWithAI(prompt)
    return this.parsePlan(response)
  }
}
```

## 📊 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Lazy load components
- **Bundle Analysis**: Use `npm run analyze` to check bundle size
- **Image Optimization**: Use WebP format and lazy loading
- **Caching**: Implement proper caching strategies

### Backend Optimization
- **Database Indexing**: Optimize database queries
- **Caching**: Use Redis for frequently accessed data
- **Connection Pooling**: Optimize database connections
- **API Rate Limiting**: Prevent abuse and ensure performance

## 🔒 Security Considerations

### Development Security
- **Environment Variables**: Never commit secrets to git
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries
- **XSS Prevention**: Sanitize user-generated content

### Security Testing
```bash
# Run security audit
npm audit

# Fix security vulnerabilities
npm audit fix

# Run security tests
npm run test:security
```

## 📚 Additional Resources

### Documentation
- **React Documentation**: https://react.dev/
- **Node.js Documentation**: https://nodejs.org/docs/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs

### Tools and Extensions
- **VS Code Extensions**: ESLint, Prettier, TypeScript, GitLens
- **Browser Extensions**: React DevTools, Redux DevTools
- **Database Tools**: pgAdmin, DBeaver
- **API Testing**: Postman, Insomnia

### Community
- **Discord**: Join our developer community
- **GitHub Issues**: Report bugs and request features
- **Wiki**: Additional documentation and guides
- **Blog**: Development updates and tutorials

---

*This setup guide ensures all developers can contribute effectively to Zeno's development.*
