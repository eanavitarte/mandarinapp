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

const baseStyle = "px-6 py-2.5 rounded-xl font-bold transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
const styles = {
  primary: "bg-orange-500 hover:bg-orange-600 text-white border border-orange-500",
  secondary: "bg-white hover:bg-orange-50 text-slate-800 hover:text-orange-600 border border-slate-200 hover:border-orange-300",
  outline: "bg-white hover:bg-orange-50 text-orange-600 border border-orange-400 hover:border-orange-500",
  ghost: "bg-transparent hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-transparent"
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
