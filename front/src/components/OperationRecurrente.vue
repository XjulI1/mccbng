<template>
  <div class="container">
    <div class="row">
      <div class="col-6">
        <label>
          {{ operation.NomOpRecu }}
          <br />
          {{ dateOperation }}
        </label>
      </div>
      <div class="col-2 center-text" :class="css.montant">
        <Currency :amount="operation.MontantOpRecu" />
      </div>
      <div class="col-4">
        {{ accountName }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";
import Currency from "./Currency.vue";

const props = defineProps({
  operation: {
    type: Object,
    default: () => {},
  },
});

const store = useStore();

const dateOperation = computed(() => {
  return new Date(props.operation.DernierDateOpRecu).toLocaleDateString();
});

const css = computed(() => ({
  montant: props.operation.MontantOpRecu > 0 ? "montantIn" : "montantOut",
}));

const accountName = computed(() => {
  return (
    store.state.compte.accountList.find(
      (account) => account.IDcompte === props.operation.IDcompte
    )?.NomCompte || "Unknown Account"
  );
});
</script>

<style scoped>
.center-text {
  text-align: center;
}

.montantIn {
  color: green;
}

.montantOut {
  color: red;
}
</style>
