<template>
  <div
    class="account-informations"
    :class="classPointer"
    @click="getAccountDetails"
  >
    <div class="account-name" :class="classBoldTitle">
      <img
        v-if="imgID"
        class="banque-img"
        :src="`/img/banques/banque-${imgID}.png`"
      />
      <font-awesome-icon v-else-if="faIcon" :icon="faIcon" class="icon-fa" />
      {{ accountInformations.NomCompte }}
    </div>
    <div class="account-solde" :class="soldeColor">
      <Currency :amount="accountInformations.soldeNotChecked || 0" />
    </div>
    <div v-if="warning" class="warning-infos" :class="soldeColor">
      <Currency
        :amount="(accountInformations.soldeNotChecked || 0) - warning"
      />
    </div>
  </div>
</template>

<script>
import Currency from "../Currency";

export default {
  name: "Compte",
  components: { Currency },
  /* eslint-disable vue/require-prop-types */

  props: [
    "accountInformations",
    "boldTitle",
    "disableClick",
    "noColor",
    "warning",
    "faIcon",
  ],

  data() {
    return {
      soldeColor: this.getSoldeColor(),
      classBoldTitle: this.boldTitle ? "bold-title" : "",
      classPointer: this.disableClick ? "" : "cursor-pointer",
    };
  },

  computed: {
    imgID() {
      return this.accountInformations.banque
        ? this.accountInformations.banque.IDbanque
        : 0;
    },
  },

  watch: {
    "accountInformations.soldeNotChecked"() {
      this.soldeColor = this.getSoldeColor();
    },
  },

  methods: {
    getAccountDetails() {
      if (!this.disableClick) {
        if (this.$route.path !== "/") {
          this.$router.push("/");
        }

        this.$store.dispatch(
          "fetchActiveAccount",
          this.accountInformations.IDcompte
        );
        this.$store.dispatch("toggleAccountList", false);
      }
    },

    getSoldeColor() {
      if (this.noColor) {
        return "";
      }

      if (this.accountInformations.soldeNotChecked < this.warning) {
        return "soldeWarning";
      }

      return this.accountInformations.soldeNotChecked >= 0
        ? "soldeIn"
        : "soldeOut";
    },
  },
};
</script>
<style lang="scss" scoped>
.account-informations {
  padding-top: 5px;
  padding-bottom: 5px;

  display: flex;
  flex-wrap: wrap;

  &.cursor-pointer {
    cursor: pointer;
  }

  .account-name {
    flex-grow: 1;
    padding-left: 10px;
    padding-right: 10px;

    svg {
      margin-right: 5px;
    }
  }

  .account-solde {
    text-align: right;
    padding-left: 10px;
    padding-right: 10px;
  }

  .bold-title {
    font-weight: bold;
  }

  .soldeIn {
    color: green;
  }

  .soldeWarning {
    color: orange;
  }

  .soldeOut {
    color: red;
    font-weight: bold;
  }

  .warning-infos {
    width: 100%;
    text-align: right;
    font-size: 0.7rem;
    font-weight: bold;
    padding-right: 10px;
  }

  .col-8 {
    padding-left: 10px;
  }

  .col-4,
  .col-12 {
    padding: 0 10px 0 0;
  }

  .icon-fa {
    font-size: 0.7rem;
    color: grey;
    margin-bottom: 0.1rem;
  }
}

.banque-img {
  width: 20px;
  vertical-align: text-bottom;
}
</style>
