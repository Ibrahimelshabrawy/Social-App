# Social App

A modern social media backend built with TypeScript, Express, MongoDB, GraphQL, Socket.IO, Redis, and AWS S3.

## Overview

This project provides a scalable social application backend with the following capabilities:

- User authentication and authorization
- Posts, stories, comments, and friend interactions
- Real-time chat and socket-based notifications
- GraphQL API support alongside REST endpoints
- File upload and download via AWS S3
- Redis-backed caching/session utilities
- Firebase admin integration for notifications and authentication flows

## Features

- JWT-based authentication for users and admins
- Role-based authorization middleware
- REST routes for auth, user, posts, stories, friends, and chat
- GraphQL endpoint with authenticated access
- Global error handling and request rate limiting
- File streaming and download from S3
- Redis service integration

## Tech Stack

- Node.js + TypeScript
- Express
- MongoDB with Mongoose
- GraphQL (`graphql-http`)
- Socket.IO
- Redis
- AWS S3
- Firebase Admin SDK
- Zod validation
- Nodemailer email support

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm
- MongoDB instance or Atlas cluster
- Redis instance
- AWS S3 bucket
- Firebase service account file if using Firebase admin features

### Installation

1. Clone the repository

```bash
git clone <repo-url>
cd "Social App"
```

2. Install dependencies

```bash
npm install
```

3. Create environment files

Copy the appropriate `.env` file and update values for your environment:

- `development.env`
- `production.env`

### Required Environment Variables

The application loads environment variables based on `NODE_ENV`.

Example variables:

```env
PORT=4005
MONGO_URI=mongodb://localhost:27017/socialApp
MONGO_URI_ONLINE=<your-production-mongo-uri>
REDIS_URI=<your-redis-uri>
SALT_ROUND=12
ENCRYPT_SECRET_KEY=<secret>
ACCESS_SECRET_KEY_USER=<secret>
ACCESS_SECRET_KEY_ADMIN=<secret>
REFRESH_SECRET_KEY_USER=<secret>
REFRESH_SECRET_KEY_ADMIN=<secret>
EXPIRES_IN=1h
PREFIX_USER=bearer
PREFIX_ADMIN=admin
WEB_CLIENT_ID=<google-oauth-client-id>
EMAIL=<smtp-email>
PASSWORD=<smtp-password>
WHITELIST=http://localhost:3000,http://localhost:4000
AWS_ACCESS_KEY=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_REGION=<aws-region>
AWS_BUCKET_NAME=<s3-bucket-name>
```

> Do not commit secrets or credentials to source control.

## Running the App

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run start:prod
```

The app boots from `src/index.ts`, initializes Express, connects to MongoDB and Redis, and starts the Socket.IO gateway.

## API Endpoints

### Core REST Endpoints

- `GET /` - Health check and welcome route
- `POST /auth/*` - Authentication routes
- `GET/POST /user/*` - User routes
- `GET/POST /posts/*` - Post routes
- `GET/POST /story/*` - Story routes
- `GET/POST /friends/*` - Friend request routes
- `GET/POST /chat/*` - Chat routes
- `GET /upload/*path` - File download route

### GraphQL

- `POST /graphql` - GraphQL endpoint protected by authentication middleware

## Project Structure

- `src/` - Application source code
  - `common/` - Shared utilities, middleware, types, and services
  - `config/` - Environment and configuration loader
  - `DB/` - Database connection, models, repositories
  - `modules/` - Feature modules for auth, users, posts, stories, chat, friends, GraphQL, and real-time

## Notes

- `NODE_ENV` determines which `.env` file is loaded from the repository root.
- The application uses `nodemon` for both development and production scripts, so ensure that your TypeScript files are compiled or run through `ts-node` as configured.
- MongoDB and Redis connection URLs must be valid for the chosen environment.
