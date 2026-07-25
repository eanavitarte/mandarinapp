<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  isLoading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'primary',
  isLoading: false,
  disabled: false,
  type: 'button'
})

const baseStyle = "px-6 py-2.5 rounded-xl font-bold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
const styles = {
  primary: "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700/50 hover:shadow-indigo-500/10",
  secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:shadow-slate-800/20",
  outline: "bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700 hover:text-white",
  ghost: "bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent"
}
</script>

<template>
  <button 
    :type="type"
    :class="[baseStyle, styles[variant], (isLoading || disabled) ? 'opacity-80 cursor-not-allowed' : '']"
    :disabled="isLoading || disabled"
  >
    <span v-if="isLoading" class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
    <slot />
  </button>
</template>
