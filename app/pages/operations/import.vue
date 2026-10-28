<template>
  <RouteOverTheContent />
</template>

<script setup lang="ts">
  import { definePageMeta } from '#imports'
  import RouteOverTheContent from '@/components/RouteOverTheContent.vue'

  definePageMeta({
    name: 'Import d\'opérations',
    path: '/import',
    componentName: 'import-form'
  })
</script>
