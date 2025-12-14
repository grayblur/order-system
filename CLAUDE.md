# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a flower pastry (花馍) order management system for wedding, engagement, and birthday occasions. The system records customer information, product details, order status, and supports printing production lists by date.

**Tech Stack:**
- Frontend: Vue 3 + Vite + Element Plus
- Backend: Node.js + Express
- Database: SQLite
- Deployment: Local Development (Primary) / Docker (Optional)

## Architecture

### Project Structure
```
order-system/
├── backend/           # Node.js + Express backend
│   ├── server.js       # Main server file (stable-server.js for production)
│   ├── simple-server.js # Simple API server for development
│   ├── routes/         # API route handlers
│   ├── models/         # Database models and schemas
│   ├── database.db     # SQLite database file
│   └── package.json    # Backend dependencies
├── frontend/          # Vue 3 frontend
│   ├── src/           # Vue source code
│   ├── dist/          # Built static files
│   ├── package.json   # Frontend dependencies
│   ├── vite.config.js # Vite configuration
│   └── Dockerfile.dev # Docker configuration (optional)
├── config/            # Configuration and data files
│   ├── goods.json     # Product catalog with hierarchical structure
│   ├── 前端开发文档.md # Detailed frontend development document
│   └── 技术实现       # Technical implementation notes
└── docker-compose.yml # Containerized deployment (optional)
```

### Key Configuration Files

**docker-compose.yml**:
- Frontend service exposed on port 5173
- ARM platform resource limits and optimizations
- Hot-reload enabled with volume mounting

**frontend/vite.config.js**:
- Vue 3 plugin configuration
- Development server on 0.0.0.0:5173 with polling for ARM
- HMR configuration
- Build optimizations for ARM (esbuild minification)

**frontend/Dockerfile.dev**:
- ARM64 Node.js 18 Alpine base image
- NPM registry configured for Chinese mirror
- Development dependencies with legacy peer deps

**config/goods.json**:
- Hierarchical product catalog: 花馍 → 结婚/订婚/生日 → 上头糕/剃头糕 etc. → 具体商品
- Product pricing structure

## Development Commands

### Local Development (Primary)
```bash
# Start backend server
cd backend
node stable-server.js

# Start frontend development server
cd frontend
npm install --legacy-peer-deps  # First time only (ARM platform)
npm run dev

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Health check: http://localhost:3000/health
```

### Backend Development Options
```bash
# Production-ready server with full features
node stable-server.js

# Simple API server for development
node simple-server.js

# Install backend dependencies (if needed)
npm install
```

### Docker Development (Optional)
```bash
# Start development environment
docker-compose up

# Build and start
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f frontend
```

### Frontend Build Commands
```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview
```

## Key Features & Implementation Notes

### Core Functionality
- **Order Entry**: Left-right layout with customer info (60%) and product selection (40%)
- **Product Selection**: Multi-level tree structure with checkboxes and quantity controls
- **Order Summary**: Real-time calculation with itemized list and payment status
- **Print Function**: Date-based production lists with customer details and payment status

### UI/UX Design
- **Color Scheme**: Chinese red (#E74C3C) primary, gold (#F39C12) secondary
- **Typography**: PingFang SC / Microsoft YaHei font stack
- **Responsive**: Desktop (≥1200px), Tablet (768-1199px), Mobile (<768px)

### Data Structure
Orders contain customer info (name/address, phone, delivery date, notes) and items array with product details, quantities, and pricing.

### API Design (Implemented)
- `GET /health` - Health check endpoint
- `GET /api` - API information and endpoints
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/goods` - Get product catalog
- `GET /api/orders/production/YYYY-MM-DD` - Get production list by date

## ARM Platform Optimizations

This project is specifically optimized for ARM architecture:
- Docker images use arm64v8 Node.js base
- Vite polling interval increased to reduce CPU usage
- Resource limits configured in docker-compose
- esbuild for faster minification
- NPM registry mirror for faster dependency installation

## Development Priorities

**P0 (Core)**: ✅ Customer info entry, product tree selection, order summary, order submission
**P1 (Important)**: ✅ Print production lists, data validation, error handling
**P2 (Optimization)**: Product search, responsive design, animations

## Local Deployment Setup

The system is now configured for local development by default:

### Service Configuration
- **Backend**: Node.js server running on port 3000
- **Frontend**: Vite development server on port 5173
- **Database**: SQLite file (`./database.db`) in backend directory
- **Hot Reload**: Enabled for both frontend and backend

### Production Deployment
For production deployment, use Docker containers:
```bash
docker-compose up -d
```

### Current Status (2025-11-28)
- ✅ Backend API fully implemented and operational
- ✅ Frontend Vue.js application with Element Plus UI
- ✅ SQLite database with proper schema
- ✅ Order management with production list functionality
- ✅ Local development environment configured
- 🔄 Docker containerization available as optional deployment method
- 前端为热更新，以后不需要每次都去开启服务
- 不要每次都启动前端服务和后端服务,检测到端口占用说明已启动服务且均为热更新,不用每次重启