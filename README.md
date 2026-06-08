<!-- Verified by the SayFix auto-fix loop (smoke test) -->
# 🚦 DealFindrs

AI-Powered Project Development Opportunity Assessment Platform

## Overview

DealFindrs is a web-based platform that enables property development promoters to systematically assess land/project opportunities against configurable criteria. The platform uses AI-powered assessment to provide instant Green/Amber/Red light evaluations with detailed explanations, gap analysis, and actionable next steps.

## Features

- **🎯 Set Your Criteria** - Define your minimum GM%, de-risk factors, and deal-breakers once
- **🎤 Voice-Guided Input** - AI assistant helps you think deeper about each opportunity
- **🚦 Instant RAG Assessment** - Get Green/Amber/Red ratings in seconds
- **📊 Priority Rankings** - See all opportunities ranked by potential
- **📄 Auto-Generate IMs** - One click to create Investment Memorandums
- **👥 Team Collaboration** - DealFindrs submit, Promoters review

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes + Supabase
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/deal-findrs.git
cd deal-findrs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Go to your Supabase dashboard
   - Open SQL Editor
   - Run the contents of `supabase/schema.sql`

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
deal-findrs/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Landing page
│   │   ├── signup/          # Signup flow
│   │   ├── login/           # Login page
│   │   ├── setup/           # Criteria setup
│   │   └── dashboard/       # Main dashboard
│   ├── components/          # Reusable components
│   └── lib/                 # Utilities and configs
│       └── supabase/        # Supabase client
├── public/                  # Static assets
├── supabase/
│   └── schema.sql          # Database schema
└── package.json
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

Proprietary - Factory2Key © 2024

## Support

Contact: support@factory2key.com
