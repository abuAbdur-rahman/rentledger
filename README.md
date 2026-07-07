# RentLedger

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

RentLedger is a full-stack rent management platform for landlords and tenants.
It replaces notebook and chat-based rent tracking with role-based dashboards,
structured property and tenancy workflows, payment proof submission, and
automatic overdue calculations.

## Table Of Contents

- [Why RentLedger](#why-rentledger)
- [Demo And Screenshots](#demo-and-screenshots)
- [Feature Highlights](#feature-highlights)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Security](#security)
- [License](#license)

## Why RentLedger

Manual rent operations usually break down in the same ways:

- Landlords lose track of who has paid
- Tenants miss due dates
- Outstanding balances are not clearly visible
- Records are scattered across notebooks, chat threads, and spreadsheets

RentLedger solves this with clear ownership, auditable payment history, and
predictable workflows for both landlord and tenant roles.

## Demo And Screenshots

Drop your real screenshots and GIFs into `docs/media/`.
These are visual placeholders so the README is showcase-ready today.

| View | Placeholder | Replace With |
|---|---|---|
| Landing Page | ![Landing Placeholder](https://via.placeholder.com/1200x675.png?text=Landing+Page+Preview) | `docs/media/landing-page.png` |
| Landlord Dashboard | ![Landlord Placeholder](https://via.placeholder.com/1200x675.png?text=Landlord+Dashboard+Preview) | `docs/media/landlord-dashboard.png` |
| Tenant Dashboard | ![Tenant Placeholder](https://via.placeholder.com/1200x675.png?text=Tenant+Dashboard+Preview) | `docs/media/tenant-dashboard.png` |
| Property Management Flow | ![Property Flow Placeholder](https://via.placeholder.com/1200x675.png?text=Property+Management+Flow+GIF) | `docs/media/property-flow.gif` |
| Payment Submission Flow | ![Payment Flow Placeholder](https://via.placeholder.com/1200x675.png?text=Payment+Submission+Flow+GIF) | `docs/media/payment-flow.gif` |

## Feature Highlights

### Authentication And Accounts

- Email and password signup/signin
- Signed HttpOnly session cookie auth
- Route-aware session protection via proxy middleware
- Current-user endpoint (`GET /api/auth/me`)
- Secure signout that clears session
- Forgot password with hashed reset tokens and expiry
- Reset password with server-side token verification

### Landlord Experience

- Create and manage properties
- Add units to a property with rent amounts
- Property detail view with occupancy and payment status snapshots
- Invite tenants by phone
- Validate tenant phone before invite
- Track tenancy lifecycle (`pending`, `active`, `rejected`, `terminated`)
- Generate payment records for active tenancies
- Review payment submissions and verify/reject payments
- Dashboard KPIs: revenue, pending, overdue, active tenants, property count

### Tenant Experience

- Tenant dashboard with active tenancy summary
- Rent amount, next due date, and payment status visibility
- Payment proof/reference submission
- Paginated payment history
- Invitation response flow (accept/reject)
- Notification-driven tenancy updates
- No-tenancy state with public property suggestions

### Public Discovery Experience

- Public properties API (`/api/properties/public`) with pagination and query
- Featured property cards on landing page
- `properties-overview` page with search, filters, sorting, and load-more UX

### Notifications And Messaging

- Notifications center API (read/unread retrieval and updates)
- Mark one notification as read or mark all as read
- Cross-feature notification utility (invites and payment lifecycle)
- Conversation/message APIs for in-app communication scaffolding

### Smart Domain Logic

- Overdue status derived from due date plus payment status
- One-active-tenancy enforcement when accepting new invitation
- Outstanding balance derived from non-verified payments
- Provider-aware repository pattern for shared property workflows

## Architecture

### Data Provider Mode

RentLedger supports two providers via `DATA_PROVIDER`:

- `mongo` (default): primary runtime path using Mongoose models
- `supabase`: compatibility path for legacy Supabase-backed endpoints

Provider selection is defined in `src/lib/data/provider.ts`.

### Backend Design

- Next.js App Router API routes under `src/app/api/**`
- MongoDB connection + Mongoose models under `src/lib/mongodb/**`
- Provider-specific repositories in `src/lib/data/properties/**`

### Mongo Data Models

- `profiles`
- `properties`
- `units`
- `tenancies`
- `payments`
- `notifications`

## API Reference

### Auth And Profile

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register account | Public |
| `POST` | `/api/auth/signin` | Sign in and issue session cookie | Public |
| `POST` | `/api/auth/signout` | Sign out and clear session | Authenticated |
| `GET` | `/api/auth/me` | Current authenticated user | Authenticated |
| `POST` | `/api/auth/forgot-password` | Generate reset token flow | Public |
| `POST` | `/api/auth/reset-password` | Reset password via token | Public |
| `GET`, `PATCH` | `/api/profile` | Read/update profile | Authenticated |
| `POST` | `/api/profile/change-password` | Change current password | Authenticated |

### Dashboard

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Role-aware dashboard summary | Authenticated |

### Properties And Units

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET`, `POST` | `/api/properties` | List/create landlord properties | Landlord |
| `GET`, `PATCH`, `DELETE` | `/api/properties/:id` | Property detail/update/delete | Landlord |
| `GET`, `POST` | `/api/properties/:id/units` | List/add property units | Landlord |
| `GET` | `/api/properties/public` | Public property discovery list | Public |

### Tenancies And Tenants

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET`, `POST` | `/api/tenants` | List tenants / invite tenant | Landlord |
| `GET` | `/api/tenants/validate` | Validate tenant phone before invite | Landlord |
| `GET` | `/api/tenants/units` | List available units for invite flow | Landlord |
| `PATCH` | `/api/tenants/:id` | Update tenancy invitation status | Tenant |
| `POST` | `/api/tenancies/respond` | Accept/reject invitation | Tenant |

### Tenant Dashboard And History

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET`, `POST` | `/api/tenant/dashboard` | Tenant summary / payment submission | Tenant |
| `GET` | `/api/tenant/history` | Paginated payment history | Tenant |

### Payments

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/payments` | List landlord-relevant payments | Landlord |
| `PATCH` | `/api/payments/:id` | Verify/reject payment | Landlord |
| `POST` | `/api/payments/generate` | Generate payment records | Landlord |

### Notifications And Messages

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET`, `PATCH` | `/api/notifications` | List/update notifications | Authenticated |
| `GET`, `POST` | `/api/conversations` | List/create conversations | Authenticated |
| `GET`, `POST` | `/api/messages` | List/send messages | Authenticated |

## Tech Stack

- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS 4
- Backend: Next.js API routes, Node.js runtime, Mongoose
- Database: MongoDB Atlas (primary)
- Compatibility layer: Supabase (legacy auth/data/storage paths)
- Deployment: Vercel

## Getting Started

### Prerequisites

- Node.js 20.19+
- pnpm
- MongoDB Atlas cluster/URI
- Supabase project credentials (currently still required by compatibility/storage paths)

### Installation

```bash
git clone <repository-url>
cd rentledger
pnpm install
```

### Run

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
MONGODB_URI=your_mongodb_connection_string
DATA_PROVIDER=mongo
AUTH_SECRET=your_long_random_secret
```

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | None | Required by Supabase client/compatibility paths |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | None | Required by Supabase client/compatibility paths |
| `MONGODB_URI` | Yes | None | MongoDB Atlas connection string |
| `DATA_PROVIDER` | No | `mongo` | `mongo` or `supabase` |
| `AUTH_SECRET` | Yes | None (prod) | Must be long and random in production |

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Scripts

- `pnpm dev` - start development server
- `pnpm build` - production build
- `pnpm start` - run production build
- `pnpm lint` - run ESLint
- `pnpm typecheck` - run TypeScript checks

## Supabase Bootstrap (Optional Compatibility Mode)

If you run with `DATA_PROVIDER=supabase`, execute:

- `supabase/bootstrap.sql`

This initializes enums, schema, policies, and storage expected by legacy
Supabase-backed flows.

## Project Structure

```text
src/
  app/
    (dashboard)/
    api/
    auth/
  components/
  hooks/
  lib/
    auth/
    data/
    mongodb/
    supabase/
  services/
  types/
docs/
  media/                  # README screenshot/gif assets
```

## Security

- Signed, HttpOnly session cookie authentication
- Password hashing with scrypt and timing-safe comparison
- Password reset tokens stored as hashes with expiry
- Route-level role and ownership checks
- Defensive access checks for property, unit, tenancy, and payment actions
- Optional Supabase RLS policies in compatibility mode

## License

MIT
