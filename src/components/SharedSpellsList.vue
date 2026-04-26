<script setup>
import { computed, onMounted, onUnmounted, reactive } from 'vue';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const state = reactive({
  spells: [],
  searchTerm: '',
  loading: false,
  error: '',
});

let unsubscribeSpells = null;

const filteredSpells = computed(() => {
  const searchValue = state.searchTerm.trim().toLowerCase();

  if (!searchValue) {
    return state.spells;
  }

  return state.spells.filter((spell) =>
    (spell.name || '').toLowerCase().includes(searchValue)
  );
});

const subscribeToSpells = () => {
  state.loading = true;
  state.error = '';

  unsubscribeSpells = onSnapshot(
    collection(db, 'spells'),
    (snapshot) => {
      const nextSpells = snapshot.docs.map((spellDoc) => ({
        id: spellDoc.id,
        ...spellDoc.data(),
      }));

      nextSpells.sort((firstSpell, secondSpell) =>
        (firstSpell.name || '').localeCompare(secondSpell.name || '')
      );

      state.spells = nextSpells;
      state.loading = false;
    },
    (error) => {
      state.error = 'Unable to load spells right now.';
      state.loading = false;
      console.error('Shared spells error:', error);
    }
  );
};

onMounted(() => {
  subscribeToSpells();
});

onUnmounted(() => {
  if (unsubscribeSpells) {
    unsubscribeSpells();
  }
});
</script>

<template>
  <section class="card">
    <h2>Shared Spells</h2>

    <label for="spell-search">Search by spell name</label>
    <input
      id="spell-search"
      v-model="state.searchTerm"
      class="search-input"
      type="text"
      placeholder="Start typing a spell name"
    />

    <p v-if="state.loading">Loading spells...</p>
    <p v-else-if="state.error" class="error-message">{{ state.error }}</p>
    <p v-else-if="filteredSpells.length === 0">No spells match your search.</p>

    <div v-else class="spell-list-scroll">
      <div class="spell-list">
        <article v-for="spell in filteredSpells" :key="spell.id" class="spell-item">
          <div class="spell-header">
            <h3>{{ spell.name || 'Unnamed Spell' }}</h3>
            <p>Level {{ spell.level ?? 0 }} - {{ spell.school || 'Unknown School' }}</p>
          </div>

          <p class="spell-description">
            {{ spell.description || 'No description available.' }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
