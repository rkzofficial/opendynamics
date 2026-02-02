<script setup lang="ts">
// Inject early script to capture beforeinstallprompt before any other code runs
useHead({
  script: [
    {
      innerHTML: `
        window.addEventListener('beforeinstallprompt', function(e) {
          e.preventDefault();
          window.__pwaInstallPrompt = e;
          window.__pwaInstallReady = true;
        });
      `,
      tagPosition: 'head',
    },
  ],
})
</script>

<template>
  <NuxtPwaAssets />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- Global PWA Install Prompt -->
  <ClientOnly>
    <div class="fixed bottom-4 right-4 z-50 max-w-sm">
      <PWAInstallPrompt />
    </div>
  </ClientOnly>
</template>
