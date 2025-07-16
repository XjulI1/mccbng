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

  const router = useRouter()

  function returnToHome (event) {
    if (event.target.className === 'route-other-the-content') {
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
}

.component-content {
  margin: ($header-height-and-margin + 5px) auto auto;
  max-width: 600px;
}
</style>
