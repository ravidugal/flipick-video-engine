#!/bin/bash

echo "🚀 ================================"
echo "🎬 Flipick AI Video Studio"
echo "📦 Installation Script"
echo "🚀 ================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the backend directory"
    exit 1
fi

echo -e "${BLUE}📋 Step 1: Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${BLUE}📋 Step 2: Checking environment file...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  .env file not found${NC}"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${BLUE}📝 Please edit .env file with your configuration${NC}"
    echo -e "${BLUE}   Especially update these values:${NC}"
    echo "   - GCP_PROJECT_ID"
    echo "   - GCP_SERVICE_KEY_PATH"
    echo "   - DB_CONNECTION_NAME"
    echo "   - DB_PASSWORD"
    echo "   - BUCKET_* (storage buckets)"
    echo "   - API keys (ANTHROPIC, ELEVENLABS, etc.)"
    echo ""
    echo -e "${RED}❗ Please configure .env before continuing${NC}"
    exit 0
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

echo ""
echo -e "${BLUE}📋 Step 3: Checking Cloud SQL Proxy...${NC}"

if ! command -v cloud-sql-proxy &> /dev/null; then
    echo -e "${RED}⚠️  Cloud SQL Proxy not found${NC}"
    echo "Installing Cloud SQL Proxy..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.darwin.amd64
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.linux.amd64
    else
        echo -e "${RED}❌ Unsupported OS${NC}"
        exit 1
    fi
    
    chmod +x cloud-sql-proxy
    sudo mv cloud-sql-proxy /usr/local/bin/
    echo -e "${GREEN}✅ Cloud SQL Proxy installed${NC}"
else
    echo -e "${GREEN}✅ Cloud SQL Proxy already installed${NC}"
fi

echo ""
echo -e "${BLUE}📋 Step 4: Running database migration...${NC}"
echo "This requires Cloud SQL Proxy to be running."
echo ""
echo -e "${BLUE}To start Cloud SQL Proxy, run in a separate terminal:${NC}"
echo "cloud-sql-proxy YOUR_CONNECTION_NAME"
echo ""
read -p "Press Enter once Cloud SQL Proxy is running, or Ctrl+C to skip..."

# Run migration
if [ -f "src/database/migrations/001_initial_schema.sql" ]; then
    echo "Running migration..."
    
    # Load .env variables
    export $(cat .env | grep -v '^#' | xargs)
    
    PGPASSWORD=$DB_PASSWORD psql -h 127.0.0.1 -p 5432 -U $DB_USER -d $DB_NAME -f src/database/migrations/001_initial_schema.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database migration completed${NC}"
    else
        echo -e "${RED}❌ Database migration failed${NC}"
        echo "Make sure Cloud SQL Proxy is running and credentials are correct"
    fi
else
    echo -e "${RED}⚠️  Migration file not found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ================================${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}🎉 ================================${NC}"
echo ""
echo -e "${BLUE}📚 Next Steps:${NC}"
echo ""
echo "1. Start Cloud SQL Proxy (in separate terminal):"
echo "   cloud-sql-proxy YOUR_CONNECTION_NAME"
echo ""
echo "2. Start development server:"
echo "   npm run dev"
echo ""
echo "3. Test API:"
echo "   curl http://localhost:3000/health"
echo ""
echo -e "${BLUE}📖 For more info, see README.md${NC}"
echo ""
