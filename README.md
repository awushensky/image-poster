# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t image-poster .

# Run the container
docker run -p 3000:3000 image-poster
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

# Testing Guide

This test suite provides comprehensive coverage for your database operations without requiring manual testing or a live database connection.

## 🚀 Quick Start

```bash
# Run all tests
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run only database tests
npm run test:database

# Run tests with coverage report
npm run test:coverage

# Open visual test UI
npm run test:ui
```

## 📁 Test Structure

```
tests/
├── setup/
│   ├── database-test-setup.ts    # Test database setup & utilities
│   └── test-setup.ts             # Global test configuration
└── database/
    ├── database-initialization.test.ts   # Schema & dependency tests
    ├── user-database.test.ts            # User operations tests
    ├── posting-time-database.test.ts    # Posting time tests
    └── image-queue-database.test.ts     # Image queue tests
```