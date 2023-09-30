<template>
  <div>
    <input
      id="search-input"
      ref="search-input"
      v-model="searchTerms"
      type="text"
      class="form-control"
      placeholder="Search terms"
      @keyup="search"
    >
  </div>
</template>

<script>
  export default {
    name: 'Search',

    data () {
      return {
        searchTerms: '',
        timer: null
      }
    },

    mounted () {
      this.$refs['search-input'].focus()
    },

    methods: {
      search () {
        if (this.timer) {
          clearTimeout(this.timer)
          this.timer = null
        }
        this.timer = setTimeout(() => {
          this.$store.dispatch('getSearchOperations', this.searchTerms)
        }, 200)
      }
    }
  }
</script>
