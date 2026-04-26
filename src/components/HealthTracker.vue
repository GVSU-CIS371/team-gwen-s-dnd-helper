<script setup>
import { computed, reactive, ref } from 'vue';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const props = defineProps({
  character: {
    type: Object,
    default: null,
  },
});

const state = reactive({
  loading: false,
  error: '',
});

const amount = ref(0);

const toNumberOrFallback = (value, fallback) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const normalizeHealth = (health) => ({
  maxHp: toNumberOrFallback(health?.maxHp, 10),
  currentHp: toNumberOrFallback(health?.currentHp, 10),
  tempHp: toNumberOrFallback(health?.tempHp, 0),
});

const health = computed(() => normalizeHealth(props.character?.health));

const updateHealth = async (nextHealth) => {
  state.error = '';
  state.loading = true;

  try {
    const userId = auth.currentUser?.uid;

    if (!userId || !props.character?.id || props.character.userId !== userId) {
      throw new Error('You can only update your own selected character.');
    }

    await updateDoc(doc(db, 'characters', props.character.id), {
      health: nextHealth,
      updatedAt: serverTimestamp(),
    });

    amount.value = 0;
  } catch (error) {
    state.error = 'Unable to update health right now.';
    console.error('Health update error:', error);
  } finally {
    state.loading = false;
  }
};

const applyDamage = async () => {
  const damageAmount = Number(amount.value);

  if (damageAmount <= 0) {
    return;
  }

  const nextHealth = { ...health.value };
  const remainingDamage = Math.max(damageAmount - nextHealth.tempHp, 0);

  nextHealth.tempHp = Math.max(nextHealth.tempHp - damageAmount, 0);
  nextHealth.currentHp = nextHealth.currentHp - remainingDamage;

  await updateHealth(nextHealth);
};

const applyHeal = async () => {
  const healAmount = Number(amount.value);

  if (healAmount <= 0) {
    return;
  }

  const nextHealth = {
    ...health.value,
    currentHp: Math.min(Math.max(health.value.currentHp, 0) + healAmount, health.value.maxHp),
  };

  await updateHealth(nextHealth);
};

const applyTempHp = async () => {
  const tempAmount = Number(amount.value);

  if (tempAmount <= health.value.tempHp) {
    return;
  }

  const nextHealth = {
    ...health.value,
    tempHp: tempAmount,
  };

  await updateHealth(nextHealth);
};
</script>

<template>
  <section class="card">
    <h2>{{ character ? `${character.name}'s Health` : 'Health' }}</h2>

    <p v-if="state.error" class="error-message">{{ state.error }}</p>

    <div class="health-summary">
      <article class="health-stat">
        <span class="health-label">Temp HP</span>
        <strong>{{ health.tempHp }}</strong>
      </article>

      <article class="health-stat">
        <span class="health-label">Current HP</span>
        <strong>{{ health.currentHp }}</strong>
      </article>

      <article class="health-stat">
        <span class="health-label">Max HP</span>
        <strong>{{ health.maxHp }}</strong>
      </article>
    </div>

    <label for="health-amount">Amount</label>
    <input
      id="health-amount"
      v-model.number="amount"
      class="search-input"
      type="number"
      min="0"
    />

    <div class="button-row">
      <button class="danger-button" @click="applyDamage" :disabled="state.loading">
        {{ state.loading ? 'Saving...' : 'Damage' }}
      </button>
      <button class="heath-button" @click="applyHeal" :disabled="state.loading">
        {{ state.loading ? 'Saving...' : 'Heal' }}
      </button>
      <button class="tempHP-button" @click="applyTempHp" :disabled="state.loading">
        {{ state.loading ? 'Saving...' : 'Temp HP' }}
      </button>
    </div>
  </section>
</template>
