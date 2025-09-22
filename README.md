# srfullstackinterview

A simple NestJS backend application with JSON RPC-like REST API.

## Features

- **NestJS** framework with TypeScript
- **SQLite** database with **Drizzle ORM** for data access
- **Zod** for validation
- **Jest** for integration testing
- Simple REST endpoint: `GET /hello`

## Prerequisites

- Node.js (v16 or higher)
- npm

## Installation

```bash
npm install
```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Build
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### GET /hello

Returns a greeting message with timestamp and stores the greeting in the database.

**Response:**
```json
{
  "message": "Hello, World!",
  "timestamp": "2025-09-22T10:27:08.803Z"
}
```

## Testing

Run integration tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Database

The application uses SQLite database with the following schema:

- **greetings** table:
  - `id` (INTEGER PRIMARY KEY)
  - `message` (TEXT NOT NULL)
  - `created_at` (INTEGER NOT NULL)

The database file (`database.sqlite`) is created automatically when the application starts.

## Project Structure

```
src/
├── database/          # Database configuration and schema
│   ├── database.ts    # Database connection setup
│   ├── database.module.ts  # NestJS database module
│   ├── init.ts        # Database initialization
│   └── schema.ts      # Drizzle schema definitions
├── hello/             # Hello feature module
│   ├── hello.controller.ts  # REST controller
│   ├── hello.dto.ts   # Data transfer objects and validation
│   ├── hello.module.ts      # Feature module
│   └── hello.service.ts     # Business logic service
├── app.module.ts      # Main application module
└── main.ts           # Application entry point

test/
├── setup.ts          # Test configuration
└── hello.integration.spec.ts  # Integration tests
```

## Architecture

The application follows NestJS best practices with:

- **Modular architecture** - Features organized in modules
- **Dependency injection** - Services injected via NestJS DI container
- **Integration testing** - Tests verify interaction between services
- **Database abstraction** - Drizzle ORM provides type-safe database access
- **Validation** - Zod schemas for data validation