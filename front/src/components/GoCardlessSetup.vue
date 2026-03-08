<template>
  <div class="gocardless-setup">
    <!-- Status indicator -->
    <div
      v-if="!configured"
      class="gc-alert"
    >
      GoCardless n'est pas configuré. Les variables d'environnement GOCARDLESS_SECRET_ID et GOCARDLESS_SECRET_KEY doivent être définies côté serveur.
    </div>

    <template v-if="configured">
      <!-- Existing requisitions -->
      <div
        v-if="requisitions.length > 0"
        class="gc-section"
      >
        <h4 class="gc-section-title">
          Connexions bancaires
        </h4>
        <div
          v-for="req in requisitions"
          :key="req.requisitionId"
          class="gc-requisition"
        >
          <div class="gc-req-info">
            <span class="gc-req-institution">{{ req.institutionId }}</span>
            <span :class="['gc-req-status', 'status-' + req.status]">{{ statusLabel(req.status) }}</span>
          </div>
          <div class="gc-req-actions">
            <button
              v-if="req.status === 'CR'"
              class="gc-btn gc-btn-primary gc-btn-sm"
              @click="openBankAuth(req)"
            >
              <font-awesome-icon icon="sign-out-alt" />
              Autoriser
            </button>
            <button
              v-if="req.status === 'LN' || req.status === 'CR'"
              class="gc-btn gc-btn-info gc-btn-sm"
              @click="checkStatus(req.requisitionId)"
            >
              <font-awesome-icon icon="redo" />
            </button>
            <button
              class="gc-btn gc-btn-danger gc-btn-sm"
              @click="removeRequisition(req.requisitionId)"
            >
              <font-awesome-icon icon="times-circle" />
            </button>
          </div>
        </div>
      </div>

      <!-- Discovered accounts to link -->
      <div
        v-if="discoveredAccounts.length > 0"
        class="gc-section"
      >
        <h4 class="gc-section-title">
          Comptes découverts
        </h4>
        <div
          v-for="account in discoveredAccounts"
          :key="account.accountId"
          class="gc-discovered"
        >
          <div class="gc-discovered-info">
            <span class="gc-iban">{{ account.iban || 'IBAN inconnu' }}</span>
            <span
              v-if="account.name"
              class="gc-name"
            >{{ account.name }}</span>
          </div>
          <div class="gc-link-form">
            <select
              v-model="accountLinks[account.accountId]"
              class="gc-select"
            >
              <option :value="undefined">
                -- Associer à un compte --
              </option>
              <option
                v-for="compte in accountList"
                :key="compte.IDcompte"
                :value="compte.IDcompte"
              >
                {{ compte.NomCompte }}
              </option>
            </select>
            <button
              class="gc-btn gc-btn-success gc-btn-sm"
              :disabled="!accountLinks[account.accountId]"
              @click="linkDiscoveredAccount(account)"
            >
              Associer
            </button>
          </div>
        </div>
      </div>

      <!-- Linked accounts -->
      <div
        v-if="linkedAccounts.length > 0"
        class="gc-section"
      >
        <h4 class="gc-section-title">
          Comptes synchronisés
        </h4>
        <div
          v-for="la in linkedAccounts"
          :key="la.id"
          class="gc-linked"
        >
          <div class="gc-linked-info">
            <span class="gc-iban">{{ la.iban || la.accountId }}</span>
            <span class="gc-linked-compte">{{ getCompteName(la.IDcompte) }}</span>
            <span
              v-if="la.lastSync"
              class="gc-last-sync"
            >Dernière sync : {{ formatDate(la.lastSync) }}</span>
          </div>
          <div class="gc-linked-actions">
            <button
              class="gc-btn gc-btn-primary gc-btn-sm"
              :disabled="isSyncing(la.IDcompte)"
              @click="syncAccount(la.IDcompte)"
            >
              <font-awesome-icon :icon="isSyncing(la.IDcompte) ? 'redo' : 'redo'" />
              {{ isSyncing(la.IDcompte) ? 'Sync...' : 'Sync' }}
            </button>
            <button
              class="gc-btn gc-btn-danger gc-btn-sm"
              @click="unlinkGocardlessAccount(la.id)"
            >
              <font-awesome-icon icon="times-circle" />
            </button>
          </div>
        </div>
      </div>

      <!-- New connection -->
      <div class="gc-section">
        <h4 class="gc-section-title">
          Nouvelle connexion bancaire
        </h4>
        <button
          class="gc-btn gc-btn-primary"
          :disabled="connecting"
          @click="connectFortuneoBank"
        >
          <font-awesome-icon icon="plus" />
          {{ connecting ? 'Connexion en cours...' : 'Connecter Fortuneo' }}
        </button>
      </div>

      <!-- Sync result notification -->
      <div
        v-if="lastSyncResult"
        class="gc-sync-result"
      >
        <font-awesome-icon icon="check" />
        {{ lastSyncResult.imported }} opération(s) importée(s), {{ lastSyncResult.skipped }} ignorée(s)
        ({{ lastSyncResult.dateFrom }} → {{ lastSyncResult.dateTo }})
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, reactive } from 'vue'
  import { useStore } from 'vuex'

  const store = useStore()

  const configured = computed(() => store.state.gocardless.configured)
  const requisitions = computed(() => store.state.gocardless.requisitions)
  const linkedAccounts = computed(() => store.state.gocardless.linkedAccounts)
  const lastSyncResult = computed(() => store.state.gocardless.lastSyncResult)
  const accountList = computed(() => store.state.compte.accountList)

  const connecting = ref(false)
  const discoveredAccounts = ref<any[]>([])
  const accountLinks = reactive<Record<string, number | undefined>>({})

  const FORTUNEO_INSTITUTION_ID = 'FORTUNEO_FTNOFRP1XXX'

  onMounted(async () => {
    await store.dispatch('fetchGocardlessStatus')
    if (configured.value) {
      await Promise.all([
        store.dispatch('fetchRequisitions'),
        store.dispatch('fetchLinkedAccounts')
      ])

      // Auto-check status for LN requisitions to discover accounts
      for (const req of requisitions.value) {
        if (req.status === 'LN') {
          await checkStatus(req.requisitionId)
        }
      }
    }
  })

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CR: 'Créée',
      GC: 'Consentement donné',
      UA: 'En attente',
      RJ: 'Rejetée',
      SA: 'Suspendue',
      QA: 'Mise en file',
      GA: 'Accordée',
      LN: 'Liée',
      EX: 'Expirée'
    }
    return labels[status] || status
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCompteName = (IDcompte: number) => {
    const compte = accountList.value.find((c: any) => c.IDcompte === IDcompte)
    return compte ? compte.NomCompte : 'Compte #' + IDcompte
  }

  const isSyncing = (IDcompte: number) => {
    return store.getters.isSyncing(IDcompte)
  }

  const connectFortuneoBank = async () => {
    connecting.value = true
    try {
      const redirectUrl = window.location.origin + '/gocardless/callback'
      const result = await store.dispatch('createBankRequisition', {
        institutionId: FORTUNEO_INSTITUTION_ID,
        redirectUrl
      })

      await store.dispatch('fetchRequisitions')

      // Redirect to bank auth
      if (result.link) {
        window.location.href = result.link
      }
    } catch (error: any) {
      alert('Erreur lors de la connexion : ' + (error.response?.data?.error?.message || error.message))
    } finally {
      connecting.value = false
    }
  }

  const openBankAuth = (req: any) => {
    if (req.link) {
      window.location.href = req.link
    }
  }

  const checkStatus = async (requisitionId: string) => {
    try {
      const status = await store.dispatch('checkRequisitionStatus', requisitionId)
      await store.dispatch('fetchRequisitions')

      if (status.accounts && status.accounts.length > 0) {
        // Filter out already linked accounts
        const linked = linkedAccounts.value.map((a: any) => a.accountId)
        const newAccounts = status.accounts.filter(
          (a: any) => !linked.includes(a.accountId)
        )
        if (newAccounts.length > 0) {
          discoveredAccounts.value = newAccounts.map((a: any) => ({
            ...a,
            requisitionId,
            institutionId: status.institutionId
          }))
        }
      }
    } catch (error: any) {
      alert('Erreur lors de la vérification : ' + (error.response?.data?.error?.message || error.message))
    }
  }

  const linkDiscoveredAccount = async (account: any) => {
    const IDcompte = accountLinks[account.accountId]
    if (!IDcompte) return

    try {
      await store.dispatch('linkGocardlessAccount', {
        accountId: account.accountId,
        IDcompte,
        requisitionId: account.requisitionId,
        iban: account.iban,
        institutionId: account.institutionId
      })
      // Remove from discovered
      discoveredAccounts.value = discoveredAccounts.value.filter(
        (a) => a.accountId !== account.accountId
      )
    } catch (error: any) {
      alert('Erreur : ' + (error.response?.data?.error?.message || error.message))
    }
  }

  const syncAccount = async (IDcompte: number) => {
    try {
      await store.dispatch('syncAccountTransactions', IDcompte)
    } catch (error: any) {
      alert('Erreur de synchronisation : ' + (error.response?.data?.error?.message || error.message))
    }
  }

  const removeRequisition = async (requisitionId: string) => {
    if (confirm('Supprimer cette connexion bancaire ?')) {
      await store.dispatch('removeRequisition', requisitionId)
    }
  }

  const unlinkGocardlessAccount = async (id: number) => {
    if (confirm('Dissocier ce compte ?')) {
      await store.dispatch('unlinkGocardlessAccount', id)
    }
  }
</script>

<style lang="scss" scoped>
.gocardless-setup {
  margin-top: var(--spacing-lg);
}

.gc-alert {
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.gc-section {
  margin-bottom: var(--spacing-xl);

  .gc-section-title {
    font-size: 1rem;
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-md) 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.85rem;
  }
}

.gc-requisition,
.gc-discovered,
.gc-linked {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.gc-req-info,
.gc-discovered-info,
.gc-linked-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.gc-req-institution {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.gc-req-status {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 12px;
  width: fit-content;

  &.status-LN {
    background: rgba(40, 167, 69, 0.15);
    color: var(--color-success);
  }
  &.status-CR {
    background: rgba(255, 193, 7, 0.15);
    color: var(--color-warning);
  }
  &.status-EX,
  &.status-RJ {
    background: rgba(220, 53, 69, 0.15);
    color: var(--color-danger);
  }
}

.gc-iban {
  font-family: "Monaco", "Menlo", monospace;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.gc-name,
.gc-linked-compte {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.gc-last-sync {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.gc-req-actions,
.gc-linked-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.gc-link-form {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.gc-select {
  background: var(--bg-glass);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  color: var(--text-primary);
  font-size: 0.85rem;
  min-width: 160px;
}

.gc-btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.gc-btn-sm {
    padding: 5px 10px;
    font-size: 0.8rem;
  }

  &.gc-btn-primary {
    background: linear-gradient(135deg, var(--color-info) 0%, var(--btn-info-hover) 100%);
    color: white;
  }

  &.gc-btn-success {
    background: var(--success-gradient);
    color: white;
  }

  &.gc-btn-danger {
    background: var(--danger-gradient);
    color: white;
  }

  &.gc-btn-info {
    background: rgba(23, 162, 184, 0.15);
    color: var(--color-info);
  }
}

.gc-sync-result {
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid rgba(40, 167, 69, 0.2);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  color: var(--color-success);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

@media (max-width: 768px) {
  .gc-requisition,
  .gc-discovered,
  .gc-linked {
    flex-direction: column;
    align-items: flex-start;
  }

  .gc-link-form {
    width: 100%;
    flex-direction: column;

    .gc-select {
      width: 100%;
    }
  }
}
</style>
