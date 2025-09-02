#!/bin/bash

# Deployment script for Render.com
echo "🚀 Starting deployment process..."

# Clean up any existing build artifacts
echo "🧹 Cleaning up build artifacts..."
rm -rf node_modules
rm -rf package-lock.json

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if better-sqlite3 was installed correctly
if [ ! -d "node_modules/better-sqlite3" ]; then
    echo "❌ Error: better-sqlite3 not found in node_modules"
    exit 1
fi

echo "✅ better-sqlite3 installed successfully"

# Test the server
echo "🧪 Testing server startup..."
timeout 10s node index.js &
SERVER_PID=$!

sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully"
    kill $SERVER_PID
else
    echo "❌ Server failed to start"
    exit 1
fi

echo "🎉 Deployment preparation completed successfully!"
echo "📝 Next steps:"
echo "   1. Commit and push your changes to GitHub"
echo "   2. Connect your repository to Render.com"
echo "   3. Deploy as a Web Service"
echo "   4. Build Command: npm install"
echo "   5. Start Command: npm start"
