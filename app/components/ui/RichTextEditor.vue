<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Link2, SquareCode } from 'lucide-vue-next'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Write a message...',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  extensions: [
    StarterKit,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
  ],
  content: props.modelValue || '',
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: 'prose prose-sm dark:prose-invert max-w-none min-h-[10rem] focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(() => props.modelValue, (nextValue) => {
  const instance = editor.value
  if (!instance) return

  const normalizedValue = nextValue || ''
  if (instance.getHTML() === normalizedValue) return

  instance.commands.setContent(normalizedValue, { emitUpdate: false })
})

watch(() => props.disabled, (isDisabled) => {
  editor.value?.setEditable(!isDisabled)
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function toggleLink() {
  const instance = editor.value
  if (!instance || props.disabled) return

  const previousUrl = (instance.getAttributes('link').href as string | undefined) || 'https://'
  const url = window.prompt('Enter URL', previousUrl)
  if (url === null) return

  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    instance.chain().focus().unsetLink().run()
    return
  }

  const href = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`
  instance
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href })
    .run()
}
</script>

<template>
  <div class="rounded-md border bg-background">
    <div class="flex flex-wrap items-center gap-1 border-b p-2">
      <UiButton
        type="button"
        size="icon"
        variant="ghost"
        class="h-8 w-8"
        :disabled="disabled || !editor?.can().chain().focus().toggleBold().run()"
        :class="{ 'bg-muted text-foreground': editor?.isActive('bold') }"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Bold class="h-4 w-4" />
      </UiButton>

      <UiButton
        type="button"
        size="icon"
        variant="ghost"
        class="h-8 w-8"
        :disabled="disabled || !editor?.can().chain().focus().toggleItalic().run()"
        :class="{ 'bg-muted text-foreground': editor?.isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Italic class="h-4 w-4" />
      </UiButton>

      <UiButton
        type="button"
        size="icon"
        variant="ghost"
        class="h-8 w-8"
        :disabled="disabled || !editor?.can().chain().focus().toggleBulletList().run()"
        :class="{ 'bg-muted text-foreground': editor?.isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List class="h-4 w-4" />
      </UiButton>

      <UiButton
        type="button"
        size="icon"
        variant="ghost"
        class="h-8 w-8"
        :disabled="disabled || !editor?.can().chain().focus().toggleOrderedList().run()"
        :class="{ 'bg-muted text-foreground': editor?.isActive('orderedList') }"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered class="h-4 w-4" />
      </UiButton>

      <UiButton
        type="button"
        size="icon"
        variant="ghost"
        class="h-8 w-8"
        :disabled="disabled"
        :class="{ 'bg-muted text-foreground': editor?.isActive('link') }"
        @click="toggleLink"
      >
        <Link2 class="h-4 w-4" />
      </UiButton>

      <UiButton
        type="button"
        size="icon"
        variant="ghost"
        class="h-8 w-8"
        :disabled="disabled || !editor?.can().chain().focus().toggleCodeBlock().run()"
        :class="{ 'bg-muted text-foreground': editor?.isActive('codeBlock') }"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        <SquareCode class="h-4 w-4" />
      </UiButton>
    </div>

    <EditorContent :editor="editor" class="px-3 py-2" />
  </div>
</template>

<style scoped>
:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: hsl(var(--muted-foreground));
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.ProseMirror pre) {
  background-color: hsl(var(--muted));
  border-radius: 0.375rem;
  padding: 0.75rem;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1rem;
}
</style>
