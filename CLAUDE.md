# OpenDynamics - Agent Guidelines

## Build Commands

```bash
# Development
bun run dev              # Start dev server on http://localhost:3000
bunx convex dev          # Start Convex dev mode for schema changes

# Production (Bun)
bun run build            # Build for production
bun run preview          # Preview production build
bun run start            # Start production server (uses bun)

# Cloudflare Pages Deployment
bun run build:cf         # Build for Cloudflare Pages
bun run preview:cf       # Preview Cloudflare build locally
bun run deploy           # Build and deploy to Cloudflare Pages
bun run deploy:prod      # Deploy to production branch

# Convex Operations
bunx convex run seedAdmin:seed    # Seed initial admin user
bunx convex deploy                # Deploy to production
```

**Note**: No test framework or linter is currently configured. Use TypeScript strict mode for type checking.

## API Documentation

For Dynamics 365 CRM API details, refer to:
- [`dynamics_crm_api_complete_reference.md`](./dynamics_crm_api_complete_reference.md) - Complete API reference for Microsoft Dynamics 365 Dataverse Web API (OData v4.0)
- [`dynamics_crm_integration_guide.md`](./dynamics_crm_integration_guide.md) - Integration guide covering case management workflows and authentication

## Code Style Guidelines

### TypeScript & JavaScript

- **Module System**: ESM (`"type": "module"` in package.json)
- **Strict Mode**: Enabled - all code must be fully typed
- **Quotes**: Single quotes for strings
- **Semicolons**: Optional ( codebase omits them)
- **Indentation**: 2 spaces

### Import Conventions

```typescript
// App code (app/ directory) - use ~ alias
import { cn } from '~/utils/cn'
import type { User } from '~/types'

// Server code (server/ directory) - use relative paths
import { getConvexClient } from '../../utils/convex'

// Convex code - use @convex alias
import { api } from '@convex/_generated/api'
import { mutation } from "./_generated/server";

// Third-party imports
import { v } from "convex/values";
import { ref, computed } from 'vue'
```

### Naming Conventions

- **Vue Components**: PascalCase (e.g., `Button.vue`, `UserMenu.vue`)
- **API Routes**: kebab-case with HTTP method (e.g., `index.get.ts`, `[id].delete.ts`)
- **Composables**: camelCase with `use` prefix (e.g., `useAuth.ts`, `useCases.ts`)
- **Types/Interfaces**: PascalCase (e.g., `User`, `DashboardStats`)
- **Convex Functions**: camelCase (e.g., `validateSession`, `cleanupExpiredSessions`)
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants

### Vue Components

```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed } from 'vue'
import type { PropType } from 'vue'

// 2. Type definitions
interface Props {
  variant?: 'default' | 'destructive'
}

// 3. Props with defaults
const props = withDefaults(defineProps<Props>(), {
  variant: 'default'
})

// 4. Reactive state
const isLoading = ref(false)

// 5. Computed
const className = computed(() => `btn-${props.variant}`)
</script>

<template>
  <button :class="className">
    <slot />
  </button>
</template>
```

### Error Handling

**Server API Routes**:
```typescript
import type { H3Event } from 'h3'

try {
  const result = await someOperation()
  return result
} catch (error: unknown) {
  const err = error as Error
  throw createError({
    statusCode: 500,
    message: err.message || 'Operation failed',
  })
}
```

**Authentication Errors**:
```typescript
// Use 401 for auth failures
throw createError({
  statusCode: 401,
  message: 'Unauthorized',
})

// Use 403 for permission failures  
throw createError({
  statusCode: 403,
  message: 'Admin access required',
})
```

### Type Patterns

**Interface Definitions** (in `types/index.ts`):
```typescript
export interface User {
  _id: string
  username: string
  email?: string        // Optional fields
  role: 'admin' | 'user'  // Literal union types
}
```

**Convex Schema**:
```typescript
import { v } from "convex/values";

export const create = mutation({
  args: {
    username: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

## Project Structure

```
app/
  components/        # Vue components (ui/, layout/, dashboard/)
  composables/       # Vue composables (useAuth, useCases, etc.)
  layouts/           # Page layouts (default.vue, auth.vue)
  pages/             # Route pages
  stores/            # Pinia stores
  utils/             # Utility functions

server/
  api/               # API routes (follows file-based routing)
  services/          # Business logic classes
  utils/             # Server utilities

convex/
  schema.ts          # Database schema
  auth.ts            # Authentication mutations/queries
  users.ts           # User management
  settings.ts        # App settings
  tokens.ts          # Dynamics token storage
  _generated/        # Auto-generated Convex types

types/
  index.ts           # Shared TypeScript types
```

## Key Conventions

1. **No `console.log` in production code** - use proper error handling
2. **Always type API responses** - use generics with `$fetch<T>()`
3. **Use reactive state pattern** for shared composables
4. **Server routes must validate auth** using `requireAuth()` or `requireAdmin()`
5. **All tokens encrypted** before storage in Convex
6. **Follow shadcn-vue patterns** for UI components
7. **Use Tailwind utility classes** for styling (no CSS modules)

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

**Important:** Nuxt runtime config requires `NUXT_` prefix for runtime overrides:
- `NUXT_PUBLIC_CONVEX_URL` - Convex API URL (public, exposed to client)
- `NUXT_SESSION_SECRET` - Session secret, min 32 chars (server-only)
- `NUXT_ENCRYPTION_KEY` - Exactly 32 chars for token encryption (server-only)
