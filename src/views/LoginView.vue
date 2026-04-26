<script setup>
import { reactive, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
});

const router = useRouter();

const form = reactive({
  email: '',
  password: '',
});

const state = reactive({
  error: '',
  loading: false,
});

watch(
  () => props.user,
  (currentUser) => {
    if (currentUser) {
      router.push('/');
    }
  },
  { immediate: true }
);

const login = async () => {
  state.error = '';
  state.loading = true;

  try {
    await signInWithEmailAndPassword(auth, form.email, form.password);
    router.push('/');
  } catch (error) {
    state.error = 'Unable to log in. Please check your email and password.';
    console.error('Login error:', error);
  } finally {
    state.loading = false;
  }
};
</script>

<template>
  <section class="card auth-card">
    <h2>Login</h2>

    <form class="auth-form" @submit.prevent="login">
      <label for="login-email">Email</label>
      <input
        id="login-email"
        v-model="form.email"
        type="email"
        placeholder="Enter your email"
        required
      />

      <label for="login-password">Password</label>
      <input
        id="login-password"
        v-model="form.password"
        type="password"
        placeholder="Enter your password"
        required
      />

      <p v-if="state.error" class="error-message">{{ state.error }}</p>

      <button type="submit" :disabled="state.loading">
        {{ state.loading ? 'Logging in...' : 'Login' }}
      </button>
    </form>

    <p class="auth-switch">
      Need an account?
      <RouterLink to="/signup">Create one here</RouterLink>
    </p>
  </section>
</template>
