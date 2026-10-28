<template>
  <div class="recap">
    <header class="recap-greeting">
      <h1>{{ salutation }}</h1>
      <p class="recap-date">
        {{ today }}
      </p>
    </header>

    <p
      v-if="error"
      class="recap-error"
      role="alert"
    >
      Impossible de charger le récap.
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        @click="load"
      >
        Réessayer
      </button>
    </p>

    <button
      type="button"
      class="recap-hero"
      @click="displayStore.toggleAccountList(true)"
    >
      <span class="hero-label">
        <font-awesome-icon icon="wallet" />
        Total global
        <span class="hero-hint">(hors comptes retraite et enfants)</span>
      </span>
      <span class="hero-value">
        <Currency
          v-if="comptesCharges"
          :amount="totalGlobal"
        />
        <template v-else>…</template>
      </span>
      <span
        v-if="objectif && comptesCharges"
        class="hero-goal"
      >
        <span class="goal-text">
          <font-awesome-icon :icon="objectifAtteint ? 'check-circle' : 'exclamation-circle'" />
          <span>
            <template v-if="objectifAtteint">Objectif annuel atteint : <Currency :amount="totalGlobal - objectif" /> d'avance</template>
            <template v-else>Il manque <Currency :amount="objectif - totalGlobal" /> pour l'objectif annuel</template>
          </span>
        </span>
        <template v-if="annee">
          <span
            class="goal-meter"
            role="meter"
            aria-label="Progression vers l'objectif annuel depuis le 1er janvier"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="annee.progression"
          >
            <span
              class="goal-fill"
              :class="objectifAtteint ? 'reached' : 'pending'"
              :style="{ width: annee.progression + '%' }"
            />
          </span>
          <span class="goal-ends">
            <Currency :amount="annee.debut" />
            <Currency :amount="objectif" />
          </span>
          <span class="goal-year">
            Évolution depuis le 1er janvier :
            <Currency
              :amount="annee.variation"
              :class="{ plus: annee.variation > 0 }"
            />
          </span>
        </template>
      </span>
    </button>

    <div class="recap-cards">
      <section
        class="recap-card"
        aria-labelledby="recap-immo"
      >
        <div class="card-head">
          <h2 id="recap-immo">
            <span class="card-icon immo"><font-awesome-icon icon="home" /></span>
            Immobilier
          </h2>
          <NuxtLink
            to="/biens"
            class="card-link"
          >
            Mes biens <font-awesome-icon icon="chevron-right" />
          </NuxtLink>
        </div>

        <template v-if="recap && recap.immobilier > 0">
          <p class="card-lead">
            Vous possédez <strong>{{ formatTaux(partPossedee) }}</strong> de votre immobilier
          </p>
          <div
            class="meter"
            role="meter"
            aria-label="Part de l'immobilier possédée"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="partPossedee"
          >
            <div
              class="meter-fill"
              :style="{ width: Math.max(0, partPossedee) + '%' }"
            />
          </div>
        </template>
        <p
          v-else-if="recap"
          class="card-lead muted"
        >
          Aucun bien enregistré pour l'instant.
        </p>

        <dl
          v-if="recap"
          class="card-rows"
        >
          <div>
            <dt>Valeur des biens</dt>
            <dd><Currency :amount="recap.immobilier" /></dd>
          </div>
          <div>
            <dt>
              <NuxtLink to="/credits">
                Restant dû (crédits)
              </NuxtLink>
            </dt>
            <dd class="debt">
              <Currency :amount="-recap.restantCredit" />
            </dd>
          </div>
          <div class="row-total">
            <dt>Immobilier net</dt>
            <dd><Currency :amount="recap.immobilierNet" /></dd>
          </div>
        </dl>
      </section>

      <section
        class="recap-card"
        aria-labelledby="recap-epargne"
      >
        <div class="card-head">
          <h2 id="recap-epargne">
            <span class="card-icon epargne"><font-awesome-icon icon="percent" /></span>
            Taux d'épargne
          </h2>
          <NuxtLink
            to="/stats"
            class="card-link"
          >
            Stats <font-awesome-icon icon="chevron-right" />
          </NuxtLink>
        </div>

        <p
          v-if="tendance"
          class="card-lead"
        >
          {{ tendance }}
        </p>

        <ul class="savings">
          <li
            v-for="periode in epargne"
            :key="periode.mois"
            :title="periodeLabel(periode)"
          >
            <span class="savings-label">{{ dureeLabel(periode.mois) }}</span>
            <div
              class="meter"
              aria-hidden="true"
            >
              <div
                class="meter-fill"
                :class="{ negative: (periode.taux ?? 0) < 0 }"
                :style="{ width: Math.min(100, Math.abs(periode.taux ?? 0)) + '%' }"
              />
            </div>
            <span
              class="savings-rate"
              :class="{ negative: (periode.taux ?? 0) < 0 }"
            >
              {{ periode.taux === null ? '—' : formatTaux(periode.taux) }}
            </span>
            <span class="savings-amount">
              <template v-if="periode.epargne >= 0">
                <Currency :amount="periode.epargne" /> mis de côté
              </template>
              <template v-else>
                <Currency :amount="-periode.epargne" /> dépensés en plus des revenus
              </template>
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { definePageMeta } from '#imports'
  import { NuxtLink } from '#components'
  import { fetchRecap } from '@/services/stats'
  import { API_URL } from '@/services/config'
  import { useCompteStore } from '@/stores/compte'
  import { useDisplayStore } from '@/stores/display'
  import { useUserStore } from '@/stores/user'
  import Currency from '@/components/Currency.vue'

  definePageMeta({
    name: 'Home',
    disabledTotalHeader: true,
    headerTitle: 'Récap'
  })

  type Periode = { mois: number; from: string; toExclusive: string; epargne: number; taux: number | null }
  type Recap = {
    immobilier: number
    restantCredit: number
    immobilierNet: number
    epargne: Periode[]
    depuisJanvier: { from: string; parCompte: { IDcompte: number; total: number }[] }
  }

  const compteStore = useCompteStore()
  const displayStore = useDisplayStore()
  const userStore = useUserStore()

  const recap = ref<Recap | null>(null)
  const error = ref(false)

  const load = async () => {
    error.value = false
    try {
      recap.value = await fetchRecap(userStore.token, API_URL)
    } catch {
      error.value = true
    }
  }

  onMounted(load)

  const now = new Date()
  const salutation = computed(() => {
    const mot = now.getHours() >= 18 ? 'Bonsoir' : 'Bonjour'
    return userStore.username ? `${mot} ${userStore.username}` : mot
  })
  const today = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Même total que la liste des comptes (comptes visibles), tenu à jour à chaque opération
  const comptesCharges = computed(() => compteStore.accountList.length > 0)
  const totalGlobal = computed(() => compteStore.totalGlobal)

  // Objectif annuel du profil (User.warningTotal)
  const objectif = computed(() => Number(userStore.warningTotal) || 0)
  const objectifAtteint = computed(() => totalGlobal.value >= objectif.value)

  // Progression de l'année : ce qui a été mis de côté depuis le 1er janvier, rapporté à ce qu'il restait à mettre de
  // côté à cette date. Le total au 1er janvier = total actuel − opérations de l'année des mêmes comptes.
  const annee = computed(() => {
    if (!recap.value) return null
    const parCompte = new Map(recap.value.depuisJanvier.parCompte.map(row => [row.IDcompte, row.total]))
    const variation = Math.round(compteStore.globalCompte.reduce((sum, compte) => sum + (parCompte.get(compte.IDcompte) ?? 0), 0) * 100) / 100
    const aMettreDeCote = Math.round((objectif.value - (totalGlobal.value - variation)) * 100) / 100
    const progression = aMettreDeCote > 0
      ? Math.min(100, Math.max(0, (variation / aMettreDeCote) * 100))
      : (objectifAtteint.value ? 100 : 0)
    return { debut: Math.round((totalGlobal.value - variation) * 100) / 100, variation, progression: Math.round(progression) }
  })

  const epargne = computed(() => recap.value?.epargne ?? [])
  const semestre = computed(() => epargne.value.find(periode => periode.mois === 6))

  // Part de la valeur des biens qui n'est plus due à la banque
  const partPossedee = computed(() => {
    if (!recap.value?.immobilier) return 0
    return Math.round((recap.value.immobilierNet / recap.value.immobilier) * 1000) / 10
  })

  // 6 derniers mois comparés à la moyenne sur 5 ans, à un point près
  const tendance = computed(() => {
    const recent = semestre.value?.taux
    const long = epargne.value.find(periode => periode.mois === 60)?.taux
    if (recent == null || long == null) return ''
    const ecart = Math.round((recent - long) * 10) / 10
    if (Math.abs(ecart) < 1) return 'Vous épargnez au même rythme que sur les 5 dernières années.'
    const points = `${Math.abs(ecart).toLocaleString('fr-FR')} point${Math.abs(ecart) >= 2 ? 's' : ''}`
    return ecart > 0
      ? `Vous épargnez davantage qu'en moyenne sur 5 ans (+${points}).`
      : `Vous épargnez moins qu'en moyenne sur 5 ans (−${points}).`
  })

  const dureeLabel = (mois: number) => (mois < 12 ? `${mois} mois` : `${mois / 12} an${mois > 12 ? 's' : ''}`)

  const formatTaux = (taux: number) => `${taux.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`

  // `toExclusive` est le 1er du mois suivant la période : le dernier mois inclus est celui d'avant
  const moisLabel = (iso: string, offset = 0) => {
    const date = new Date(`${iso}T00:00:00.000Z`)
    date.setUTCMonth(date.getUTCMonth() + offset)
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
  const periodeLabel = (periode: Periode) => `De ${moisLabel(periode.from)} à ${moisLabel(periode.toExclusive, -1)}`
</script>

<style lang="scss" scoped>
.recap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 760px;
  margin: 0 auto $navbar-height-and-margin;
  padding: 16px 16px 24px;
  color: var(--text-primary);
}

.recap-greeting {
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }
}

.recap-date {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;

  &::first-letter {
    text-transform: uppercase;
  }
}

.recap-error {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.recap-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 20px;
  text-align: left;
  font: inherit;
  color: #fff;
  background: var(--primary-gradient);
  border: none;
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid var(--border-color-focus);
    outline-offset: 2px;
  }
}

.hero-label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 8px;
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.9;
}

.hero-value {
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 4px;
}

.hero-hint {
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.85;
}

.hero-goal {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  font-size: 0.9rem;
}

.goal-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.goal-meter {
  display: block;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.25);
}

.goal-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;

  &.pending {
    background: var(--color-warning-dark);
  }

  &.reached {
    background: var(--color-success);
  }
}

.goal-ends {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.75rem;
  line-height: 1.3;
  opacity: 0.85;
}

.goal-year {
  font-size: 0.8rem;
  opacity: 0.9;

  .plus::before {
    content: '+';
  }
}

.recap-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.recap-card {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
  }
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;

  &.immo {
    background: var(--success-gradient);
  }

  &.epargne {
    background: var(--warning-gradient);
  }
}

.card-link {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: var(--color-primary);
  }
}

.card-lead {
  margin: 0 0 10px;
  font-size: 0.95rem;

  &.muted {
    color: var(--text-secondary);
  }
}

.meter {
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.meter-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--color-primary);
  transition: width 0.4s ease;

  &.negative {
    background: var(--color-danger);
  }
}

.card-rows {
  margin: 14px 0 0;

  div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
  }

  dt {
    font-weight: 400;
    color: var(--text-secondary);

    a {
      color: inherit;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  dd {
    margin: 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .debt {
    color: var(--color-danger-dark);
  }

  .row-total {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid var(--border-color);

    dt {
      color: var(--text-primary);
      font-weight: 600;
    }
  }
}

.savings {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  li {
    display: grid;
    grid-template-columns: 4.5rem minmax(0, 1fr) 4rem;
    grid-template-areas:
      'label meter rate'
      '. amount amount';
    align-items: center;
    column-gap: 10px;
  }

  .meter {
    grid-area: meter;
  }
}

.savings-label {
  grid-area: label;
  font-weight: 600;
  font-size: 0.9rem;
}

.savings-rate {
  grid-area: rate;
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  &.negative {
    color: var(--color-danger-dark);
  }
}

.savings-amount {
  grid-area: amount;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

@media screen and (max-width: $mobile_BP_max_width) {
  .recap {
    gap: 12px;
    padding: 12px 12px 20px;
  }

  .recap-greeting h1 {
    font-size: 1.25rem;
  }

  .recap-date {
    font-size: 0.85rem;
  }

  .recap-hero {
    padding: 16px;
    border-radius: 16px;
  }

  .hero-value {
    font-size: 2.1rem;
  }

  .recap-card {
    padding: 14px;
    border-radius: 14px;
  }

  .card-head {
    margin-bottom: 10px;

    h2 {
      font-size: 1rem;
    }
  }

  .card-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    font-size: 0.8rem;
  }

  .card-lead,
  .card-rows {
    font-size: 0.9rem;
  }

  .card-rows div {
    padding: 4px 0;
  }
}

@media screen and (min-width: $desktop_BP_min_width) {
  .recap-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
