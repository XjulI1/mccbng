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

<script>
  import { mapGetters, mapState } from 'vuex'
  import Currency from '../Currency'

  export default {
    name: 'SumByMonth',
    components: { Currency },
    data () {
      return {
        listMonth: [...Array(12).keys()],
        listYear: [...Array(new Date().getYear() + 1900 - 2016).keys()].map(
          (key) => key + 2017
        )
      }
    },

    computed: {
      ...mapState({
        negativeMonth: (state) => state.stats.negativeMonth,
        storeCurrentYear: (state) => state.stats.currentYear,
        storeCurrentMonth: (state) => state.stats.currentMonth,
        userID: (state) => state.user.id
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

        if (
          this.currentYear === currentDate.getFullYear() &&
          this.currentMonth === currentDate.getMonth() + 1
        ) {
          return new Date().getDate() * -1
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
  margin-top: 20px;
  margin-bottom: 20px;
}
</style>
