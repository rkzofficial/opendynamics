# OpenDynamics

A Nuxt.js 3 web application for Microsoft Dynamics 365 CRM case management.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Nuxt.js 3 with TypeScript
- **UI**: ShadCN-Vue + Tailwind CSS
- **Icons**: Lucide Vue
- **State**: Pinia + Composables
- **Charts**: Chart.js (vue-chartjs)
- **Database**: Convex (real-time backend)
- **Auth**: Username/Password (with optional OIDC via admin config)

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [Convex](https://convex.dev/) account

## Setup

### 1. Clone and install dependencies

```bash
bun install
```

### 2. Set up Convex

Create a new Convex project:

```bash
bunx convex dev
```

This will prompt you to log in and create a new project. Follow the instructions to set up your Convex backend.

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your Convex deployment URL:

```env
CONVEX_DEPLOYMENT=dev:your-project-name
NUXT_CONVEX_URL=https://your-project.convex.cloud

# Generate secure random strings for production
SESSION_SECRET=your-session-secret-min-32-chars-here!!
ENCRYPTION_KEY=your-encryption-key-for-tokens-32chars!

NUXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Seed the admin user

Run the seed script to create the initial admin user:

```bash
bunx convex run seedAdmin:seed
```

Default credentials:
- Username: `admin`
- Password: `admin`

**Important**: Change the password after first login!

### 5. Start the development server

```bash
bun run dev
```

The application will be available at http://localhost:3000

## Configuration

### Dynamics CRM Connection

1. Log in as admin
2. Go to Settings > Dynamics Connection
3. Enter your Azure AD app details:
   - Client ID (from Azure AD app registration)
   - Tenant ID
   - Organization URL (e.g., `https://your-org.crm.dynamics.com`)
4. Click "Connect" to authenticate using Microsoft's device code flow

### OIDC Configuration (Optional)

1. Log in as admin
2. Go to Settings > OIDC Configuration
3. Enable OIDC and configure:
   - Issuer URL
   - Client ID
   - Client Secret
   - Scopes

## Project Structure

```
opendynamics/
├── app/
│   ├── components/     # Vue components
│   ├── composables/    # Vue composables
│   ├── layouts/        # Page layouts
│   ├── pages/          # Route pages
│   └── utils/          # Utility functions
├── convex/             # Convex backend
├── server/
│   ├── api/            # API routes
│   ├── services/       # Business logic
│   └── utils/          # Server utilities
├── stores/             # Pinia stores
├── types/              # TypeScript types
└── assets/             # Static assets
```

## Development

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run Convex dev (for schema changes)
bunx convex dev
```

## Features

- **Dashboard**: KPI cards, charts, and recent cases
- **Cases List**: Searchable, filterable data table with pagination
- **Case Details**: Full case view with activity timeline and reply functionality
- **User Management**: Admin panel for managing users
- **Settings**: Configure OIDC and Dynamics CRM connections

## Security Notes

- All tokens are encrypted before storage
- Sessions are stored server-side with HTTP-only cookies
- OIDC client secrets are encrypted in the database
- Role-based access control (admin/user)

## License

MIT
