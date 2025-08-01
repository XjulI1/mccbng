<template>
  <div
    class="nav-bar btn-group"
    role="group"
  >
    <button
      class="btn btn-secondary left-panel-button"
      :disabled="route.name === 'Login'"
      @click="burgerMenuClick"
    >
      <font-awesome-icon icon="hamburger" />
    </button>
    <button
      class="btn btn-warning virement-button"
      :disabled="disabled.valueOf()"
      @click="doTransfert"
    >
      <font-awesome-icon icon="exchange-alt" />
    </button>
    <button
      class="btn btn-primary new-operation-button"
      :disabled="disabled.valueOf()"
      @click="addOperation"
    >
      <font-awesome-icon icon="plus" />
    </button>
    <button
      class="btn btn-info operation-recurrente-button"
      :disabled="route.name === 'Login'"
      @click="getRecurrenteOp"
    >
      <font-awesome-icon icon="retweet" />
    </button>
    <button
      class="btn btn-success amortissement-button"
      :disabled="route.name === 'Login'"
      @click="getAmortissement"
    >
      <font-awesome-icon icon="history" />
    </button>
    <button
      class="btn btn-danger params-button"
      @click="changeParams"
    >
      <font-awesome-icon icon="cogs" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed, type ComputedRef } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useStore } from 'vuex'

  const route = useRoute()
  const router = useRouter()
  const store = useStore()

  const disabled: ComputedRef<boolean> = computed(() => {
    return route.meta.disabledTotalHeader === undefined
      ? false
      : Boolean(route.meta.disabledTotalHeader)
  })

  const burgerMenuClick = () => {
    store.dispatch('toggleAccountList')
  }

  const addOperation = () => {
    store.dispatch('toggleAccountList', false)
    router.push('/newOperation')
  }

  const doTransfert = () => {
    store.dispatch('toggleAccountList', false)
    router.push('/transfert')
  }

  const getRecurrenteOp = () => {
    store.dispatch('toggleAccountList', false)
    router.push('/recurrOperation')
  }

  const getAmortissement = () => {
    store.dispatch('toggleAccountList', false)
    router.push('/amortissement')
  }

  const changeParams = () => {
    store.dispatch('toggleAccountList', false)
    router.push('/config')
  }
</script>

<style lang="scss" scoped>
.btn {
  display: inline-block;
  font-weight: 400;
  color: #212529;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  background-color: transparent;
  border: 1px solid transparent;
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  border-radius: 0.25rem;
  transition:
    color 0.15s ease-in-out,
    background-color 0.15s ease-in-out,
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
  text-decoration: none;
}

.btn.disabled,
.btn:disabled {
  opacity: 0.65;
}

.btn-warning {
  color: #212529;
  background-color: #ffc107;
  border-color: #ffc107;
}

.btn-warning:hover {
  color: #212529;
  background-color: #e0a800;
  border-color: #d39e00;
}

.btn-warning:focus,
.btn-warning.focus {
  color: #212529;
  background-color: #e0a800;
  border-color: #d39e00;
  box-shadow: 0 0 0 0.2rem rgba(222, 170, 12, 0.5);
}

.btn-warning.disabled,
.btn-warning:disabled {
  color: #212529;
  background-color: #ffc107;
  border-color: #ffc107;
}

.btn-warning:not(:disabled):not(.disabled):active,
.btn-warning:not(:disabled):not(.disabled).active {
  color: #212529;
  background-color: #d39e00;
  border-color: #c69500;
}

.btn-warning:not(:disabled):not(.disabled):active:focus,
.btn-warning:not(:disabled):not(.disabled).active:focus {
  box-shadow: 0 0 0 0.2rem rgba(222, 170, 12, 0.5);
}

.btn-danger {
  color: #fff;
  background-color: #dc3545;
  border-color: #dc3545;
}

.btn-danger:hover {
  color: #fff;
  background-color: #c82333;
  border-color: #bd2130;
}

.btn-danger:focus,
.btn-danger.focus {
  color: #fff;
  background-color: #c82333;
  border-color: #bd2130;
  box-shadow: 0 0 0 0.2rem rgba(225, 83, 97, 0.5);
}

.btn-danger.disabled,
.btn-danger:disabled {
  color: #fff;
  background-color: #dc3545;
  border-color: #dc3545;
}

.btn-danger:not(:disabled):not(.disabled):active,
.btn-danger:not(:disabled):not(.disabled).active {
  color: #fff;
  background-color: #bd2130;
  border-color: #b21f2d;
}

.btn-danger:not(:disabled):not(.disabled):active:focus,
.btn-danger:not(:disabled):not(.disabled).active:focus {
  box-shadow: 0 0 0 0.2rem rgba(225, 83, 97, 0.5);
}

.btn-success {
  color: #fff;
  background-color: #28a745;
  border-color: #28a745;
}

.btn-success:hover {
  color: #fff;
  background-color: #218838;
  border-color: #1e7e34;
}

.btn-success:focus,
.btn-success.focus {
  color: #fff;
  background-color: #218838;
  border-color: #1e7e34;
  box-shadow: 0 0 0 0.2rem rgba(72, 180, 97, 0.5);
}

.btn-success.disabled,
.btn-success:disabled {
  color: #fff;
  background-color: #28a745;
  border-color: #28a745;
}

.btn-success:not(:disabled):not(.disabled):active,
.btn-success:not(:disabled):not(.disabled).active {
  color: #fff;
  background-color: #1e7e34;
  border-color: #1c7430;
}

.btn-success:not(:disabled):not(.disabled):active:focus,
.btn-success:not(:disabled):not(.disabled).active:focus {
  box-shadow: 0 0 0 0.2rem rgba(72, 180, 97, 0.5);
}

.btn-info {
  color: #fff;
  background-color: #17a2b8;
  border-color: #17a2b8;
}

.btn-info:hover {
  color: #fff;
  background-color: #138496;
  border-color: #117a8b;
}

.btn-info:focus,
.btn-info.focus {
  color: #fff;
  background-color: #138496;
  border-color: #117a8b;
  box-shadow: 0 0 0 0.2rem rgba(58, 176, 195, 0.5);
}

.btn-info.disabled,
.btn-info:disabled {
  color: #fff;
  background-color: #17a2b8;
  border-color: #17a2b8;
}

.btn-info:not(:disabled):not(.disabled):active,
.btn-info:not(:disabled):not(.disabled).active {
  color: #fff;
  background-color: #117a8b;
  border-color: #10707f;
}

.btn-info:not(:disabled):not(.disabled):active:focus,
.btn-info:not(:disabled):not(.disabled).active:focus {
  box-shadow: 0 0 0 0.2rem rgba(58, 176, 195, 0.5);
}

.btn-primary {
  color: #fff;
  background-color: #007bff;
  border-color: #007bff;
}

.btn-primary:hover {
  color: #fff;
  background-color: #0069d9;
  border-color: #0062cc;
}

.btn-primary:focus,
.btn-primary.focus {
  color: #fff;
  background-color: #0069d9;
  border-color: #0062cc;
  box-shadow: 0 0 0 0.2rem rgba(38, 143, 255, 0.5);
}

.btn-primary.disabled,
.btn-primary:disabled {
  color: #fff;
  background-color: #007bff;
  border-color: #007bff;
}

.btn-primary:not(:disabled):not(.disabled):active,
.btn-primary:not(:disabled):not(.disabled).active {
  color: #fff;
  background-color: #0062cc;
  border-color: #005cbf;
}

.btn-primary:not(:disabled):not(.disabled):active:focus,
.btn-primary:not(:disabled):not(.disabled).active:focus {
  box-shadow: 0 0 0 0.2rem rgba(38, 143, 255, 0.5);
}

.btn-secondary {
  color: #fff;
  background-color: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover {
  color: #fff;
  background-color: #5a6268;
  border-color: #545b62;
}

.btn-secondary:focus,
.btn-secondary.focus {
  color: #fff;
  background-color: #5a6268;
  border-color: #545b62;
  box-shadow: 0 0 0 0.2rem rgba(130, 138, 145, 0.5);
}

.btn-secondary.disabled,
.btn-secondary:disabled {
  color: #fff;
  background-color: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:not(:disabled):not(.disabled):active,
.btn-secondary:not(:disabled):not(.disabled).active {
  color: #fff;
  background-color: #545b62;
  border-color: #4e555b;
}

.btn-secondary:not(:disabled):not(.disabled):active:focus,
.btn-secondary:not(:disabled):not(.disabled).active:focus {
  box-shadow: 0 0 0 0.2rem rgba(130, 138, 145, 0.5);
}

.nav-bar {
  padding: 8px 16px;
  height: auto;
  width: fit-content;
  max-width: 90%;
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  text-align: center;
  z-index: 100;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  @media screen and (max-width: $mobile_BP_max_width) {
    width: fit-content;
    max-width: 95%;
    bottom: 16px;
    padding: 6px 12px;
  }

  a {
    svg {
      margin-top: 4px;
    }
  }

  &.btn-group {
    position: fixed;

    .btn {
      border-radius: 14px;
      margin: 0 6px;
      height: $navbar-height;
      width: 3rem;
      border: none;
      backdrop-filter: blur(5px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 1.2rem;
      font-weight: 600;
      border-top-right-radius: 14px;
      border-bottom-right-radius: 14px;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      @media screen and (max-width: $mobile_BP_max_width) {
        padding-bottom: 18px;
      }

      @media screen and (min-width: $mobile_BP_max_width) {
        &.left-panel-button {
          display: none;
        }
      }

      &.operation-recurrente-button {
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
        margin-right: 0;
      }
      &.amortissement-button {
        border-top-left-radius: 0px;
        border-bottom-left-radius: 0px;
        margin-left: 0;
      }
    }
  }
}
</style>
