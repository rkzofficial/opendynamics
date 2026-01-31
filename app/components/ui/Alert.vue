<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/utils/cn'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success:
          'border-emerald-500/50 text-emerald-700 dark:text-emerald-400 [&>svg]:text-emerald-500',
        warning:
          'border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

type AlertVariants = VariantProps<typeof alertVariants>

interface Props {
  variant?: AlertVariants['variant']
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <div :class="cn(alertVariants({ variant }), $attrs.class as string)">
    <slot />
  </div>
</template>
