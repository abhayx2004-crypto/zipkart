# Zipkart

A TypeScript-based monorepo built with Turborepo featuring an authentication service microarchitecture with Redis caching, logging, and containerized deployment.

## 📋 Project Overview

Zipkart is a modern, scalable application built using a monorepo structure that separates applications and shared packages. It includes an authentication service, shared utilities, and infrastructure components, all containerized and orchestrated with Docker Compose.

## 🏗️ Architecture

### Monorepo Structure

```
zipkart/
├── apps/                    # Applications
│   └── authservice/        # Authentication microservice (Express.js)
├── packages/               # Shared packages
│   ├── logger/            # Structured logging with Pino
│   ├── redis/             # Redis client wrapper
│   ├── ui/                # UI component library
│   ├── eslint-config/     # Shared ESLint configurations
│   └── typescript-config/ # Shared TypeScript configurations
├── infra/                 # Infrastructure configuration
├── docker-compose.yml     # Docker services orchestration
├── package.json           # Root workspace configuration
└── turbo.json             # Turborepo configuration
```

## 🛠️ Technology Stack

- **Runtime**: Node.js >= 18
- **Language**: TypeScript 5.9.2
- **Build Tool**: Turborepo 2.9.14
- **Package Manager**: npm 11.13.0
- **Monorepo**: npm workspaces

### Applications

- **authservice**: Express.js based authentication microservice with Prisma ORM, PostgreSQL, and Swagger documentation

### Shared Packages

- **@repo/logger**: Structured logging using Pino and Pino-HTTP
- **@repo/redis**: Redis client wrapper using ioredis
- **@repo/ui**: React component library
- **@repo/eslint-config**: ESLint configurations (base, Next.js, React)
- **@repo/typescript-config**: TypeScript configurations

### Development Tools

- **TypeScript**: Static type checking
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Vitest**: Unit testing framework

### Infrastructure

- **Redis**: In-memory data store for caching
- **PostgreSQL**: Database (via Prisma ORM)
- **Nginx**: Reverse proxy gateway
- **Docker**: Containerization

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 11.13.0 or higher
- Docker & Docker Compose (for containerized deployment)

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development servers for all apps and packages
npm run dev

# Start development server for a specific app
npx turbo dev --filter=authservice
```

### Building

```bash
# Build all apps and packages
npm run build

# Build a specific package
npm run build --filter=authservice

# Check types across the monorepo
npm run check-types
```

### Code Quality

```bash
# Lint all code
npm run lint

# Format code with Prettier
npm run format
```

### Testing

```bash
# Run tests in authservice
npm run test --workspace=authservice
```

## 🐳 Docker Deployment

The repository includes a complete Docker Compose setup for local development and deployment:

### Services

- **redis**: Redis 7 Alpine container on port 6379
- **authservice**: Authentication service on port 8000
- **nginx**: Nginx gateway on port 80

### Running with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f authservice
```

### Environment Variables

Configure via Docker Compose:
- `PORT`: AuthService port (default: 8000)
- `REDIS_URL`: Redis connection URL (default: redis://redis:6379)
- `GATEWAY_SHARED_SECRET`: Shared secret for gateway authentication

## 📦 Monorepo Workspace Structure

### Root Scripts

All scripts run across the entire monorepo using Turborepo:

- `npm run dev` - Start development mode for all workspaces
- `npm run build` - Build all workspaces
- `npm run lint` - Lint all workspaces
- `npm run format` - Format all TypeScript, TSX, and Markdown files
- `npm run check-types` - Type check all workspaces

### Filtering

Target specific workspaces using Turbo's filter flag:

```bash
# Run only in authservice
npx turbo build --filter=authservice

# Run in all packages starting with @repo/
npx turbo build --filter=@repo/*
```

## 🔧 Turborepo Configuration

The project uses Turborepo for:
- Task orchestration and caching
- Dependency management between packages
- Parallel execution of build tasks
- Remote caching support

Key configurations in `turbo.json`:
- **build**: Caches outputs to `.next/` directory
- **lint**: Runs linting with dependency constraints
- **check-types**: Type checking with dependency constraints
- **dev**: Persistent development mode without caching

## 📝 Development Workflow

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make changes** in the relevant app or package
3. **Format code**: `npm run format`
4. **Lint**: `npm run lint`
5. **Check types**: `npm run check-types`
6. **Test**: `npm run test --workspace=<workspace-name>`
7. **Build**: `npm run build`
8. **Push and create a pull request**

## 🐛 Troubleshooting

### Dependencies not installing?
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Build failing?
```bash
# Clean build artifacts
npx turbo clean
npm run build
```

### Docker issues?
```bash
# Rebuild containers
docker-compose down
docker-compose up --build
```

## 📄 License

ISC

## 👨‍💻 Contributing

Contributions are welcome! Please ensure:
- Code follows the ESLint and Prettier configurations
- All tests pass
- Types are properly defined
- Commit messages are clear and descriptive

## 🔗 Useful Resources

- [Turborepo Documentation](https://turborepo.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
