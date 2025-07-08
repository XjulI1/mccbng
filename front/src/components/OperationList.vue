<template>
  <div class="operation-list">
    <component
      :is="OperationRenderer"
      v-for="operation in operationsList"
      :key="'operation-' + operation.IDop"
      v-bind="{ operation }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useStore } from "vuex";

const props = defineProps({
  OperationRenderer: { type: Object, required: true },
});

const store = useStore();

const userFavoris = computed(() => store.state.user.favoris);
const accountList = computed(() => store.state.compte.accountList);
const operationsOfActiveAccount = computed(
  () => store.state.operation.operationsOfActiveAccount
);

const operationsList = computed(() => {
  if (
    operationsOfActiveAccount.value &&
    operationsOfActiveAccount.value[0] &&
    operationsOfActiveAccount.value[0].IDop !== undefined
  ) {
    return operationsOfActiveAccount.value;
  }
  return [];
});

watch(accountList, () => {
  if (operationsOfActiveAccount.value === undefined) {
    store.dispatch("fetchActiveAccount", userFavoris.value);
  }
});
</script>
<style lang="scss" scoped>
.operation-list {
  width: 100%;
}
</style>
