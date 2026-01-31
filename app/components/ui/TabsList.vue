<script setup lang="ts">
import { cn } from '~/utils/cn'
</script>

<template>
  <div
    :class="cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      $attrs.class as string
    )"
  >
    <slot />
  </div>
</template>
