<script setup lang="ts">
defineProps<{
  tone: number
}>()
</script>

<template>
  <svg
    viewBox="0 0 100 100"
    class="overflow-visible"
    fill="none"
    stroke="currentColor"
    stroke-width="8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- 1° Tono: Barra horizontal plana (alto sostenido) -->
    <template v-if="tone === 1">
      <path d="M 16 50 L 84 50" />
    </template>

    <!-- 2° Tono: Flecha diagonal ascendente -->
    <template v-else-if="tone === 2">
      <path d="M 20 76 L 78 22" />
      <path d="M 52 22 L 78 22 L 78 48" />
    </template>

    <!-- 3° Tono: Flecha quebrada que baja y sube -->
    <template v-else-if="tone === 3">
      <path d="M 14 30 L 48 74 L 84 24" />
      <path d="M 60 24 L 84 24 L 84 48" />
    </template>

    <!-- 4° Tono: Flecha diagonal descendente -->
    <template v-else-if="tone === 4">
      <path d="M 20 22 L 78 76" />
      <path d="M 52 76 L 78 76 L 78 50" />
    </template>

    <!-- 5° Tono (Neutro): Punto circular sólido -->
    <template v-else>
      <circle cx="50" cy="50" r="11" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>
