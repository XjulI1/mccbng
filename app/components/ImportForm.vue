<template>
  <div class="import-form">
    <div
      class="form-card"
      :class="{ review: step === 'revue' && done === undefined }"
    >
      <h2 class="form-title">
        Importer des opérations
      </h2>

      <!-- Résultat de la validation -->
      <div
        v-if="done !== undefined"
        class="done"
        role="status"
      >
        {{ done }} opération{{ done > 1 ? 's' : '' }} créée{{ done > 1 ? 's' : '' }}.
      </div>

      <!-- Étape 1 : sources -->
      <template v-else-if="step === 'saisie'">
        <div
          v-if="brouillons.length"
          class="brouillons"
        >
          <p class="form-label">
            Imports non validés
          </p>
          <button
            v-for="brouillon in brouillons"
            :key="brouillon.IDimport"
            type="button"
            class="brouillon"
            @click="reprendre(brouillon.IDimport)"
          >
            <span>{{ brouillon.NomCompte ?? 'Compte supprimé' }} · {{ brouillon.nbLignes }} ligne{{ brouillon.nbLignes > 1 ? 's' : '' }}</span>
            <span class="muted">{{ formatDate(brouillon.DateCreation) }} · Reprendre</span>
          </button>
        </div>

        <div class="form-group">
          <label
            for="import-compte"
            class="form-label"
          >Compte</label>
          <select
            id="import-compte"
            v-model="IDcompte"
            class="form-select"
          >
            <option
              v-for="account in visibleAccounts"
              :key="'import-compte-' + account.IDcompte"
              :value="account.IDcompte"
            >
              {{ account.NomCompte }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <span class="form-label">Photos ou vidéo</span>
          <div class="source-buttons">
            <label class="btn btn-secondary">
              <font-awesome-icon icon="camera" />
              Photos
              <input
                type="file"
                accept="image/*"
                multiple
                class="visually-hidden"
                :disabled="busy"
                @change="addPhotos"
              >
            </label>
            <label class="btn btn-secondary">
              <font-awesome-icon icon="video" />
              Vidéo
              <input
                type="file"
                accept="video/*"
                class="visually-hidden"
                :disabled="busy"
                @change="addVideo"
              >
            </label>
          </div>

          <ul
            v-if="sources.length"
            class="sources"
          >
            <li
              v-for="source in sources"
              :key="source.id"
              class="source"
            >
              <span>
                <font-awesome-icon :icon="source.kind === 'video' ? 'video' : 'camera'" />
                {{ source.name }}
                <span class="muted">
                  · {{ source.pending ? 'préparation…' : `${source.images.length} image${source.images.length > 1 ? 's' : ''}` }}
                </span>
              </span>
              <button
                type="button"
                class="link"
                :aria-label="'Retirer ' + source.name"
                :disabled="busy"
                @click="removeSource(source.id)"
              >
                Retirer
              </button>
            </li>
          </ul>
          <p
            v-if="imageCount > MAX_IMAGES"
            class="error"
          >
            {{ imageCount }} images : 20 au plus par import. Retirez une source.
          </p>
          <p
            v-for="notice in notices"
            :key="notice"
            class="muted"
          >
            {{ notice }}
          </p>
        </div>

        <div class="form-group">
          <label
            for="import-texte"
            class="form-label"
          >Texte collé</label>
          <textarea
            id="import-texte"
            v-model="texte"
            class="form-input"
            rows="5"
            maxlength="20000"
            placeholder="Collez ici des lignes de relevé copiées depuis le site de votre banque"
          />
        </div>

        <p class="muted warning">
          Les images et le texte sont envoyés à un service d'IA externe (Anthropic) pour être lus. Ils ne sont pas conservés par l'application.
        </p>

        <p
          v-if="error"
          class="error"
          role="alert"
        >
          {{ error }}
        </p>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!canExtract"
            @click="extraire"
          >
            {{ busy ? 'Analyse en cours…' : 'Analyser' }}
          </button>
        </div>
      </template>

      <!-- Étape 2 : revue -->
      <template v-else>
        <div class="review-header">
          <span class="review-account">{{ compteName }}</span>
          <button
            type="button"
            class="link danger"
            :disabled="busy"
            @click="abandonner"
          >
            Abandonner l'import
          </button>
        </div>

        <!-- En-tête de colonnes (tableau sur desktop / tablette) -->
        <div class="rows-head">
          <input
            type="checkbox"
            class="row-check"
            :checked="allChecked"
            :indeterminate="summary.count > 0 && !allChecked"
            aria-label="Tout cocher"
            @change="setAll(($event.target as HTMLInputElement).checked)"
          >
          <div class="head-cols">
            <span class="head-all">Tout sélectionner</span>
            <span class="head-date">Date</span>
            <span class="head-name">Libellé</span>
            <span class="head-cat">Catégorie</span>
            <span class="head-amount">Montant</span>
          </div>
        </div>

        <ul class="import-rows">
          <li
            v-for="row in rows"
            :key="row.key"
            class="import-row"
            :class="{ attention: needsAttention(row), unchecked: !row.checked, invalid: row.checked && !isRowValid(row), open: editing === row.key }"
          >
            <!-- Lecture ; un toucher ouvre l'édition -->
            <div class="row-line">
              <input
                v-model="row.checked"
                type="checkbox"
                class="row-check"
                :aria-label="'Importer ' + row.NomOp"
              >
              <div
                class="row-summary"
                role="button"
                tabindex="0"
                :aria-expanded="editing === row.key"
                @click="toggleEdit(row.key)"
                @keydown.enter.prevent="toggleEdit(row.key)"
                @keydown.space.prevent="toggleEdit(row.key)"
              >
                <span class="row-date">{{ formatShortDate(row.DateOp) }}</span>
                <span class="row-name">{{ row.NomOp || 'Sans libellé' }}</span>
                <span
                  class="row-amount"
                  :class="amountClass(row)"
                >{{ formatAmount(row) }}</span>
                <span class="row-cat">{{ categoryName(row.IDcat) }}</span>
                <span class="row-meta">{{ formatShortDate(row.DateOp) }} · {{ categoryName(row.IDcat) }}</span>
                <span
                  v-if="canRestoreSource(row)"
                  class="row-source"
                >{{ row.LibelleSource }}</span>
                <span
                  v-if="row.doublon"
                  class="row-badge"
                >⚠ Déjà saisie ? {{ row.doublon.NomOp }}, {{ formatDate(row.doublon.DateOp) }}, {{ amountFormat.format(row.doublon.MontantOp) }}</span>
                <span
                  v-else-if="row.DoublonLot"
                  class="row-badge"
                >⚠ En double dans cet import</span>
                <span
                  v-if="row.Confiance === 'faible'"
                  class="row-badge"
                >⚠ Lecture incertaine : vérifiez date et montant</span>
              </div>
            </div>

            <!-- Édition -->
            <div
              v-if="editing === row.key"
              class="row-edit"
            >
              <label class="field field-name">
                <span class="field-label">Libellé</span>
                <input
                  v-model="row.NomOp"
                  type="text"
                  class="form-input"
                >
              </label>
              <label class="field field-date">
                <span class="field-label">Date</span>
                <input
                  v-model="row.DateOp"
                  type="date"
                  class="form-input"
                >
              </label>
              <label class="field field-amount">
                <span class="field-label">Montant</span>
                <input
                  v-model="row.MontantOp"
                  type="text"
                  inputmode="decimal"
                  class="form-input"
                >
              </label>
              <label class="field field-cat">
                <span class="field-label">Catégorie</span>
                <select
                  v-model="row.IDcat"
                  class="form-select"
                >
                  <option :value="0">
                    Aucune
                  </option>
                  <option
                    v-for="category in categories"
                    :key="'import-cat-' + category.IDcat"
                    :value="category.IDcat"
                  >
                    {{ category.Nom }}
                  </option>
                </select>
              </label>
              <div class="edit-actions">
                <span
                  v-if="canRestoreSource(row)"
                  class="field-hint"
                >
                  Relevé : {{ row.LibelleSource }}
                  <button
                    type="button"
                    class="link"
                    @click="row.NomOp = row.LibelleSource!"
                  >
                    Reprendre
                  </button>
                </span>
                <span class="edit-buttons">
                  <button
                    type="button"
                    class="link danger"
                    @click="removeRow(row.key)"
                  >
                    Supprimer
                  </button>
                  <button
                    type="button"
                    class="link"
                    @click="editing = null"
                  >
                    Fermer
                  </button>
                </span>
              </div>
            </div>
          </li>
        </ul>

        <button
          type="button"
          class="link add"
          @click="addRow"
        >
          + Ajouter une ligne
        </button>
        <p class="muted">
          Fermer cette fenêtre conserve l'import pour plus tard.
        </p>

        <!-- Barre d'action toujours visible -->
        <div class="review-footer">
          <div class="footer-summary">
            <span>{{ summary.count }} / {{ rows.length }} ligne{{ rows.length > 1 ? 's' : '' }}</span>
            <strong :class="summary.total < 0 ? 'negative' : 'positive'">{{ amountFormat.format(summary.total) }}</strong>
          </div>
          <p
            v-if="error"
            class="error"
            role="alert"
          >
            {{ error }}
          </p>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="busy || summary.count === 0 || summary.invalid > 0"
            @click="valider"
          >
            Valider ({{ summary.count }})
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from '#imports'
  import {
    abandonnerLot, createLot, fetchBrouillons, fetchLot, importErrorMessage, validerLot,
    type BrouillonImport, type LotImport, type SourceImport
  } from '@/services/imports'
  import { useCategoryStore } from '@/stores/category'
  import { useCompteStore } from '@/stores/compte'
  import { normalizeImageFile, type NormalizedImage } from '@/utils/imageNormalize'
  import {
    canRestoreSource, emptyRow, isRowValid, needsAttention, rowsFromLot, selectionSummary, toLignesValidees, type ReviewRow
  } from '@/utils/importReview'
  import { extractVideoFrames, MAX_FRAMES } from '@/utils/videoFrames'

  interface Source { id: number; kind: 'photo' | 'video'; name: string; images: NormalizedImage[]; pending: boolean }

  const MAX_IMAGES = MAX_FRAMES

  const router = useRouter()
  const compteStore = useCompteStore()
  const categoryStore = useCategoryStore()

  const step = ref<'saisie' | 'revue'>('saisie')
  const IDcompte = ref<number | undefined>(compteStore.activeAccount?.IDcompte)
  const texte = ref('')
  const sources = ref<Source[]>([])
  const notices = ref<string[]>([])
  const brouillons = ref<BrouillonImport[]>([])
  const lot = ref<LotImport>()
  const rows = ref<ReviewRow[]>([])
  const busy = ref(false)
  const error = ref('')
  const done = ref<number>()
  let nextSourceId = 0

  const visibleAccounts = computed(() => compteStore.visibleAccounts)
  const categories = computed(() => categoryStore.list.filter(category => Number(category.IDcat) !== 0))
  const compteName = computed(() => compteStore.getAccount(lot.value?.IDcompte)?.NomCompte ?? '')
  const imageCount = computed(() => sources.value.reduce((n, source) => n + source.images.length, 0))
  const canExtract = computed(() =>
    !busy.value && IDcompte.value !== undefined && imageCount.value <= MAX_IMAGES &&
    !sources.value.some(source => source.pending) && (imageCount.value > 0 || texte.value.trim().length > 0)
  )
  const summary = computed(() => selectionSummary(rows.value))
  const allChecked = computed(() => rows.value.length > 0 && rows.value.every(row => row.checked))

  const formatDate = (value: string) => new Date(value).toLocaleDateString('fr-FR')

  const addSource = async (kind: Source['kind'], name: string, load: () => Promise<NormalizedImage[]>) => {
    const source: Source = { id: ++nextSourceId, kind, name, images: [], pending: true }
    sources.value.push(source)
    try {
      const images = await load()
      const current = sources.value.find(s => s.id === source.id)
      if (current) Object.assign(current, { images, pending: false })
    } catch (e) {
      sources.value = sources.value.filter(s => s.id !== source.id)
      notices.value.push((e as Error).message)
    }
  }

  const addPhotos = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = [...(input.files ?? [])]
    input.value = ''
    await Promise.all(files.map(file => addSource('photo', file.name, async () => [await normalizeImageFile(file)])))
  }

  const addVideo = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    const restant = Math.max(1, MAX_IMAGES - imageCount.value)
    await addSource('video', file.name, async () => {
      const { images, espacees } = await extractVideoFrames(file, restant)
      if (espacees) notices.value.push(`Vidéo « ${file.name} » longue : ${images.length} images espacées ont été retenues.`)
      return images
    })
  }

  const removeSource = (id: number) => {
    sources.value = sources.value.filter(source => source.id !== id)
  }

  const sourceKind = (): SourceImport | undefined => {
    const kinds = new Set(sources.value.map(source => source.kind))
    if (texte.value.trim() && kinds.size) return 'mixte'
    if (kinds.size > 1) return 'mixte'
    if (kinds.has('video')) return 'video'
    return undefined
  }

  const openLot = (value: LotImport) => {
    lot.value = value
    rows.value = rowsFromLot(value)
    step.value = 'revue'
  }

  const run = async (action: () => Promise<void>) => {
    busy.value = true
    error.value = ''
    try {
      await action()
    } catch (e) {
      error.value = importErrorMessage(e)
    } finally {
      busy.value = false
    }
  }

  const extraire = () => run(async () => {
    const images = sources.value.flatMap(source => source.images)
    openLot(await createLot({ IDcompte: IDcompte.value!, texte: texte.value.trim() || undefined, images, Source: sourceKind() }))
  })

  const reprendre = (IDimport: number) => run(async () => openLot(await fetchLot(IDimport)))

  const setAll = (checked: boolean) => rows.value.forEach((row) => { row.checked = checked })
  const removeRow = (key: string) => { rows.value = rows.value.filter(row => row.key !== key) }

  // Une seule ligne en édition à la fois
  const editing = ref<string | null>(null)
  const toggleEdit = (key: string) => { editing.value = editing.value === key ? null : key }
  const addRow = () => {
    const row = emptyRow()
    rows.value.push(row)
    editing.value = row.key
  }

  const amountOf = (row: ReviewRow) => Number(String(row.MontantOp).replace(',', '.'))
  const amountFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
  const formatAmount = (row: ReviewRow) => (Number.isFinite(amountOf(row)) ? amountFormat.format(amountOf(row)) : 'Montant ?')
  const amountClass = (row: ReviewRow) => (amountOf(row) < 0 ? 'negative' : 'positive')
  const formatShortDate = (iso: string) =>
    (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : 'Date ?')
  const categoryName = (IDcat: number) =>
    (Number(IDcat) === 0 ? 'Sans catégorie' : categoryStore.getCategoryName(IDcat)?.Nom ?? 'Sans catégorie')

  const close = () => router.push('/operations')

  const valider = () => run(async () => {
    const result = await validerLot(lot.value!.IDimport, toLignesValidees(rows.value))
    // Opérations et soldes du compte importé (devient le compte actif)
    compteStore.fetchActiveAccount(lot.value!.IDcompte)
    done.value = result.count
    setTimeout(close, 1500)
  })

  const abandonner = () => {
    if (!window.confirm('Abandonner cet import ? Les lignes extraites seront supprimées.')) return
    run(async () => {
      await abandonnerLot(lot.value!.IDimport)
      close()
    })
  }

  onMounted(async () => {
    categoryStore.fetchCategoryList()
    try {
      brouillons.value = await fetchBrouillons()
    } catch { /* liste facultative */ }
  })
</script>

<style scoped>
.import-form {
  margin: -1rem;
  padding: var(--spacing-lg);
}

/* Saisie : formulaire étroit ; revue : toute la largeur de l'overlay */
.form-card:not(.review) {
  max-width: 600px;
  margin: 0 auto;
}

.form-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-xl);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
}

.form-title {
  font-size: 1.6rem;
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-lg);
  text-align: center;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.form-group {
  margin-bottom: var(--spacing-xl);
}

.form-label {
  display: block;
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.6rem var(--spacing-md, 0.75rem);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--border-color-focus);
  box-shadow: var(--input-focus-shadow);
}

textarea.form-input {
  resize: vertical;
  font-family: inherit;
}

.muted {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.warning {
  margin-bottom: var(--spacing-lg);
}

.error {
  color: var(--color-danger, #e53e3e);
  font-size: var(--font-size-sm);
}

.done {
  text-align: center;
  font-size: 1.1rem;
  padding: var(--spacing-xl) 0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.source-buttons,
.form-actions {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.form-actions {
  margin: var(--spacing-xl) 0 var(--spacing-sm);
}

.btn {
  position: relative;
  padding: 0.75rem var(--spacing-xl);
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary-gradient);
  flex: 1;
}

.btn-secondary {
  background: var(--neutral-gradient);
}

.btn-warning {
  background: var(--warning-gradient);
}

.link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.brouillons {
  margin-bottom: var(--spacing-xl);
}

.brouillon {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-md, 0.75rem);
  margin-bottom: var(--spacing-sm);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.sources,
.import-rows {
  list-style: none;
  padding: 0;
  margin: var(--spacing-md, 0.75rem) 0 0;
}

.source {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.review-account {
  font-weight: var(--font-weight-semibold);
}

.negative {
  color: var(--color-danger);
}

.positive {
  color: var(--color-success);
}

/* Lignes : grille mobile (libellé | montant / date · catégorie / relevé / alertes) */
/* Même géométrie que .import-row / .row-line (bordure 1px, marge interne, écart) pour aligner les colonnes */
.rows-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-md) var(--spacing-sm);
  border: 1px solid transparent;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.head-cols {
  flex: 1;
  min-width: 0;
}

.head-cols span:not(.head-all) {
  display: none;
}

.import-row {
  position: relative;
  margin-bottom: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  color: var(--text-primary);
  overflow: hidden;
}

/* Liseré d'alerte sans artefact de bordure */
.import-row.attention {
  box-shadow: inset 4px 0 0 var(--color-warning);
}

.import-row.invalid {
  box-shadow: inset 4px 0 0 var(--color-danger);
}

.import-row.open {
  border-color: var(--color-primary);
}

.import-row.unchecked .row-summary > :not(.row-badge) {
  opacity: 0.45;
}

.row-line {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.row-check {
  width: 1.2rem;
  height: 1.2rem;
  margin: 2px 0 0;
  flex-shrink: 0;
  accent-color: var(--color-primary);
}

.row-summary {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'name amount'
    'meta meta'
    'source source';
  column-gap: var(--spacing-md);
  row-gap: 2px;
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
}

.row-summary:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
}

.row-summary > span {
  min-width: 0;
}

.row-name {
  grid-area: name;
  font-weight: var(--font-weight-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-amount {
  grid-area: amount;
  justify-self: end;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.row-date,
.row-cat {
  display: none;
}

.row-meta {
  grid-area: meta;
}

.row-meta,
.row-source,
.row-cat,
.row-date {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-source {
  grid-area: source;
  opacity: 0.75;
}

.row-badge {
  grid-column: 1 / -1;
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-warning);
}

/* Édition */
.row-edit {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'name name'
    'date amount'
    'cat cat'
    'actions actions';
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.field-name { grid-area: name; }
.field-date { grid-area: date; }
.field-amount { grid-area: amount; }
.field-cat { grid-area: cat; }

.field-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.edit-actions {
  grid-area: actions;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
}

.field-hint {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.edit-buttons {
  display: flex;
  gap: var(--spacing-sm);
  margin-left: auto;
}

.link.danger {
  color: var(--color-danger);
}

.add {
  margin: var(--spacing-sm) 0;
}

/* Barre d'action collée en bas de l'overlay */
.review-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm) var(--spacing-lg);
  margin: var(--spacing-lg) calc(-1 * var(--spacing-lg)) calc(-1 * var(--spacing-lg));
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  background: var(--bg-card);
  color: var(--text-primary);
}

.footer-summary {
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.footer-summary strong {
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
}

.review-footer .btn {
  flex: 0 1 16rem;
  padding: 0.7rem var(--spacing-xl);
}

.review-footer .error {
  flex-basis: 100%;
  order: -1;
  margin: 0;
}

@media (max-width: 767px) {
  .form-card {
    padding: var(--spacing-lg);
  }

  .form-title {
    font-size: 1.3rem;
  }

  /* Barre du bas : résumé sur une ligne, bouton centré dessous */
  .review-footer {
    flex-direction: column;
    justify-content: center;
  }

  .footer-summary {
    flex-direction: row;
    align-items: baseline;
    gap: var(--spacing-sm);
  }

  .review-footer .btn {
    flex: none;
    width: 100%;
    max-width: 20rem;
  }
}

/* Desktop / tablette : tableau */
@media (min-width: 768px) {
  .head-cols,
  .row-summary {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr) 12rem 7.5rem;
    column-gap: var(--spacing-lg);
  }

  .head-cols {
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.75rem;
  }

  .head-cols span:not(.head-all) {
    display: block;
  }

  .head-all {
    display: none;
  }

  .head-amount {
    text-align: right;
  }

  .review-footer .btn {
    flex-basis: 20rem;
  }

  .row-summary {
    grid-template-areas:
      'date name cat amount'
      'date source cat amount'
      'date badge badge badge';
    align-items: baseline;
  }

  .row-date {
    display: block;
    grid-area: date;
    color: var(--text-secondary);
  }

  .row-cat {
    display: block;
    grid-area: cat;
    color: var(--text-secondary);
  }

  .row-meta {
    display: none;
  }

  .row-badge {
    grid-column: 2 / -1;
  }

  .row-edit {
    grid-template-columns: minmax(0, 2fr) 10rem 8rem minmax(0, 1.2fr);
    grid-template-areas:
      'name date amount cat'
      'actions actions actions actions';
    padding-left: calc(1.2rem + 2 * var(--spacing-md));
  }
}
</style>
