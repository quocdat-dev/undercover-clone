# Undercover Clone

Web clone of the Undercover game built with Next.js, TailwindCSS, and Supabase.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS
- **Database & Realtime:** Supabase (PostgreSQL)
- **Language:** TypeScript

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Fill in your Supabase credentials
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - React components
- `lib/` - Utility functions and Supabase client
- `types/` - TypeScript type definitions
- `_bmad/` - BMAD method configuration (workflow management)

## Features

- Room-based multiplayer gameplay
- Real-time synchronization via Supabase Realtime
- Vietnamese word pairs (500+ pairs)
- Multiple game modes (Random, Pack Selection)
