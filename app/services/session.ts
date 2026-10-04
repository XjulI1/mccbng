import { useCategoryStore } from '@/stores/category'
import { useCompteStore } from '@/stores/compte'
import { useUserStore } from '@/stores/user'

// Charge l'utilisateur, ses comptes et ses catégories une fois le token enregistré dans le store.
// Les pages et formulaires (liens profonds compris) peuvent ainsi lire les stores dès leur setup.
export const hydrateSession = async (userToken: string, userID: string | number) => {
  useUserStore().saveUserToken(userToken)
  const compteStore = useCompteStore()
  await compteStore.fetchUserByIDAndGenerateRecurringOp(userID)
  await Promise.all([compteStore.fetchAccountList(), useCategoryStore().fetchCategoryList()])
}
