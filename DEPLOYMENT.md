# Deployment Guide

## Vercel Deployment

### Prerequisites

1. A Convex account with a deployed project
2. A Vercel account

### Setup Steps

#### 1. Get Your Convex Deploy Key

1. Go to your [Convex Dashboard](https://dashboard.convex.dev/)
2. Select your project
3. Navigate to **Settings** > **Deploy Keys**
4. Generate a new deploy key for production

#### 2. Configure Vercel Project

1. Import your repository to Vercel
2. Go to **Project Settings** > **General**
3. Set **Root Directory** to `.` (or leave empty)
4. Override **Build Command** with:
   ```
   npx convex deploy --cmd 'bun run build'
   ```
   
   > **Note**: If using npm instead of bun, use: `npx convex deploy --cmd 'npm run build'`

5. Set **Output Directory** to `.output/public`

#### 3. Set Environment Variables

In **Project Settings** > **Environment Variables**, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `CONVEX_DEPLOY_KEY` | Your deploy key from step 1 | Production |
| `NUXT_CONVEX_URL` | Your Convex production URL | All |
| `SESSION_SECRET` | Random string (min 32 chars) | All |
| `ENCRYPTION_KEY` | Random string (exactly 32 chars) | All |
| `NUXT_PUBLIC_APP_URL` | Your Vercel domain | Production |

**Generate secure keys:**
```bash
# For SESSION_SECRET
openssl rand -base64 32

# For ENCRYPTION_KEY (must be exactly 32 chars)
openssl rand -base64 24
```

#### 4. Deploy

Push to your main branch or manually trigger a deployment in Vercel.

### How It Works

1. **Convex Deploy**: `npx convex deploy` pushes your Convex backend schema and functions
2. **Code Generation**: Convex automatically generates TypeScript types in `convex/_generated/`
3. **Prebuild Hook**: The `prebuild` script runs `npx convex codegen` to ensure types exist
4. **Build**: Your Nuxt application builds with the generated types
5. **Deploy**: Vercel deploys the built application

### Troubleshooting

#### Build Error: "Could not load convex/_generated/api"

This error occurs when the Convex codegen step hasn't run. **Solution**:
- **On Vercel**: Use the build command: `npx convex deploy --cmd 'bun run build'`
- Set the `CONVEX_DEPLOY_KEY` environment variable in Vercel
- The `convex deploy` command handles code generation automatically

#### Build Error: "No CONVEX_DEPLOYMENT set"

This error can occur during local builds without a Convex deployment configured:
- For production deployments on Vercel, always use `npx convex deploy --cmd 'bun run build'`
- For local development, run `bunx convex dev` first to set up your deployment
- The `prebuild` script requires a valid Convex deployment to generate types

#### Environment Variable Issues

- `CONVEX_DEPLOY_KEY` must be set in Vercel, not in your code
- Generate secure random strings for `SESSION_SECRET` and `ENCRYPTION_KEY`
- `ENCRYPTION_KEY` must be exactly 32 characters

## Cloudflare Pages Deployment

For Cloudflare Pages deployment, use:

```bash
bun run build:cf
wrangler pages deploy .output/public
```

Or use the npm scripts:
```bash
bun run deploy       # Deploy to preview
bun run deploy:prod  # Deploy to production
```

### Cloudflare Environment Variables

Set these in Cloudflare Pages dashboard:
- `NUXT_CONVEX_URL`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `NUXT_PUBLIC_APP_URL`

**Note**: For Cloudflare, you need to manually run `npx convex deploy` before building, as Cloudflare Pages doesn't support the `npx convex deploy --cmd` wrapper.

## Local Development

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set up Convex:
   ```bash
   bunx convex dev
   ```

3. Configure environment variables (copy `.env.example` to `.env.local`)

4. Seed admin user:
   ```bash
   bunx convex run seedAdmin:seed
   ```

5. Start development server:
   ```bash
   bun run dev
   ```

## Post-Deployment

After first deployment:
1. Navigate to your deployed application
2. Log in with default credentials: `admin` / `admin`
3. **Immediately change the admin password** in Settings
4. Configure Dynamics 365 and OIDC settings in the Admin panel
