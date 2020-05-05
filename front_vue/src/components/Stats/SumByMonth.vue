<template>
  <div class="sum-by-month">
    <div class="selector-date">
      Mois :
      <select v-model="currentMonth">
        <option
                v-for="month in listMonth"
                :key="'month-' + month"
                :value="month+1"
        >
          {{ month+1 }}
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

    <div class="total-month">
      Total ce mois : <b>{{ negativeMonth }}{{ currency }}</b>
    </div>

    <div
            v-for="(accountTotal, IDcompte) in negativeByAccountFilter"
            :key="IDcompte"
    >
      {{ getAccount(IDcompte).NomCompte }} :
      <b>{{ accountTotal }} {{ currency }}</b>
      <div class="parjour">
        par jour :
        {{ Math.round(accountTotal / numberDaysForCurrentMonth() * 100) / 100 }} {{ currency }}
      </div>
    </div>
  </div>
</template>

<script>
  import { mapGetters, mapState } from 'vuex'

  export default {
    name: 'SumByMonth',

    data () {
      return {
        listMonth: [...Array(12).keys()],
        listYear: [...Array(((new Date()).getYear() + 1900) - 2016).keys()].map(key => key + 2017)
      }
    },

    computed: {
      ...mapState({
        negativeByAccount: state => state.stats.negativeByAccount,
        negativeMonth: state => state.stats.negativeMonth,
        currency: state => state.compte.currency,
        storeCurrentYear: state => state.stats.currentYear,
        storeCurrentMonth: state => state.stats.currentMonth,
        userID: state => state.user.id
      }),

      ...mapGetters(['availableCompte', 'getAccount']),

      currentYear: {
        get () {
          return this.storeCurrentYear
        },
        set (value) {
          this.$store.dispatch('changeStatsCurrentYear', value)
        }
      },

      currentMonth: {
        get () {
          return this.storeCurrentMonth
        },
        set (value) {
          this.$store.dispatch('changeStatsCurrentMonth', value)
        }
      },

      negativeByAccountFilter () {
        const filterArray = {}

        Object.keys(this.negativeByAccount).forEach((key) => {
          if (this.negativeByAccount[key] !== undefined && this.negativeByAccount[key] !== null) {
            filterArray[key] = this.negativeByAccount[key]
          }
        })

        return filterArray
      }
    },

    watch: {
      availableCompte () {
        this.$store.dispatch('fetchSumByUserByMonth')
      }
    },

    created () {
      if (this.userID) {
        this.$store.dispatch('fetchSumByUserByMonth')
      }
    },

    methods: {
      numberDaysForCurrentMonth () {
        const currentDate = new Date()

        if (this.currentYear === currentDate.getFullYear() && this.currentMonth === currentDate.getMonth() + 1) {
          return (new Date()).getDate() * -1
        }

        return new Date(this.currentYear, this.currentMonth, 0).getDate()
      }
    }
  }
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
    margin-bottom: 20px;
  }
</style>
