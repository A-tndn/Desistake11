Here's a professional GitHub project description for your cricket betting platform:

---

# Cricket Betting Platform (Agent-Based)

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)

**A full-stack cricket betting platform with hierarchical agent management system**

[Features](#features) • [Tech Stack](#tech-stack) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Roadmap](#roadmap)

</div>

---

## 📋 Overview

A modern, scalable cricket betting platform built with **agent-based distribution model**. Unlike traditional betting sites with direct user registration, this platform operates through a hierarchical agent network where agents manage players, handle deposits/withdrawals, and earn commissions.

### 🎯 Key Differentiators

- **No Direct Signup**: All players are created and managed by agents
- **No Direct Deposits**: Agents handle all financial transactions offline
- **Multi-Tier Hierarchy**: Admin → Super Master → Master → Agent → Player
- **Automated Commissions**: Real-time commission distribution through hierarchy
- **Real-Time Betting**: Live cricket scores and instant bet settlement
- **Agent Dashboards**: Comprehensive management tools for each agent level

---

## ✨ Features

### 🏏 Betting Features
- **Multiple Bet Types**: Match Winner, Top Batsman/Bowler, Total Runs, Session Betting, Fancy Bets, Parlays
- **Live Betting**: Real-time odds updates during live matches
- **Auto Settlement**: Automatic bet settlement using Cricket API
- **Bet History**: Comprehensive betting history with filters
- **Risk Management**: Exposure limits and bet amount controls

### 👥 Agent Management
- **Hierarchical Structure**: 4-tier agent system (Super Master → Master → Agent)
- **Credit Management**: Agent-to-player credit transfers
- **Player Creation**: Agents create and manage their players
- **Commission System**: Automated commission calculation and distribution
- **Agent Dashboard**: Real-time stats, player management, financial tracking
- **KYC Integration**: Document verification for agents

### 💰 Financial System
- **Credit-Based**: No real money transactions in the platform
- **Offline Payments**: Agents handle cash/external transfers
- **Transaction Logging**: Complete audit trail of all transfers
- **Balance Management**: Real-time balance updates
- **Commission Tracking**: Transparent commission earnings

### 🎮 User Experience
- **Responsive Design**: Mobile-first approach with PWA support
- **Real-Time Updates**: WebSocket integration for live scores
- **Dark Mode**: Theme toggle for better UX
- **Notifications**: In-app notifications for bets, credits, matches
- **Multi-Language**: Support for English, Hindi (planned)

### 🔐 Security
- **JWT Authentication**: Secure token-based auth
- **Role-Based Access**: Granular permissions for each user type
- **Encrypted Passwords**: Bcrypt password hashing
- **Rate Limiting**: API rate limiting to prevent abuse
- **Audit Logs**: Complete activity logging
- **Session Management**: Secure session handling

---

## 🛠 Tech Stack

### Backend
```
Runtime:        Node.js 20+ LTS
Framework:      Express.js 4.18+
Language:       TypeScript 5+
Database:       PostgreSQL 15+
Cache:          Redis 7+
ORM:            Prisma 5+
Authentication: JWT (jsonwebtoken)
WebSocket:      Socket.io 4+
Validation:     Joi / Zod
API Docs:       Swagger/OpenAPI
```

### Frontend
```
Framework:      Next.js 14+ (App Router)
Language:       TypeScript 5+
UI Library:     shadcn/ui + Tailwind CSS
State:          Zustand
HTTP Client:    Axios
Real-time:      Socket.io-client
Forms:          React Hook Form + Zod
Tables:         TanStack Table
Charts:         Recharts
```

### DevOps & Infrastructure
```
Containerization: Docker + Docker Compose
Cloud:            AWS / Google Cloud / Azure
CI/CD:            GitHub Actions (planned)
Monitoring:       Winston (Logging)
Testing:          Jest + Supertest
```

### External Services
```
Cricket API:    CricAPI / Cricbuzz API / SportsRadar
SMS:            Twilio (optional)
Email:          SendGrid (optional)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)
- Cricket API Key (from CricAPI or similar)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cricket-betting-platform.git
cd cricket-betting-platform

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Edit .env files with your configurations
# Add your Cricket API key, database URL, JWT secrets, etc.

# Start services with Docker
docker-compose up -d

# Run database migrations
cd backend
npm run prisma:migrate
npm run seed

# Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api-docs
- **Prisma Studio**: `npm run prisma:studio` (in backend directory)

### Default Credentials

After running seed script:

```
Super Admin:
Username: superadmin
Password: Admin@123

Super Master Agent:
Username: supermaster1
Password: SuperMaster@123

Master Agent:
Username: master1
Password: Master@123

Regular Agent:
Username: agent1
Password: Agent@123

Players:
Username: player1-5
Password: Player@123
```

---

## 📁 Project Structure

```
cricket-betting-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Seed data
│   ├── src/
│   │   ├── config/                # Configuration files
│   │   ├── controllers/           # Route controllers
│   │   ├── db/                    # Database connections
│   │   ├── middleware/            # Express middleware
│   │   ├── routes/                # API routes
│   │   ├── services/              # Business logic
│   │   ├── utils/                 # Utility functions
│   │   ├── validators/            # Request validation
│   │   └── server.ts              # Entry point
│   └── package.json
│
├── frontend/
│   ├── app/                       # Next.js pages (App Router)
│   ├── components/                # React components
│   ├── lib/                       # Utilities & API client
│   ├── services/                  # API services
│   ├── store/                     # State management
│   └── package.json
│
├── docker-compose.yml             # Docker services
├── ROADMAP.md                     # Development roadmap
└── README.md                      # This file
```

---

## 📚 Documentation

### API Documentation
- **Development**: http://localhost:5000/api-docs
- **Postman Collection**: [Download](./docs/postman_collection.json) (planned)

### Key Endpoints

```
Authentication:
POST   /api/v1/auth/login          # Login (player/agent)
POST   /api/v1/auth/logout         # Logout
GET    /api/v1/auth/me             # Get current user

Matches:
GET    /api/v1/matches             # Get all matches
GET    /api/v1/matches/:id         # Get match details
POST   /api/v1/matches/sync        # Sync matches (admin)

Bets:
POST   /api/v1/bets                # Place bet
GET    /api/v1/bets                # Get user bets
GET    /api/v1/bets/:id            # Get bet details

Agents:
POST   /api/v1/agents/create-player      # Create player
POST   /api/v1/agents/transfer-credit    # Transfer credit
GET    /api/v1/agents/players            # Get agent's players
GET    /api/v1/agents/stats              # Get agent stats
```

### Architecture Docs
- [Database Schema](./docs/database-schema.md) (planned)
- [Agent Hierarchy](./docs/agent-hierarchy.md) (planned)
- [Commission System](./docs/commission-system.md) (planned)
- [Bet Settlement](./docs/bet-settlement.md) (planned)

---

## 🗺 Roadmap

### Phase 1: Core Foundation ✅
- [x] Database schema and migrations
- [x] Backend API structure
- [x] Authentication system
- [x] Basic frontend setup

### Phase 2: Betting Engine ✅
- [x] Cricket API integration
- [x] Match synchronization
- [x] Bet placement system
- [x] Automated bet settlement
- [x] Commission calculation

### Phase 3: Agent Management ✅
- [x] Agent hierarchy
- [x] Credit transfer system
- [x] Player creation by agents
- [x] Agent dashboards

### Phase 4: User Interface 🚧
- [ ] Player dashboard
- [ ] Betting interface
- [ ] Match listing and details
- [ ] Bet history
- [ ] Real-time score updates

### Phase 5: Advanced Features 📋
- [ ] Admin panel
- [ ] Analytics and reporting
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Multi-language support
- [ ] Advanced bet types

### Phase 6: Production Ready 📋
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Load testing
- [ ] Monitoring and logging
- [ ] Deployment automation
- [ ] Documentation completion

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests (planned)
npm run test:e2e
```

---

## 🚢 Deployment

### Using Docker

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions (planned).

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) (planned).

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⚠️ Legal Disclaimer

**IMPORTANT**: This software is provided for **educational and demonstration purposes only**.

- Online betting/gambling may be **illegal** in your jurisdiction
- Ensure compliance with local laws before deployment
- Obtain necessary licenses and permits
- Implement age verification (18+)
- Follow responsible gambling guidelines
- This platform does **NOT** handle real money transactions directly
- Operators are responsible for legal compliance

**The developers assume NO responsibility for misuse of this software.**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Cricket API providers (CricAPI, Cricbuzz, SportsRadar)
- Open source community
- Contributors and testers

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/cricket-betting-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cricket-betting-platform/discussions)
- **Email**: support@example.com (update with your email)

---

## 📊 Project Stats

![GitHub Stars](https://img.shields.io/github/stars/yourusername/cricket-betting-platform?style=social)
![GitHub Forks](https://img.shields.io/github/forks/yourusername/cricket-betting-platform?style=social)
![GitHub Issues](https://img.shields.io/github/issues/yourusername/cricket-betting-platform)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/yourusername/cricket-betting-platform)

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ for cricket betting enthusiasts

</div>

---

