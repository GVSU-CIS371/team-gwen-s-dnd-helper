<script setup>
import { computed, onUnmounted, reactive, watch } from 'vue';
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
import InventoryForm from './InventoryForm.vue';
import { auth, db } from '../firebase';

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
  character: {
    type: Object,
    default: null,
  },
});

const state = reactive({
  items: [],
  loading: false,
  saveLoading: false,
  deleteLoadingId: '',
  error: '',
});

const editingItem = reactive({
  id: '',
  name: '',
  quantity: 1,
  type: '',
  description: '',
});

const isEditing = computed(() => Boolean(editingItem.id));

let unsubscribeInventory = null;

const clearEditingItem = () => {
  editingItem.id = '';
  editingItem.name = '';
  editingItem.quantity = 1;
  editingItem.type = '';
  editingItem.description = '';
};

const subscribeToInventory = (userId, characterId) => {
  if (unsubscribeInventory) {
    unsubscribeInventory();
  }

  state.error = '';
  state.loading = true;

  const inventoryQuery = query(
    collection(db, 'inventory'),
    where('userId', '==', userId),
    where('characterId', '==', characterId)
  );

  unsubscribeInventory = onSnapshot(
    inventoryQuery,
    (snapshot) => {
      const nextItems = snapshot.docs.map((itemDoc) => ({
        id: itemDoc.id,
        ...itemDoc.data(),
      }));

      nextItems.sort((firstItem, secondItem) =>
        (firstItem.name || '').localeCompare(secondItem.name || '')
      );

      state.items = nextItems;
      state.loading = false;
    },
    (error) => {
      state.error = 'Unable to load inventory right now.';
      state.loading = false;
      console.error('Inventory list error:', error);
    }
  );
};

watch(
  () => [props.user?.uid, props.character?.id],
  ([userId, characterId]) => {
    state.items = [];
    clearEditingItem();

    if (!userId || !characterId) {
      if (unsubscribeInventory) {
        unsubscribeInventory();
        unsubscribeInventory = null;
      }

      return;
    }

    subscribeToInventory(userId, characterId);
  },
  { immediate: true }
);

onUnmounted(() => {
  if (unsubscribeInventory) {
    unsubscribeInventory();
  }
});

const saveItem = async (formData) => {
  state.error = '';
  state.saveLoading = true;

  try {
    const userId = auth.currentUser?.uid;
    const characterId = props.character?.id;

    if (!userId || !characterId) {
      throw new Error('Missing user or character.');
    }

    const itemData = {
      userId,
      characterId,
      name: formData.name,
      quantity: formData.quantity,
      type: formData.type,
      description: formData.description,
      updatedAt: serverTimestamp(),
    };

    if (editingItem.id) {
      await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
      clearEditingItem();
    } else {
      await addDoc(collection(db, 'inventory'), {
        ...itemData,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    state.error = 'Unable to save inventory item. Please try again.';
    console.error('Save inventory error:', error);
  } finally {
    state.saveLoading = false;
  }
};

const startEdit = (item) => {
  editingItem.id = item.id;
  editingItem.name = item.name;
  editingItem.quantity = item.quantity;
  editingItem.type = item.type;
  editingItem.description = item.description;
  state.error = '';
};

const cancelEdit = () => {
  clearEditingItem();
};

const deleteItem = async (itemId) => {
  state.error = '';
  state.deleteLoadingId = itemId;

  try {
    await deleteDoc(doc(db, 'inventory', itemId));

    if (editingItem.id === itemId) {
      clearEditingItem();
    }
  } catch (error) {
    state.error = 'Unable to delete inventory item. Please try again.';
    console.error('Delete inventory error:', error);
  } finally {
    state.deleteLoadingId = '';
  }
};
</script>

<template>
  <section class="inventory-layout">
    <section class="card">
      <h2>{{ character ? `${character.name}'s Inventory` : 'Character Inventory' }}</h2>

      <p v-if="state.error" class="error-message">{{ state.error }}</p>
      <p v-if="state.loading">Loading inventory...</p>
      <p v-else-if="state.items.length === 0">No inventory items yet for this character.</p>

      <div v-else class="inventory-list">
        <article v-for="item in state.items" :key="item.id" class="inventory-item">
          <div class="inventory-copy">
            <h3>{{ item.name }}</h3>
            <p>{{ item.type }} - Quantity {{ item.quantity }}</p>
            <p>{{ item.description }}</p>
          </div>

          <div class="button-row">
            <button @click="startEdit(item)">Edit</button>
            <button
              class="secondary-button"
              @click="deleteItem(item.id)"
              :disabled="state.deleteLoadingId === item.id"
            >
              {{ state.deleteLoadingId === item.id ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <InventoryForm
      :item="isEditing ? editingItem : null"
      :form-mode="isEditing ? 'edit' : 'create'"
      :loading="state.saveLoading"
      @submit="saveItem"
      @cancel="cancelEdit"
    />
  </section>
</template>
