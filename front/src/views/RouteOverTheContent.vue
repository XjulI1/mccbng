<template>
  <div
    class="route-other-the-content"
    @click="returnToHome"
  >
    <div class="component-content">
      <component :is="components[componentName]" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import OperationForm from '@/components/OperationForm.vue'
  import OperationRecurrenteForm from '@/components/OperationRecurrenteForm.vue'
  import Search from '@/components/Search.vue'
  import TransfertForm from '@/components/TransfertForm.vue'
  import CreditForm from '@/components/CreditForm.vue'

  const components = {
    'operation-form': OperationForm,
    'operation-recurrente-form': OperationRecurrenteForm,
    search: Search,
    'transfert-form': TransfertForm,
    'credit-form': CreditForm
  }

  const props = defineProps({
    componentName: {
      type: String,
      default: ''
    }
  })

  const router = useRouter()

  function returnToHome (event) {
    if (event.target.className !== 'route-other-the-content') return

    if (props.componentName === 'operation-recurrente-form') {
      router.push('/recurrOperation')
    } else if (props.componentName === 'credit-form') {
      router.push('/credits')
    } else {
      router.push('/')
    }
  }
</script>

<style lang="scss" scoped>
.route-other-the-content {
  background-color: rgba(0, 0, 0, 0.25);
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1000;
  position: fixed;
  overflow-y: auto;
  overflow-x: hidden;
}

.component-content {
  margin: ($header-height-and-margin + 5px) auto 20px;
  max-width: 600px;
  padding: 0 10px;
}
</style>
