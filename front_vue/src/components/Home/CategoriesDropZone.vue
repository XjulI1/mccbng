<template>
  <div
          class="categories-drop-zone"
          :class="{'display-zone' : displayCategoriesDropZone}"
  >
    <div class="category-container">
      <draggable
              v-for="category in categoryList "
              :key="'category-' + category.IDcat"
              class="category"
              :data-id="category.IDcat"
              :group="{name: 'category', put: ['operation']}"
              @add="addNewOperation"
      >
        <div :class="{'actual-drag-cat' : displayActualDragCat === category.IDcat}">
          <b>{{ category.Nom }}</b>
        </div>
      </draggable>
    </div>
  </div>
</template>

<script>
  import { mapGetters, mapState } from 'vuex'
  import draggable from 'vuedraggable'

  export default {
    name: 'CategoriesDropZone',

    components: { draggable },

    computed: {
      ...mapState({
        userID: state => state.user.id,
        categoryList: state => state.category.list,
        displayCategoriesDropZone: state => state.display.categories_drop_zone,
        displayActualDragCat: state => state.display.actual_drag_cat
      }),
      ...mapGetters(['operationFromCurrentList'])
    },

    watch: {
      userID () {
        this.$store.dispatch('fetchCategoryList')
      }
    },

    methods: {
      addNewOperation (event) {
        const categoryID = event.target.dataset.id
        const operationID = event.item.dataset.id

        const operation = this.operationFromCurrentList(operationID)

        operation.IDcat = categoryID

        this.$store.dispatch('updateOperation', operation)

        event.item.remove()
      }
    }
  }
</script>

<style lang="scss" scoped>
  .display-zone {
    display: block !important;
  }

  .actual-drag-cat {
    color: orange;
  }

  .categories-drop-zone {
    position: fixed;
    z-index: 1000;
    bottom: 0;
    left: 0;
    width: 100%;
    display: none;
    background-color: lightgrey;
  }

  .category-container {
    display: flex;
    flex-wrap: wrap;
    text-align: center
  }

  .category {
    padding: 1rem;
    width: 25%;
    border: darkgrey 1px solid;
  }

  @media screen and (max-width: 767px) {
    .category {
      width: 33%;
    }
  }

  @media screen and (min-width: 768px) {
    .category {
      width: 25%;
    }
  }

  .hover-drag {
    background-color: darkgrey;
  }
</style>
