<script setup lang="ts">
import { ref } from 'vue'
import Button from './Button.vue'

const props = defineProps<{
  isSyncing: boolean
}>()

const emit = defineEmits<{
  (e: 'sync'): void
  (e: 'cancel'): void
}>()

const syncFeedback = ref<string | null>(null)

const handleManualSync = () => {
  syncFeedback.value = null
  emit('sync')
  setTimeout(() => {
      syncFeedback.value = "Sync request sent! Check your Firebase database."
  }, 1500)
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
    <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl text-slate-900 overflow-y-auto max-h-[90vh]">
      <div class="flex items-center gap-2 mb-4">
           <span class="text-2xl">☁️</span>
           <h2 class="text-2xl font-bold">Cloud Sync</h2>
      </div>
      <div class="space-y-6">
        <div class="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
            <p class="text-slate-700 mb-4 font-medium">Your progress is linked to Firebase Firestore.</p>
            <Button variant="primary" @click="handleManualSync" :isLoading="isSyncing" class="w-full py-3 text-lg shadow-lg">
               {{ isSyncing ? "Syncing..." : "Sync Session Data" }}
            </Button>
            <p v-if="syncFeedback" class="text-xs text-orange-600 mt-2 font-bold animate-fade-in">{{ syncFeedback }}</p>
            <p v-else class="text-xs text-slate-500 mt-2">Update the cloud database with your current session progress.</p>
        </div>
        <div>
          <div class="mt-3 p-4 bg-orange-50/40 rounded-lg border border-orange-100 text-sm">
              <p class="mb-2 font-bold text-slate-700">Firebase Configuration</p>
              <p class="text-slate-600 mb-4 font-sans">
                  Ensure your <code>.env.local</code> file is populated with the correct Firebase credentials for the database connection to work:
              </p>
              <ul class="list-disc list-inside space-y-1 mb-4 text-slate-500 font-mono text-xs">
                  <li>VITE_FIREBASE_API_KEY</li>
                  <li>VITE_FIREBASE_AUTH_DOMAIN</li>
                  <li>VITE_FIREBASE_PROJECT_ID</li>
                  <li>VITE_FIREBASE_STORAGE_BUCKET</li>
                  <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
                  <li>VITE_FIREBASE_APP_ID</li>
              </ul>
          </div>
          <div class="flex justify-end pt-6">
              <Button variant="ghost" type="button" @click="emit('cancel')">Close</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
