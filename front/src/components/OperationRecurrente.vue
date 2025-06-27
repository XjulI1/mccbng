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
      <div class="col-4">{{ accountName }}</div>
    </div>
  </div>
</template>

<script>
import Currency from "./Currency";

export default {
  name: "OperationRecurrente",
  components: { Currency },
  props: {
    operation: {
      type: Object,
      default: () => {},
    },
  },

  data() {
    const store = this.$store;

    return {
      dateOperation: new Date(
        this.operation.DernierDateOpRecu
      ).toLocaleDateString(),
      css: {
        montant: this.operation.MontantOpRecu > 0 ? "montantIn" : "montantOut",
      },
      accountName:
        store.state.compte.accountList.find(
          (account) => account.IDcompte === this.operation.IDcompte
        )?.NomCompte || "Unknown Account",
    };
  },
};
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
