<script setup lang="ts">
import { cn } from '~/utils/cn'
</script>

<template>
  <p :class="cn('text-sm text-muted-foreground', $attrs.class as string)">
    <slot />
  </p>
</template>
