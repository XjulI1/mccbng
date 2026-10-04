<template>
  <RouteOverTheContent />
</template>

<script setup lang="ts">
  import { definePageMeta } from '#imports'
  import RouteOverTheContent from '@/components/RouteOverTheContent.vue'

  definePageMeta({
    name: 'Nouvelle opération récurrente',
    path: '/newRecurrOperation',
    componentName: 'operation-recurrente-form'
  })
</script>
