<template>
  <div class="sum-by-month">
    <div class="selector-date">
      Mois :
      <select v-model="currentMonth">
        <option
          v-for="month in listMonth"
          :key="'month-' + month"
          :value="month + 1"
        >
          {{ month + 1 }}
        </option>
      </select>

      Année :
      <select v-model="currentYear">
        <option
          v-for="year in listYear"
          :key="'year-' + year"
          :value="year"
        >
          {{ year }}
        </option>
      </select>
    </div>
    <h5 class="total-month">
      Total ce mois :
      <b>
        <Currency :amount="negativeMonth" />
      </b>
    </h5>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import Currency from '../Currency.vue'

  const store = useStore()

  const listMonth = ref([...Array(12).keys()])
  const listYear = ref(
    [...Array(new Date().getFullYear() - 2016).keys()].map((key) => key + 2017)
  )

  const negativeMonth = computed(() => store.state.stats.negativeMonth)
  const storeCurrentYear = computed(() => store.state.stats.currentYear)
  const storeCurrentMonth = computed(() => store.state.stats.currentMonth)
  const userID = computed(() => store.state.user.id)
  const availableCompte = computed(() => store.getters.availableCompte)

  const currentYear = computed({
    get () {
      return storeCurrentYear.value
    },
    set (value) {
      store.dispatch('changeStatsCurrentYear', value)
    }
  })

  const currentMonth = computed({
    get () {
      return storeCurrentMonth.value
    },
    set (value) {
      store.dispatch('changeStatsCurrentMonth', value)
    }
  })

  watch(availableCompte, () => {
    store.dispatch('fetchSumByUserByMonth')
  })

  onMounted(() => {
    if (userID.value) {
      store.dispatch('fetchSumByUserByMonth')
    }
  })
</script>

<style scoped>
.sum-by-month {
  margin-left: 10px;
  margin-right: 10px;
}

.parjour {
  margin-left: 4%;
  margin-bottom: 10px;
}

.selector-date {
  text-align: center;
  margin-bottom: 10px;
}

.total-month {
  text-align: center;
  margin-top: 20px;
  margin-bottom: 20px;
}
</style>
