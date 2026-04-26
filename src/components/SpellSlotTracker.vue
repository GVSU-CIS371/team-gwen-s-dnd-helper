<script setup>
import { computed, reactive } from 'vue';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getVisibleSpellSlots, normalizeSpellSlots } from '../utils/spellSlots';

const props = defineProps({
  character: {
    type: Object,
    default: null,
  },
});

const state = reactive({
  loadingKey: '',
  resetting: false,
  error: '',
});

const slotEntries = computed(() => getVisibleSpellSlots(props.character?.spellSlots));

const updateSpellSlots = async (nextSpellSlots, loadingKey = '', isReset = false) => {
  state.error = '';
  state.loadingKey = loadingKey;
  state.resetting = isReset;

  try {
    const userId = auth.currentUser?.uid;

    if (!userId || !props.character?.id || props.character.userId !== userId) {
      throw new Error('You can only update your own selected character.');
    }

    await updateDoc(doc(db, 'characters', props.character.id), {
      spellSlots: nextSpellSlots,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    state.error = 'Unable to update spell slots right now.';
    console.error('Spell slot update error:', error);
  } finally {
    state.loadingKey = '';
    state.resetting = false;
  }
};

const useSpellSlot = async (level) => {
  const nextSpellSlots = normalizeSpellSlots(props.character?.spellSlots);
  const currentSlot = nextSpellSlots[level];

  if (!currentSlot || currentSlot.used >= currentSlot.max) {
    return;
  }

  nextSpellSlots[level] = {
    ...currentSlot,
    used: currentSlot.used + 1,
  };

  await updateSpellSlots(nextSpellSlots, `use-${level}`);
};

const restoreSpellSlot = async (level) => {
  const nextSpellSlots = normalizeSpellSlots(props.character?.spellSlots);
  const currentSlot = nextSpellSlots[level];

  if (!currentSlot || currentSlot.used <= 0) {
    return;
  }

  nextSpellSlots[level] = {
    ...currentSlot,
    used: currentSlot.used - 1,
  };

  await updateSpellSlots(nextSpellSlots, `restore-${level}`);
};

const resetSpellSlots = async () => {
  const nextSpellSlots = normalizeSpellSlots(props.character?.spellSlots);

  Object.keys(nextSpellSlots).forEach((level) => {
    nextSpellSlots[level] = {
      ...nextSpellSlots[level],
      used: 0,
    };
  });

  await updateSpellSlots(nextSpellSlots, '', true);
};
</script>

<template>
  <section class="card">
    <h2>{{ character ? `${character.name}'s Spell Slots` : 'Spell Slots' }}</h2>

    <p v-if="state.error" class="error-message">{{ state.error }}</p>
    <p v-if="slotEntries.length === 0">No spell slots set for this character yet.</p>

    <div v-else class="spell-slot-list">
      <article v-for="slot in slotEntries" :key="slot.level" class="spell-slot-item">
        <div class="spell-slot-copy">
          <h3>Level {{ slot.level }}</h3>
          <p>Used {{ slot.used }} / {{ slot.max }}</p>
        </div>

        <div class="button-row">
          <button
            @click="useSpellSlot(slot.level)"
            :disabled="slot.used >= slot.max || state.loadingKey === `use-${slot.level}` || state.resetting"
          >
            {{ state.loadingKey === `use-${slot.level}` ? 'Using...' : 'Use Slot' }}
          </button>
          <button
            class="secondary-button"
            @click="restoreSpellSlot(slot.level)"
            :disabled="slot.used <= 0 || state.loadingKey === `restore-${slot.level}` || state.resetting"
          >
            {{ state.loadingKey === `restore-${slot.level}` ? 'Restoring...' : 'Restore Slot' }}
          </button>
        </div>
      </article>

      <button
        class="danger-button"
        @click="resetSpellSlots"
        :disabled="state.resetting"
      >
        {{ state.resetting ? 'Resetting...' : 'Reset All Used Slots' }}
      </button>
    </div>
  </section>
</template>
