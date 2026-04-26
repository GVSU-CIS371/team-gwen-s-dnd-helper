<script setup>
import { reactive, watch } from 'vue';
import { normalizeSpellSlots, ORDERED_SPELL_SLOT_LEVELS } from '../utils/spellSlots';

const props = defineProps({
  character: {
    type: Object,
    default: null,
  },
  formMode: {
    type: String,
    default: 'create',
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['submit', 'cancel']);

const createEmptySpellSlots = () =>
  ORDERED_SPELL_SLOT_LEVELS.reduce((slots, level) => {
    slots[level] = { max: 0, used: 0 };
    return slots;
  }, {});

const defaultForm = () => ({
  name: '',
  characterClass: '',
  level: 1,
  maxHp: 10,
  spellSlots: createEmptySpellSlots(),
});

const form = reactive(defaultForm());

const resetForm = (character) => {
  const normalizedSlots = normalizeSpellSlots(character?.spellSlots);
  const characterMaxHp = Number(character?.health?.maxHp) || 10;
  const nextSpellSlots = createEmptySpellSlots();

  ORDERED_SPELL_SLOT_LEVELS.forEach((level) => {
    nextSpellSlots[level] = {
      max: normalizedSlots[level]?.max ?? 0,
      used: normalizedSlots[level]?.used ?? 0,
    };
  });

  const nextForm = character
    ? {
        name: character.name || '',
        characterClass: character.characterClass || '',
        level: character.level || 1,
        maxHp: characterMaxHp,
        spellSlots: nextSpellSlots,
      }
    : defaultForm();

  form.name = nextForm.name;
  form.characterClass = nextForm.characterClass;
  form.level = nextForm.level;
  form.maxHp = nextForm.maxHp;

  ORDERED_SPELL_SLOT_LEVELS.forEach((level) => {
    form.spellSlots[level].max = nextForm.spellSlots[level].max;
    form.spellSlots[level].used = nextForm.spellSlots[level].used;
  });
};

watch(
  () => props.character,
  (character) => {
    resetForm(character);
  },
  { immediate: true }
);

const submitForm = () => {
  const maxHp = Number(form.maxHp);
  const existingCurrentHp = Number.isFinite(Number(props.character?.health?.currentHp))
    ? Number(props.character?.health?.currentHp)
    : maxHp;
  const existingTempHp = Number.isFinite(Number(props.character?.health?.tempHp))
    ? Number(props.character?.health?.tempHp)
    : 0;
  const existingSpellSlots = normalizeSpellSlots(props.character?.spellSlots);
  const nextSpellSlots = {};

  ORDERED_SPELL_SLOT_LEVELS.forEach((level) => {
    const max = Number(form.spellSlots[level].max) || 0;
    const previousUsed = Number(existingSpellSlots[level]?.used) || 0;

    nextSpellSlots[level] = {
      max,
      used: props.character ? Math.min(previousUsed, max) : 0,
    };
  });

  emit('submit', {
    name: form.name.trim(),
    characterClass: form.characterClass.trim(),
    level: Number(form.level),
    health: props.character
      ? {
          maxHp,
          currentHp: Math.min(existingCurrentHp, maxHp),
          tempHp: existingTempHp,
        }
      : {
          maxHp,
          currentHp: maxHp,
          tempHp: 0,
        },
    spellSlots: nextSpellSlots,
  });
};

const cancelEdit = () => {
  resetForm(null);
  emit('cancel');
};
</script>

<template>
  <section class="card">
    <h2>{{ formMode === 'edit' ? 'Edit Character' : 'Create Character' }}</h2>

    <form class="auth-form" @submit.prevent="submitForm">
      <label for="character-name">Name</label>
      <input
        id="character-name"
        v-model="form.name"
        type="text"
        placeholder="Character name"
        required
      />

      <label for="character-class">Class</label>
      <input
        id="character-class"
        v-model="form.characterClass"
        type="text"
        placeholder="Wizard, Rogue, Cleric..."
        required
      />

      <label for="character-level">Level</label>
      <input
        id="character-level"
        v-model.number="form.level"
        type="number"
        min="1"
        required
      />

      <label for="character-max-hp">Max HP</label>
      <input
        id="character-max-hp"
        v-model.number="form.maxHp"
        type="number"
        min="1"
        required
      />

      <div class="spell-slots-grid">
        <div v-for="level in ORDERED_SPELL_SLOT_LEVELS" :key="level">
          <label :for="`spell-slot-${level}`">Spell Slots Level {{ level }}</label>
          <input
            :id="`spell-slot-${level}`"
            v-model.number="form.spellSlots[level].max"
            type="number"
            min="0"
            required
          />
        </div>
      </div>

      <div class="button-row">
        <button type="submit" :disabled="loading">
          {{ loading ? 'Saving...' : formMode === 'edit' ? 'Update Character' : 'Create Character' }}
        </button>

        <button
          v-if="formMode === 'edit'"
          type="button"
          class="secondary-button"
          @click="cancelEdit"
          :disabled="loading"
        >
          Cancel
        </button>
      </div>
    </form>
  </section>
</template>
