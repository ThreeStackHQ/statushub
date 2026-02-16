# StatusHub

> Public status pages with uptime monitoring for indie SaaS

**StatusHub** is an affordable hosted status page service with built-in uptime monitoring. Perfect for indie SaaS founders who need a professional status page without enterprise pricing.

## Features

- 🚦 **Public Status Pages** — Beautiful, customizable status pages
- ⏱️ **Uptime Monitoring** — HTTP/HTTPS checks every 60s
- 📧 **Email Alerts** — Notify subscribers on downtime
- 📊 **Historical Uptime** — 30/60/90 day charts
- 🎨 **Custom Branding** — Logo, colors, custom domains
- 💰 **Affordable Pricing** — Starting at $9/mo

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS + shadcn/ui
- **Database:** PostgreSQL (Drizzle ORM)
- **Auth:** NextAuth.js v5
- **Email:** Resend
- **Payments:** Stripe

## Project Structure

```
statushub/
├── apps/
│   └── web/          # Next.js web app
├── packages/
│   ├── db/           # Drizzle ORM + schemas
│   └── config/       # Shared configs
└── turbo.json        # Turborepo config
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL

### Installation

```bash
# Clone the repo
git clone https://github.com/ThreeStackHQ/statushub.git
cd statushub

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations
pnpm --filter @statushub/db db:push

# Start dev server
pnpm dev
```

The app will be available at http://localhost:3000

## Development

```bash
# Run dev servers
pnpm dev

# Build for production
pnpm build

# Lint all packages
pnpm lint

# Format code
pnpm format
```

## Deployment

StatusHub is deployed on **Coolify** (self-hosted):
- Production: https://statushub.threestack.io
- Preview: https://statushub-dev.threestack.io

## License

MIT © ThreeStack

---

**Part of the [ThreeStack](https://threestack.io) product studio** 🚀
