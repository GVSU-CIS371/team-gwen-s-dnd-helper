<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

const user = ref(null);
const authReady = ref(false);
const logoutLoading = ref(false);
const router = useRouter();

let unsubscribe = null;

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser;
    authReady.value = true;
  });
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

const logout = async () => {
  logoutLoading.value = true;

  try {
    await signOut(auth);
    router.push('/login');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    logoutLoading.value = false;
  }
};
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand-lockup">
        <h1>D&amp;D Companion Tracker</h1>
        <p class="app-subtitle">Characters, spells, inventory, and spell slot tracking in one place.</p>
      </div>

      <div class="header-controls">
        <nav class="nav-links">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink v-if="!user" to="/login">Login</RouterLink>
          <RouterLink v-if="!user" to="/signup">Signup</RouterLink>
        </nav>

        <div v-if="user" class="session-panel">
          <p class="session-copy">
            Signed in as:
            <strong>{{ user.email }}</strong>
          </p>
          <button class="secondary-button session-button" @click="logout" :disabled="logoutLoading">
            {{ logoutLoading ? 'Logging out...' : 'Logout' }}
          </button>
        </div>
      </div>
    </header>

    <main v-if="authReady" class="app-main">
      <RouterView v-slot="{ Component }">
        <component :is="Component" :user="user" />
      </RouterView>
    </main>

    <main v-else class="app-main">
      <section class="card loading-card">
        <p>Loading...</p>
      </section>
    </main>
  </div>
</template>
