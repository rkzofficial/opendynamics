# PWA Setup Guide for OpenDynamics

This document describes the Progressive Web App (PWA) setup for OpenDynamics.

## Features

- **Installable**: Users can install the app on desktop/mobile home screens
- **Offline Support**: Service worker caches assets for offline functionality
- **Push Notifications**: Browser notification support for real-time updates
- **Background Sync**: Queue actions when offline and sync when back online
- **Auto Updates**: Automatic service worker updates

## File Structure

```
app/
├── components/
│   └── PWA/
│       ├── NotificationPrompt.vue    # Notification permission UI
│       ├── PWAInstallPrompt.vue      # Install prompt UI
│       └── PWAStatus.vue             # Online/offline status indicator
├── composables/
│   └── useNotifications.ts           # Notification & push notification composable
public/
├── icon-*.png                        # PWA icons (generated)
├── favicon.ico                       # Browser favicon
└── apple-touch-icon.png              # iOS home screen icon
```

## Configuration

The PWA is configured in `nuxt.config.ts` under the `pwa` key:

- **Manifest**: App metadata (name, icons, theme colors, shortcuts)
- **Workbox**: Caching strategies for offline support
- **Runtime Caching**: API, images, and fonts caching rules

## Icons Setup

### Option 1: Generate from Source Image (Recommended)

1. Add a source image (e.g., `assets/logo.png`, min 512x512)
2. Install sharp: `bun add -d sharp`
3. Run the generator:
   ```bash
   node scripts/generate-pwa-icons.js ./app/assets/logo.png
   ```

### Option 2: Manual Setup

Create icons manually and place them in `public/`:
- `icon-72x72.png` through `icon-512x512.png`
- `favicon.ico` (32x32)
- `apple-touch-icon.png` (180x180)

## Usage

### Notification Prompt

```vue
<template>
  <!-- Card variant -->
  <NotificationPrompt @granted="onGranted" @denied="onDenied" />
  
  <!-- Inline variant -->
  <NotificationPrompt variant="inline" />
  
  <!-- Banner variant -->
  <NotificationPrompt variant="banner" />
</template>
```

### Install Prompt

```vue
<template>
  <PWAInstallPrompt />
</template>
```

### Status Indicator

```vue
<template>
  <PWAStatus />
</template>
```

### Notification Composable

```typescript
const {
  isSupported,
  permission,
  canNotify,
  requestPermission,
  showNotification,
  subscribeToPush,
  unsubscribeFromPush,
} = useNotifications()

// Request permission
await requestPermission()

// Show notification
await showNotification({
  title: 'New Case Assigned',
  body: 'You have been assigned a new support case.',
  tag: 'case-assigned',
})

// Subscribe to push notifications
const subscription = await subscribeToPush(vapidPublicKey)
// Send subscription to your server
await $fetch('/api/push/subscribe', {
  method: 'POST',
  body: subscription,
})
```

## Push Notifications (Server-Side)

To send push notifications, you need:

1. **VAPID Keys**: Generate with `npx web-push generate-vapid-keys`
2. **Store Keys**: Add to environment variables
3. **API Endpoint**: Create server endpoint to receive subscriptions

### Environment Variables

```bash
# .env.local
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@example.com
```

### Example Server API

```typescript
// server/api/push/send.post.ts
import { sendNotification } from 'web-push'

export default defineEventHandler(async (event) => {
  const { subscription, payload } = await readBody(event)
  
  const options = {
    vapidDetails: {
      subject: process.env.VAPID_SUBJECT!,
      publicKey: process.env.VAPID_PUBLIC_KEY!,
      privateKey: process.env.VAPID_PRIVATE_KEY!,
    },
  }
  
  await sendNotification(subscription, JSON.stringify(payload), options)
  return { success: true }
})
```

## Testing

### Development

1. Start dev server: `bun run dev`
2. Open Chrome DevTools > Application tab
3. Check:
   - **Manifest**: Verify all fields and icons
     - **Service Workers**: Check registration and status
   - **Push**: Test push notifications
   - **Storage**: View cached resources

### Production Build

```bash
bun run build
bun run preview
```

Test install prompt and offline functionality.

### Lighthouse Audit

Run Lighthouse in Chrome DevTools for PWA compliance scoring.

## Troubleshooting

### Service Worker Not Registering

- Check DevTools > Application > Service Workers
- Ensure HTTPS or localhost (required for SW)
- Clear cache and reload

### Notifications Not Working

- Check permission in DevTools > Application > Notifications
- Ensure user interaction before requesting permission
- Verify service worker is registered

### Icons Not Showing

- Verify icons exist in `public/` folder
- Check paths in manifest match actual file names
- Test icon URLs directly in browser

### Offline Not Working

- Check Workbox configuration in nuxt.config.ts
- Verify runtimeCaching patterns match your API
- Check DevTools > Application > Cache Storage

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Partial (no push notifications on iOS)
- **iOS Safari**: Installable, limited background sync

## References

- [Nuxt PWA Module](https://vite-pwa-org.netlify.app/frameworks/nuxt.html)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
