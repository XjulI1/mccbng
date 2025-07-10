<template>
  <div class="op-recurrentes">
    <operation-recurrente-list :operations="operationsRecurrenteList" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import OperationRecurrenteList from "@/components/OperationRecurrenteList.vue";

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
<style lang="scss" scoped>
.op-recurrentes {
  margin-bottom: $navbar-height-and-margin;
}
</style>
