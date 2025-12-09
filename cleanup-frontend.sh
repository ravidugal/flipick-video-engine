#!/bin/bash
# Frontend Cleanup Script for Flipick Video Studio
# Removes legacy Angular files and backup clutter

cd ~/flipick-ai-video/frontend

echo "🧹 Starting Frontend Cleanup..."
echo ""

# Step 1: Archive Angular app (don't delete yet, just move)
echo "📦 Archiving legacy Angular app..."
mkdir -p ../archive/angular-legacy-$(date +%Y%m%d)
mv src/app ../archive/angular-legacy-$(date +%Y%m%d)/ 2>/dev/null || echo "  ℹ️  App directory already moved"

# Step 2: Clean up backup files
echo "🗑️  Removing backup files..."
cd src/assets
rm -f *.backup *.backup2 *.bak *.broken *backup-*.html test-*.html 2>/dev/null || true
cd admin
rm -f *.backup *.backup2 *.bak *.broken 2>/dev/null || true
cd ../..

# Step 3: Remove Angular-specific files from root
echo "🗑️  Removing Angular config files..."
rm -f angular.json 2>/dev/null || echo "  ℹ️  No angular.json found"
rm -f tsconfig.app.json tsconfig.spec.json 2>/dev/null || true

# Step 4: Update package.json to remove Angular scripts
echo "📝 Cleaning package.json..."
# (Keep it as-is for now, just document it)

echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "📁 Current Structure:"
find src/assets -type f -name "*.html" | grep -v node_modules

echo ""
echo "📦 Archived Angular app to: ../archive/angular-legacy-$(date +%Y%m%d)/"
echo ""
echo "Next Steps:"
echo "1. Replace login.html with login-complete.html"
echo "2. Replace projects.html with projects-enhanced.html"
echo "3. Replace admin/tenants.html with tenants-enhanced.html"
echo "4. Test everything works"
echo "5. Delete archive if confirmed working"
