<template>
  <div class="period-picker">
    <div class="period-picker__presets">
      <button
        v-for="preset in presets"
        :key="preset.id"
        type="button"
        class="preset"
        :class="{ active: activePreset === preset.id }"
        @click="applyPreset(preset.id)"
      >
        {{ preset.label }}
      </button>
    </div>
    <div class="period-picker__range">
      <label>
        Du
        <input
          type="date"
          :value="from"
          @change="onFromChange"
        >
      </label>
      <label>
        Au
        <input
          type="date"
          :value="to"
          @change="onToChange"
        >
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'

  const props = defineProps<{
    from: string
    to: string
  }>()

  const emit = defineEmits<{
    'update:from': [value: string]
    'update:to': [value: string]
    change: [range: { from: string; to: string }]
  }>()

  const activePreset = ref<string>('year')
  const presets = [
    { id: 'month', label: 'Mois' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Année' },
    { id: 'rolling', label: '12 mois' },
    { id: 'custom', label: 'Personnalisé' }
  ]

  const toISO = (d: Date) => d.toISOString().slice(0, 10)

  const emitRange = (from: string, to: string) => {
    emit('update:from', from)
    emit('update:to', to)
    emit('change', { from, to })
  }

  const applyPreset = (id: string) => {
    activePreset.value = id
    if (id === 'custom') return
    const now = new Date()
    let start = new Date()
    const end = new Date(now)
    if (id === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (id === 'quarter') {
      const q = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), q * 3, 1)
    } else if (id === 'year') {
      start = new Date(now.getFullYear(), 0, 1)
    } else if (id === 'rolling') {
      start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    }
    emitRange(toISO(start), toISO(end))
  }

  const onFromChange = (e: Event) => {
    activePreset.value = 'custom'
    emitRange((e.target as HTMLInputElement).value, props.to)
  }

  const onToChange = (e: Event) => {
    activePreset.value = 'custom'
    emitRange(props.from, (e.target as HTMLInputElement).value)
  }

  onMounted(() => {
    if (!props.from || !props.to) {
      applyPreset('year')
    }
  })
</script>

<style scoped>
  .period-picker {
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    margin: 10px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  .period-picker__presets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
  .preset {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-normal);
  }
  .preset:hover {
    background: var(--bg-muted);
  }
  .preset.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  .period-picker__range {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    align-items: center;
    color: var(--text-primary);
  }
  .period-picker__range input[type="date"] {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-primary);
    margin-left: var(--spacing-sm);
  }
</style>
