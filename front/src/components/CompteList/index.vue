<template>
  <div class="compte-list">
    <compte
      v-for="account in availableCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="check"
    />
    <compte
      v-for="account in porteFeuilleCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="money-bill"
    />
    <hr class="hr-point">
    <compte
      :account-informations="totalAccounts.available"
      :bold-title="cssClasses.compteBoldTitle.boldTitle"
      :disable-click="true"
      no-color="true"
    />
    <hr>
    <compte
      v-for="account in bloquedCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="times-circle"
    />
    <hr class="hr-point">
    <compte
      :account-informations="totalAccounts.all"
      :bold-title="cssClasses.compteBoldTitle.boldTitle"
      :disable-click="true"
      :warning="warningTotal"
    />
    <hr>
    <compte
      v-for="account in retraiteCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="times-circle"
    />
    <hr class="hr-point">
    <compte
      :account-informations="totalAccounts.retraite"
      :bold-title="cssClasses.compteBoldTitle.boldTitle"
      :disable-click="true"
      no-color="true"
    />
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useStore } from 'vuex'
  import Compte from './Compte.vue'

  const store = useStore()

  const totalAccounts = ref({
    available: {
      NomCompte: 'Total disponible',
      solde: 0
    },
    all: {
      NomCompte: 'Total global',
      solde: 0
    },
    retraite: {
      NomCompte: 'Total retraite',
      solde: 0
    }
  })

  const cssClasses = ref({
    compteBoldTitle: { boldTitle: true }
  })

  const warningTotal = computed(() => store.state.user.warningTotal)
  const totalAvailable = computed(() => store.getters.totalAvailable)
  const totalGlobal = computed(() => store.getters.totalGlobal)
  const totalRetraite = computed(() => store.getters.totalRetraite)
  const availableCompte = computed(() => store.getters.availableCompte)
  const bloquedCompte = computed(() => store.getters.bloquedCompte)
  const retraiteCompte = computed(() => store.getters.retraiteCompte)
  const porteFeuilleCompte = computed(() => store.getters.porteFeuilleCompte)

  watch(totalAvailable, (value) => {
    totalAccounts.value.available = {
      ...totalAccounts.value.available,
      soldeNotChecked: value
    }
  })

  watch(totalGlobal, (value) => {
    totalAccounts.value.all = {
      ...totalAccounts.value.all,
      soldeNotChecked: value
    }
  })

  watch(totalRetraite, (value) => {
    totalAccounts.value.retraite = {
      ...totalAccounts.value.retraite,
      soldeNotChecked: value
    }
  })
</script>

<style>
.hr-point {
  height: none;
  border: none;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}
</style>
