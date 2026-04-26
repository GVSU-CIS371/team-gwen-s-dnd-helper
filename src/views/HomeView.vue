<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import CharacterForm from '../components/CharacterForm.vue';
import HealthTracker from '../components/HealthTracker.vue';
import InventoryManager from '../components/InventoryManager.vue';
import SpellSlotTracker from '../components/SpellSlotTracker.vue';
import SharedSpellsList from '../components/SharedSpellsList.vue';
import { auth, db } from '../firebase';
import {
  getVisibleSpellSlots,
  normalizeSpellSlots,
  ORDERED_SPELL_SLOT_LEVELS,
} from '../utils/spellSlots';

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
});

const state = reactive({
  error: '',
  charactersLoading: false,
  saveLoading: false,
  deleteLoadingId: '',
});

const characters = reactive([]);
const selectedCharacterId = ref('');
const isCreateFormVisible = ref(false);

const createEmptySpellSlots = () =>
  ORDERED_SPELL_SLOT_LEVELS.reduce((slots, level) => {
    slots[level] = { max: 0, used: 0 };
    return slots;
  }, {});

const editingCharacter = reactive({
  id: '',
  name: '',
  characterClass: '',
  level: 1,
  health: {
    maxHp: 10,
    currentHp: 10,
    tempHp: 0,
  },
  spellSlots: createEmptySpellSlots(),
});
const isEditing = computed(() => Boolean(editingCharacter.id));
const selectedCharacter = computed(
  () => characters.find((character) => character.id === selectedCharacterId.value) || null
);
const showCharacterForm = computed(() => isEditing.value || isCreateFormVisible.value);
const formatCharacterSpellSlots = (spellSlots) => {
  const visibleSpellSlots = getVisibleSpellSlots(spellSlots).slice(0, 3);

  if (visibleSpellSlots.length === 0) {
    return 'No spell slots set';
  }

  return visibleSpellSlots
    .map((slot) => `L${slot.level} ${slot.used}/${slot.max}`)
    .join(', ');
};

let unsubscribeCharacters = null;

const clearEditingCharacter = () => {
  editingCharacter.id = '';
  editingCharacter.name = '';
  editingCharacter.characterClass = '';
  editingCharacter.level = 1;
  editingCharacter.health.maxHp = 10;
  editingCharacter.health.currentHp = 10;
  editingCharacter.health.tempHp = 0;

  ORDERED_SPELL_SLOT_LEVELS.forEach((level) => {
    editingCharacter.spellSlots[level].max = 0;
    editingCharacter.spellSlots[level].used = 0;
  });
};

const openCreateCharacterForm = () => {
  clearEditingCharacter();
  selectedCharacterId.value = '';
  isCreateFormVisible.value = true;
};

const subscribeToCharacters = (userId) => {
  if (unsubscribeCharacters) {
    unsubscribeCharacters();
  }

  state.error = '';
  state.charactersLoading = true;

  const charactersQuery = query(
    collection(db, 'characters'),
    where('userId', '==', userId)
  );

  unsubscribeCharacters = onSnapshot(
    charactersQuery,
    (snapshot) => {
      const nextCharacters = snapshot.docs.map((characterDoc) => ({
        id: characterDoc.id,
        ...characterDoc.data(),
      }));

      nextCharacters.sort((firstCharacter, secondCharacter) =>
        firstCharacter.name.localeCompare(secondCharacter.name)
      );

      characters.splice(0, characters.length, ...nextCharacters);
      if (
        selectedCharacterId.value &&
        !nextCharacters.some((character) => character.id === selectedCharacterId.value)
      ) {
        selectedCharacterId.value = '';
      }
      state.charactersLoading = false;
    },
    (error) => {
      state.error = 'Unable to load characters right now.';
      state.charactersLoading = false;
      console.error('Character list error:', error);
    }
  );
};

watch(
  () => props.user,
  (currentUser) => {
    characters.splice(0, characters.length);
    clearEditingCharacter();
    selectedCharacterId.value = '';
    isCreateFormVisible.value = false;

    if (!currentUser) {
      if (unsubscribeCharacters) {
        unsubscribeCharacters();
        unsubscribeCharacters = null;
      }

      return;
    }

    subscribeToCharacters(currentUser.uid);
  },
  { immediate: true }
);

onUnmounted(() => {
  if (unsubscribeCharacters) {
    unsubscribeCharacters();
  }
});

const saveCharacter = async (formData) => {
  state.error = '';
  state.saveLoading = true;

  try {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      throw new Error('No logged in user found.');
    }

    const characterData = {
      userId,
      name: formData.name,
      characterClass: formData.characterClass,
      level: formData.level,
      health: formData.health,
      spellSlots: formData.spellSlots,
      updatedAt: serverTimestamp(),
    };

    if (editingCharacter.id) {
      await updateDoc(doc(db, 'characters', editingCharacter.id), characterData);
      clearEditingCharacter();
    } else {
      await addDoc(collection(db, 'characters'), {
        ...characterData,
        createdAt: serverTimestamp(),
      });
    }

    isCreateFormVisible.value = false;
  } catch (error) {
    state.error = 'Unable to save character. Please try again.';
    console.error('Save character error:', error);
  } finally {
    state.saveLoading = false;
  }
};

const startEdit = (character) => {
  selectedCharacterId.value = '';
  isCreateFormVisible.value = false;
  editingCharacter.id = character.id;
  editingCharacter.name = character.name;
  editingCharacter.characterClass = character.characterClass;
  editingCharacter.level = character.level;
  editingCharacter.health.maxHp = Number.isFinite(Number(character.health?.maxHp))
    ? Number(character.health?.maxHp)
    : 10;
  editingCharacter.health.currentHp = Number.isFinite(Number(character.health?.currentHp))
    ? Number(character.health?.currentHp)
    : editingCharacter.health.maxHp;
  editingCharacter.health.tempHp = Number.isFinite(Number(character.health?.tempHp))
    ? Number(character.health?.tempHp)
    : 0;
  const normalizedSlots = normalizeSpellSlots(character.spellSlots);

  ORDERED_SPELL_SLOT_LEVELS.forEach((level) => {
    editingCharacter.spellSlots[level].max = normalizedSlots[level]?.max ?? 0;
    editingCharacter.spellSlots[level].used = normalizedSlots[level]?.used ?? 0;
  });

  state.error = '';
};

const cancelEdit = () => {
  clearEditingCharacter();
  isCreateFormVisible.value = false;
};

const selectCharacter = (characterId) => {
  clearEditingCharacter();
  isCreateFormVisible.value = false;
  selectedCharacterId.value = characterId;
};

const clearSelection = () => {
  selectedCharacterId.value = '';
};

const deleteCharacter = async (characterId) => {
  state.error = '';
  state.deleteLoadingId = characterId;

  try {
    await deleteDoc(doc(db, 'characters', characterId));

    if (editingCharacter.id === characterId) {
      clearEditingCharacter();
    }

    if (selectedCharacterId.value === characterId) {
      selectedCharacterId.value = '';
    }
  } catch (error) {
    state.error = 'Unable to delete character. Please try again.';
    console.error('Delete character error:', error);
  } finally {
    state.deleteLoadingId = '';
  }
};
</script>

<template>
  <section class="home-page">
    <template v-if="user">
      <p v-if="state.error" class="error-message global-error">{{ state.error }}</p>

      <div
        class="workspace-grid"
        :class="{ 'workspace-grid--selected': Boolean(selectedCharacter) }"
      >
        <div v-if="!selectedCharacter" class="workspace-stack">
          <section class="card section-card">
            <div class="section-heading">
              <div>
                <p class="section-eyebrow">Character Roster</p>
                <h2>Your Characters</h2>
              </div>
              <div class="section-actions">
                <p class="section-note">Choose one to edit, track slots, or manage inventory.</p>
                <button
                  v-if="!showCharacterForm"
                  @click="openCreateCharacterForm"
                >
                  Create New Character
                </button>
              </div>
            </div>

            <section v-if="showCharacterForm" class="form-panel">
              <div class="form-panel-header">
                <div>
                  <p class="section-eyebrow">{{ isEditing ? 'Edit Character' : 'New Character' }}</p>
                  <h3>{{ isEditing ? 'Update Character' : 'Create a Character' }}</h3>
                </div>
                <button
                  class="secondary-button form-close-button"
                  type="button"
                  @click="cancelEdit"
                  :disabled="state.saveLoading"
                >
                  {{ isEditing ? 'Cancel Edit' : 'Close Form' }}
                </button>
              </div>

              <CharacterForm
                :character="isEditing ? editingCharacter : null"
                :form-mode="isEditing ? 'edit' : 'create'"
                :loading="state.saveLoading"
                @submit="saveCharacter"
                @cancel="cancelEdit"
              />
            </section>

            <p v-if="state.charactersLoading">Loading characters...</p>
            <p v-else-if="characters.length === 0">No characters yet. Create your first one above.</p>

            <div v-else class="character-list">
              <article
                v-for="character in characters"
                :key="character.id"
                class="character-item"
              >
                <div class="character-copy">
                  <div class="character-title-row">
                    <h3>{{ character.name }}</h3>
                  </div>
                  <p>{{ character.characterClass }} - Level {{ character.level }}</p>
                </div>

                <div class="button-row item-actions">
                  <button @click="startEdit(character)">Edit</button>
                  <button
                    class="secondary-button"
                    @click="selectCharacter(character.id)"
                  >
                    Open Character
                  </button>
                  <button
                    class="danger-button"
                    @click="deleteCharacter(character.id)"
                    :disabled="state.deleteLoadingId === character.id"
                  >
                    {{ state.deleteLoadingId === character.id ? 'Deleting...' : 'Delete' }}
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>

        <div class="workspace-stack">
          <section v-if="selectedCharacter" class="selected-panel">
            <div class="card selected-summary">
              <p class="section-eyebrow">Selected Character</p>
              <h2>{{ selectedCharacter.name }}</h2>
              <p>{{ selectedCharacter.characterClass }}</p>
              <div class="button-row">
                <button class="secondary-button" @click="clearSelection">Back to Characters</button>
              </div>
            </div>

            <div class="selected-workspace">
              <div class="selected-left-column">
                <SpellSlotTracker :user="user" :character="selectedCharacter" />
                <SharedSpellsList />
              </div>

              <div class="selected-right-column">
                <HealthTracker :character="selectedCharacter" />
                <InventoryManager :user="user" :character="selectedCharacter" />
              </div>
            </div>
          </section>

          <section v-else class="card empty-state-card">
            <p class="section-eyebrow">Character Tools</p>
            <h2>Select a character</h2>
            <p>Choose a character from your roster to view spell slots and inventory.</p>
          </section>
        </div>
      </div>
    </template>

    <template v-else>
      <section class="card auth-landing">
        <p class="section-eyebrow">Welcome</p>
        <h2>Sign in to manage your campaign notes.</h2>
        <p>
          Log in or create an account to work with characters, inventory, spell slots,
          and the shared spell reference.
        </p>
        <div class="button-row">
          <RouterLink class="button-link" to="/login">Login</RouterLink>
          <RouterLink class="button-link secondary-link" to="/signup">Signup</RouterLink>
        </div>
      </section>
    </template>
  </section>
</template>
