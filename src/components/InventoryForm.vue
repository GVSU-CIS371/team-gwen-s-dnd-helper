<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  item: {
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

const defaultForm = () => ({
  name: '',
  quantity: 1,
  type: '',
  description: '',
});

const form = reactive(defaultForm());

const resetForm = (item) => {
  const nextForm = item
    ? {
        name: item.name || '',
        quantity: item.quantity || 1,
        type: item.type || '',
        description: item.description || '',
      }
    : defaultForm();

  form.name = nextForm.name;
  form.quantity = nextForm.quantity;
  form.type = nextForm.type;
  form.description = nextForm.description;
};

watch(
  () => props.item,
  (item) => {
    resetForm(item);
  },
  { immediate: true }
);

const submitForm = () => {
  emit('submit', {
    name: form.name.trim(),
    quantity: Number(form.quantity),
    type: form.type.trim(),
    description: form.description.trim(),
  });
};

const cancelEdit = () => {
  resetForm(null);
  emit('cancel');
};
</script>

<template>
  <section class="card">
    <h2>{{ formMode === 'edit' ? 'Edit Item' : 'Add Item' }}</h2>

    <form class="auth-form" @submit.prevent="submitForm">
      <label for="item-name">Name</label>
      <input
        id="item-name"
        v-model="form.name"
        type="text"
        placeholder="Health Potion"
        required
      />

      <label for="item-quantity">Quantity</label>
      <input
        id="item-quantity"
        v-model.number="form.quantity"
        type="number"
        min="1"
        required
      />

      <label for="item-type">Type</label>
      <input
        id="item-type"
        v-model="form.type"
        type="text"
        placeholder="Consumable, Weapon, Armor..."
        required
      />

      <label for="item-description">Description</label>
      <textarea
        id="item-description"
        v-model="form.description"
        rows="4"
        placeholder="Short description"
        required
      />

      <div class="button-row">
        <button type="submit" :disabled="loading">
          {{ loading ? 'Saving...' : formMode === 'edit' ? 'Update Item' : 'Add Item' }}
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
