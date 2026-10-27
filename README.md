# Xtwitterbe

Twitter clone REST API built with Express, Prisma (MongoDB) and TypeScript.

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

The API runs on `http://localhost:4000` by default.

## Scripts

- `npm run dev` - start in watch mode
- `npm run build` - compile TypeScript
- `npm start` - run the compiled build
- `npm run typecheck` - type-check without emitting
- `npm run db:generate` - generate Prisma client
- `npm run db:push` - push schema to the database
- `npm run db:seed` - seed demo data
- `npm run db:studio` - open Prisma Studio

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` - MongoDB connection string
- `JWT_SECRET` / `JWT_EXPIRES_IN` - auth token config
- `CORS_ORIGINS` - comma-separated allowed origins
- `CLOUDINARY_*` - optional image upload config
