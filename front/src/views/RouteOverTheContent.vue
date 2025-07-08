<template>
  <div
    class="route-other-the-content"
    @click="returnToHome"
  >
    <div
      class="component-content"
      :class="{ 'no-title': !displayTitle }"
    >
      <h3
        v-if="displayTitle"
        class="title"
      >
        {{ $route.name }}
      </h3>
      <component
        :is="components[componentName]"
        v-bind="{ ...params, cash }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import OperationForm from '@/components/OperationForm.vue'
  import Search from '@/components/Search.vue'
  import TransfertForm from '@/components/TransfertForm.vue'

  const components = {
    'operation-form': OperationForm,
    search: Search,
    'transfert-form': TransfertForm
  }

  defineProps({
    componentName: {
      type: String,
      default: ''
    }
  })

  const route = useRoute()
  const router = useRouter()

  const params = {
    operationID: route.params.id
  }

  const cash = computed(() => {
    return String(route.name).includes('Retrait')
  })

  const displayTitle = computed(() => {
    return ['Search'].includes(route.name as string)
  })

  const returnToHome = (event) => {
    if (event.target.className === 'route-other-the-content') {
      router.push('/')
    }
  }
</script>

<style lang="scss" scoped>
.route-other-the-content {
  background-color: rgba(0, 0, 0, 0.5);
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1000;
  position: fixed;
}

.title {
  text-align: center;
}

.component-content {
  margin: ($header-height + 5px) auto auto;
  max-width: 600px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 1rem;
  border-radius: 4px;
}
</style>
