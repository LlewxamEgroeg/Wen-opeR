#!/bin/bash
# Great Spring Solutions - Repository Initialization Script
# Run this script to initialize the Git repository and push to GitHub

set -e

echo "🌱 Great Spring Solutions - Repository Initialization"
echo "====================================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "main.wasp.ts" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Initialize git repository
echo "📦 Initializing Git repository..."
git init

# Add all files
echo "📁 Adding files..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "feat: initial commit - Great Spring Solutions MVP

- Wasp v0.26 full-stack app (React + Node.js + Prisma)
- Agentic delivery workspace with MCP server (20+ tools)
- PostgreSQL schema with 15 models, 10 enums
- Background jobs with PgBoss (5 scheduled jobs)
- Real-time WebSocket with Socket.IO
- REST API + OpenAPI documentation
- Email/password + Google/GitHub OAuth
- Coolify Docker deployment ready
- GitHub Actions CI/CD pipeline"

echo "✅ Repository initialized locally"
echo ""
echo "📋 Next steps:"
echo "1. Create GitHub repository at: https://github.com/new"
echo "   - Name: great-spring-solutions"
echo "   - Description: Agentic delivery workspace for outcome-oriented teams"
echo "   - Private (recommended) or Public"
echo "   - DO NOT initialize with README, .gitignore, or license"
echo ""
echo "2. Add remote and push:"
echo "   git remote add origin https://github.com/YOUR_ORG/great-spring-solutions.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Configure GitHub Secrets (Settings > Secrets > Actions):"
echo "   COOLIFY_URL=https://your-coolify-instance.com"
echo "   COOLIFY_TOKEN=your-coolify-api-token"
echo "   COOLIFY_SERVER=your-coolify-server-uuid"
echo ""
echo "4. Deploy to Coolify:"
echo "   - Connect repository in Coolify"
echo "   - Use docker-compose.yml"
echo "   - Add environment variables from .env.example"
echo ""
echo "🎉 Repository ready for GitHub!"