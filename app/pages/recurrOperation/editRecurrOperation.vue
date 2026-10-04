<template>
  <RouteOverTheContent />
</template>

<script setup lang="ts">
  import { definePageMeta } from '#imports'
  import RouteOverTheContent from '@/components/RouteOverTheContent.vue'

  definePageMeta({
    name: 'Edition opération récurrente',
    path: '/editRecurrOperation/:id',
    componentName: 'operation-recurrente-form'
  })
</script>
