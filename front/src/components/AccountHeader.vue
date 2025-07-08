<template>
  <div class="app-header">
    <div>
      <button class="btn btn-info search-button" @click="searchOperation">
        <font-awesome-icon icon="search" />
      </button>
    </div>
    <div class="account-info">
      <div>
        {{ activeAccount.NomCompte }}
      </div>
      <div :class="{ 'no-total': disabledTotal }">
        <Currency :amount="activeAccount.soldeNotChecked || 0" /> - [<Currency
          :amount="activeAccount.soldeChecked || 0"
        />]
      </div>
    </div>
    <div>
      <button class="btn btn-secondary chart-button" @click="goToStats">
        <font-awesome-icon icon="chart-pie" />
      </button>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";

import Currency from "./Currency";

export default {
  name: "AccountHeader",
  components: { Currency },
  computed: {
    ...mapState({
      activeAccount: (state) => state.compte.activeAccount,
    }),

    disabledTotal() {
      return this.$route.meta.disabledTotalHeader === undefined
        ? false
        : this.$route.meta.disabledTotalHeader;
    },
  },

  methods: {
    goToStats() {
      this.$store.dispatch("toggleAccountList", false);
      this.$router.push("stats");
    },

    searchOperation() {
      this.$router.push("search");
    },
  },
};
</script>

<style lang="scss" scoped>
.app-header {
  height: $header-height;
  width: 100%;
  background-color: rgba(200, 200, 200, 0.9);
  position: fixed;
  top: 0;
  left: 0;
  text-align: center;
  padding-top: 10px;
  z-index: 100;

  font-size: 1.1rem;
  display: flex;
  justify-content: space-between;

  padding-left: 10px;
  padding-right: 10px;

  @media all and (min-width: $desktop_BP_min_width) {
    padding-left: 15%;
    padding-right: 15%;
  }

  button.chart-button,
  button.search-button {
    margin-top: 3px;
    width: 45px;
    height: 45px;
    font-size: 1.2rem;
    line-height: 1rem;
  }
}

.account-info {
  font-weight: bold;
  font-size: 1.05rem;
  padding: 0;
}

.no-total {
  display: none;
}
</style>
