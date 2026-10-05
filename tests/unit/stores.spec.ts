import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/operation', () => ({
  fetchOperationsForAccount: vi.fn(),
  fetchSearchOperations: vi.fn(),
  generateRecurringOperations: vi.fn(),
  updateOperation: vi.fn(),
  deleteOperation: vi.fn(),
  fetchRecurrOperation: vi.fn(),
  fetchOperations: vi.fn(),
  MAX_LIST_LIMIT: 1000,
  updateRecurringOperation: vi.fn(),
  deleteRecurringOperation: vi.fn()
}))
vi.mock('@/services/category', () => ({ fetchCategoryList: vi.fn() }))

const { fetchOperationsForAccount } = await import('@/services/operation')
const { fetchCategoryList } = await import('@/services/category')
const { useCompteStore } = await import('@/stores/compte')
const { useOperationStore } = await import('@/stores/operation')
const { useCategoryStore } = await import('@/stores/category')
const { useUserStore } = await import('@/stores/user')

const makeOperations = (count: number, start = 0) =>
  Array.from({ length: count }, (_, i) => ({ IDop: start + i }))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('store compte', () => {
  const accounts = [
    { IDcompte: 1, visible: true, soldeNotChecked: 100.1 },
    { IDcompte: 2, visible: true, bloque: true, soldeNotChecked: 200 },
    { IDcompte: 3, visible: true, bloque: true, retraite: true, soldeNotChecked: 300 },
    { IDcompte: 4, visible: true, porte_feuille: true, soldeNotChecked: 50.2 },
    { IDcompte: 5, visible: true, bloque: true, joint: true, soldeNotChecked: 25 },
    { IDcompte: 6, visible: true, bloque: true, children: true, soldeNotChecked: 10 },
    { IDcompte: 7, visible: false, soldeNotChecked: 9999 }
  ]

  it('classe les comptes visibles par type', () => {
    const compte = useCompteStore()
    compte.setAccountList(accounts)

    expect(compte.visibleAccounts).toHaveLength(6)
    expect(compte.availableCompte.map(a => a.IDcompte)).toEqual([1])
    expect(compte.porteFeuilleCompte.map(a => a.IDcompte)).toEqual([4])
    expect(compte.bloquedCompte.map(a => a.IDcompte)).toEqual([2])
    expect(compte.retraiteCompte.map(a => a.IDcompte)).toEqual([3])
    expect(compte.jointCompte.map(a => a.IDcompte)).toEqual([5])
    expect(compte.childrenCompte.map(a => a.IDcompte)).toEqual([6])
  })

  it('calcule les totaux arrondis à 2 décimales', () => {
    const compte = useCompteStore()
    compte.setAccountList(accounts)

    expect(compte.totalAvailable).toBe(150.3)
    expect(compte.totalGlobal).toBe(375.3)
    expect(compte.totalRetraite).toBe(300)
    expect(compte.totalJoint).toBe(25)
    expect(compte.totalChildren).toBe(10)
  })

  it('retrouve un compte par identifiant (chaîne ou nombre)', () => {
    const compte = useCompteStore()
    compte.setAccountList(accounts)

    expect(compte.getAccount('2')?.IDcompte).toBe(2)
    expect(compte.getAccount(4)?.IDcompte).toBe(4)
    expect(compte.getAccount(42)).toBeUndefined()
  })
})

describe('store operation (pagination par 35)', () => {
  it('charge 35 opérations puis la page suivante jusqu\'à épuisement', async () => {
    useUserStore().openSession()
    useCompteStore().setActiveAccount({ IDcompte: 1 })
    const operation = useOperationStore()
    vi.mocked(fetchOperationsForAccount)
      .mockResolvedValueOnce(makeOperations(35))
      .mockResolvedValueOnce(makeOperations(10, 35))

    operation.fetchOperationsOfActiveAccount()
    await vi.waitFor(() => expect(operation.isLoadingOperations).toBe(false))

    expect(operation.operationsOfActiveAccount).toHaveLength(35)
    expect(operation.hasMoreOperations).toBe(true)
    expect(operation.operationsSkip).toBe(35)
    expect(fetchOperationsForAccount).toHaveBeenLastCalledWith(1, true, '', 0, 35)

    await operation.loadMoreOperations()

    expect(operation.operationsOfActiveAccount).toHaveLength(45)
    expect(operation.hasMoreOperations).toBe(false)
    expect(fetchOperationsForAccount).toHaveBeenLastCalledWith(1, true, '', 35, 35)

    await operation.loadMoreOperations()

    expect(fetchOperationsForAccount).toHaveBeenCalledTimes(2)
  })
})

describe('store user', () => {
  it('bascule le masquage des montants', () => {
    const user = useUserStore()

    expect(user.maskAmount).toBe(false)
    user.toggleMaskAmount()
    expect(user.maskAmount).toBe(true)
    user.toggleMaskAmount()
    expect(user.maskAmount).toBe(false)
  })
})

describe('store category', () => {
  it('ne recharge pas les catégories déjà chargées', () => {
    const category = useCategoryStore()
    category.setCategoryList([{ IDcat: 1, Nom: 'a' }, { IDcat: 2, Nom: 'b' }])

    category.fetchCategoryList()

    expect(fetchCategoryList).not.toHaveBeenCalled()
    expect(category.getCategoryName('2')?.Nom).toBe('b')
  })

  it('charge les catégories quand la liste est vide', () => {
    vi.mocked(fetchCategoryList).mockResolvedValue([])

    useCategoryStore().fetchCategoryList()

    expect(fetchCategoryList).toHaveBeenCalledTimes(1)
  })
})
