<template>
  <!-- ── Install Banner ── -->
  <Transition name="pwa-slide">
    <div v-if="showInstall" class="pwa-banner pwa-install">
      <div class="pwa-banner-icon">📲</div>
      <div class="pwa-banner-text">
        <strong>Install App</strong>
        <span>Add to your home screen for offline access</span>
      </div>
      <div class="pwa-banner-actions">
        <button class="pwa-btn pwa-btn-primary" @click="installApp">Install</button>
        <button class="pwa-btn pwa-btn-ghost" @click="showInstall = false">Later</button>
      </div>
    </div>
  </Transition>

  <!-- ── Update Banner ── -->
  <Transition name="pwa-slide">
    <div v-if="showUpdate" class="pwa-banner pwa-update">
      <div class="pwa-banner-icon">🔄</div>
      <div class="pwa-banner-text">
        <strong>Update Available</strong>
        <span>A new version of the app is ready</span>
      </div>
      <div class="pwa-banner-actions">
        <button class="pwa-btn pwa-btn-primary" @click="updateApp">Update Now</button>
        <button class="pwa-btn pwa-btn-ghost" @click="showUpdate = false">Dismiss</button>
      </div>
    </div>
  </Transition>

  <!-- ── Offline Indicator ── -->
  <Transition name="pwa-slide">
    <div v-if="isOffline" class="pwa-offline">
      <span>📡 You're offline — data is saved locally</span>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const showInstall = ref(false)
const showUpdate  = ref(false)
const isOffline   = ref(!navigator.onLine)

let deferredPrompt = null
let registration   = null

// ── Install prompt ──
function handleBeforeInstallPrompt(e) {
  e.preventDefault()
  deferredPrompt = e
  // Only show if not already installed
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    showInstall.value = true
  }
}

async function installApp() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') showInstall.value = false
  deferredPrompt = null
}

// ── SW Update ──
function updateApp() {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  showUpdate.value = false
  window.location.reload()
}

// ── Online / offline ──
function handleOnline()  { isOffline.value = false }
function handleOffline() { isOffline.value = true  }

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('online',  handleOnline)
  window.addEventListener('offline', handleOffline)

  // Listen for SW update events dispatched from App.vue
  window.addEventListener('sw-update-available', (e) => {
    registration = e.detail
    showUpdate.value = true
  })
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('online',  handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<style scoped>
.pwa-banner {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: min(480px, calc(100vw - 32px));
  background: #ffffff;
  border-radius: 18px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
  z-index: 9999;
  border: 1.5px solid var(--border);
}

.pwa-install { border-color: rgba(138,106,74,0.4); }
.pwa-update  { border-color: rgba(58,122,50,0.4); }

.pwa-banner-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.pwa-banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pwa-banner-text strong {
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #000;
}

.pwa-banner-text span {
  font-family: 'Nunito', sans-serif;
  font-size: 12px;
  color: var(--muted);
}

.pwa-banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.pwa-btn {
  padding: 7px 16px;
  border-radius: 20px;
  border: none;
  font-family: 'Nunito', sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.18s;
}

.pwa-btn-primary {
  background: linear-gradient(135deg, #a07850, #8a6a4a);
  color: #fff;
}
.pwa-btn-primary:hover { opacity: 0.9; }

.pwa-btn-ghost {
  background: var(--surface2);
  color: var(--muted);
  border: 1px solid var(--border);
}
.pwa-btn-ghost:hover { color: #000; }

/* Offline pill */
.pwa-offline {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 16px;
  border-radius: 20px;
  z-index: 9999;
  white-space: nowrap;
}

/* Transitions */
.pwa-slide-enter-active,
.pwa-slide-leave-active {
  transition: all 0.3s ease;
}
.pwa-slide-enter-from,
.pwa-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
