<script setup>
import { reactive, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

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

const signup = async () => {
  state.error = '';
  state.loading = true;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      form.email,
      form.password
    );

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: userCredential.user.email,
      displayName: '',
      createdAt: serverTimestamp(),
    });

    router.push('/');
  } catch (error) {
    state.error = 'Unable to sign up. Please try again.';
    console.error('Signup error:', error);
  } finally {
    state.loading = false;
  }
};
</script>

<template>
  <section class="card auth-card">
    <h2>Signup</h2>

    <form class="auth-form" @submit.prevent="signup">
      <label for="signup-email">Email</label>
      <input
        id="signup-email"
        v-model="form.email"
        type="email"
        placeholder="Enter your email"
        required
      />

      <label for="signup-password">Password</label>
      <input
        id="signup-password"
        v-model="form.password"
        type="password"
        placeholder="Create a password"
        required
      />

      <p v-if="state.error" class="error-message">{{ state.error }}</p>

      <button type="submit" :disabled="state.loading">
        {{ state.loading ? 'Creating account...' : 'Signup' }}
      </button>
    </form>

    <p class="auth-switch">
      Already have an account?
      <RouterLink to="/login">Login here</RouterLink>
    </p>
  </section>
</template>
