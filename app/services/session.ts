import { useCategoryStore } from '@/stores/category'
import { useCompteStore } from '@/stores/compte'
import { useUserStore } from '@/stores/user'

// Charge l'utilisateur, ses comptes et ses catégories une fois la session ouverte (cookie HttpOnly posé par le serveur).
// Les pages et formulaires (liens profonds compris) peuvent ainsi lire les stores dès leur setup.
export const hydrateSession = async (userID: string | number) => {
  useUserStore().openSession()
  const compteStore = useCompteStore()
  await compteStore.fetchUserByIDAndGenerateRecurringOp(userID)
  await Promise.all([compteStore.fetchAccountList(), useCategoryStore().fetchCategoryList()])
}
