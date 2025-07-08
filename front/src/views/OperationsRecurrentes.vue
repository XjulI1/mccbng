<template>
  <div style="margin-bottom: 40px">
    <operation-recurrente
      v-for="operation in operationsRecurrenteList"
      :key="'operation-recu-' + operation.IDopRecu"
      v-bind="{ operation }"
      recurr="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import OperationRecurrente from "@/components/OperationRecurrente.vue";

const store = useStore();

const userToken = computed(() => store.state.user.token);
const operationsOfActiveAccount = computed(
  () => store.state.operation.operationsOfActiveAccount
);

const operationsRecurrenteList = computed(() => {
  if (
    operationsOfActiveAccount.value[0] &&
    operationsOfActiveAccount.value[0].IDopRecu !== undefined
  ) {
    return operationsOfActiveAccount.value;
  }
  return [];
});

watch(userToken, () => {
  store.dispatch("fetchRecurrOperation");
});

onMounted(() => {
  if (userToken.value) {
    store.dispatch("fetchRecurrOperation");
  }
});
</script>
