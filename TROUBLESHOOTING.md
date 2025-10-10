# Troubleshooting Guide

## Common Issues and Solutions

### ERR_PNPM_META_FETCH_FAIL with Tauri CLI

**Error**: `ERR_PNPM_META_FETCH_FAIL GET https://registry.npmjs.org/@tauri-apps%2Fcli: Value of "this" must be of type URLSearchParams`

**Cause**: This error occurs due to compatibility issues between older versions of pnpm and certain packages, particularly with Node.js URLSearchParams handling.

**Solutions**:

#### Solution 1: Use npm instead of pnpm (Recommended)
```bash
# Remove pnpm lockfile if it exists
rm -f pnpm-lock.yaml

# Install dependencies with npm
npm install

# Install Tauri CLI globally
npm install @tauri-apps/cli -g

# Run development server
npm run dev
```

#### Solution 2: Update pnpm to latest version
```bash
# Update pnpm globally
npm install -g pnpm@latest

# Clear pnpm cache
pnpm store prune

# Try installing again
pnpm install
```

#### Solution 3: Use specific Node.js version
```bash
# If using nvm, switch to Node.js 18 LTS
nvm install 18
nvm use 18

# Then try installing with npm
npm install
```

### Supabase Schema Errors

**Error**: `ERROR: 42501: must be owner of table users`

**Cause**: Trying to modify system tables that are owned by Supabase.

**Solution**: Use the corrected schema in `supabase-schema.sql` which only modifies custom tables.

### API Key Validation Errors

**Error**: API key validation fails

**Solutions**:
1. Check API key format (should start with `sk-` for OpenAI or be a valid Gemini key)
2. Verify API key has necessary permissions
3. Check network connectivity
4. Ensure API key is not expired

### Database Sync Issues

**Error**: Sync conflicts or offline data loss

**Solutions**:
1. Check internet connectivity
2. Use conflict resolver UI to resolve conflicts
3. Manually sync when online
4. Check database mode (local/cloud/sync)

### Tauri Build Errors

**Error**: Tauri build fails

**Solutions**:
1. Ensure Rust is installed: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Install system dependencies for Linux
3. Check Tauri configuration in `src-tauri/tauri.conf.json`

## Environment Setup Issues

### Missing Environment Variables

**Error**: Supabase or OpenAI API errors

**Solution**: Ensure `.env` file exists with proper values:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Port Conflicts

**Error**: Port already in use

**Solution**: 
```bash
# Kill process using port 5173 (Vite default)
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

## Performance Issues

### Slow AI Responses

**Solutions**:
1. Use faster models (GPT-3.5-turbo instead of GPT-4)
2. Reduce max_tokens parameter
3. Optimize system prompts
4. Check API rate limits

### Database Performance

**Solutions**:
1. Use local database mode for better performance
2. Enable database indexes (already included in schema)
3. Limit message history queries
4. Use pagination for large datasets

## Getting Help

If you encounter issues not covered here:

1. Check the console for detailed error messages
2. Review the browser's Network tab for API call failures
3. Check Supabase logs in the dashboard
4. Verify all environment variables are set correctly
5. Ensure all dependencies are installed properly

## Development Tips

### Hot Reload Issues
- Restart the development server if hot reload stops working
- Clear browser cache if changes aren't reflected
- Check for TypeScript errors that might prevent compilation

### Database Development
- Use Supabase dashboard to inspect data
- Enable RLS policies for security
- Test both local and cloud database modes
- Use the sync feature to test offline functionality

### AI Integration
- Test with different models to find optimal performance/cost balance
- Monitor token usage to avoid unexpected costs
- Use the API key management UI to switch between providers
- Test offline functionality with local database mode
