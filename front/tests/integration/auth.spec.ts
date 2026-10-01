import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, type Pinia } from 'pinia'
import { navigateTo, useNuxtApp, useRouter } from '#imports'

vi.mock('@/services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/auth')>()),
  checkUserAuthentification: vi.fn()
}))
vi.mock('@/services/user', () => ({ fetchUser: vi.fn().mockResolvedValue({ id: 'u1' }), updateUser: vi.fn() }))
vi.mock('@/services/operation', () => ({ generateRecurringOperations: vi.fn() }))
vi.mock('@/services/compte', () => ({
  fetchAccountList: vi.fn().mockResolvedValue([]),
  sumAllCompteForUser: vi.fn().mockResolvedValue([])
}))
vi.mock('@/services/category', () => ({ fetchCategoryList: vi.fn().mockResolvedValue([]) }))

const auth = await import('@/services/auth')
const { useUserStore } = await import('@/stores/user')

beforeEach(() => {
  // Le middleware utilise le pinia de l'app Nuxt : on le garde actif et on remet la session à zéro
  setActivePinia(useNuxtApp().$pinia as Pinia)
  auth.removeCookies()
  useUserStore().saveUserToken(null)
  vi.clearAllMocks()
})

describe('cookies de session (useCookie)', () => {
  it('écrit puis relit userToken et userID, y compris après un await', async () => {
    auth.saveCookies({ userToken: 'abc.def', userID: 12 })
    await Promise.resolve()

    expect(auth.getTokenCookie()).toBe('abc.def')
    expect(String(auth.getUserIDCookie())).toBe('12')
  })

  it('relit des cookies posés avant la migration (format universal-cookie)', () => {
    document.cookie = 'userToken=old.jwt.token; path=/'
    document.cookie = 'userID=7; path=/'

    expect(auth.getTokenCookie()).toBe('old.jwt.token')
    expect(String(auth.getUserIDCookie())).toBe('7')
  })

  it('supprime les cookies', () => {
    auth.saveCookies({ userToken: 'abc', userID: 1 })
    auth.removeCookies()

    expect(auth.getTokenCookie()).toBeFalsy()
    expect(auth.getUserIDCookie()).toBeFalsy()
  })
})

describe('middleware d\'authentification global', () => {
  it('redirige vers /login sans cookie', async () => {
    await navigateTo('/stats')

    expect(useRouter().currentRoute.value.path).toBe('/login')
  })

  it('redirige vers /login et conserve la session absente si le token est invalide', async () => {
    auth.saveCookies({ userToken: 'expired', userID: 1 })
    vi.mocked(auth.checkUserAuthentification).mockResolvedValue(false)

    await navigateTo('/stats')

    expect(useRouter().currentRoute.value.path).toBe('/login')
    expect(useUserStore().token).toBeNull()
  })

  it('conserve le lien profond et réhydrate le store quand la session est valide', async () => {
    auth.saveCookies({ userToken: 'good', userID: 1 })
    vi.mocked(auth.checkUserAuthentification).mockResolvedValue(true)

    await navigateTo('/stats')

    expect(useRouter().currentRoute.value.path).toBe('/stats')
    expect(useUserStore().token).toBe('good')
  })

  it('redirige vers /login et supprime la session si le chargement de l\'utilisateur échoue', async () => {
    auth.saveCookies({ userToken: 'good', userID: 1 })
    vi.mocked(auth.checkUserAuthentification).mockResolvedValue(true)
    const { fetchUser } = await import('@/services/user')
    vi.mocked(fetchUser).mockRejectedValueOnce(new Error('HTTP 500'))

    await navigateTo('/config')

    expect(useRouter().currentRoute.value.path).toBe('/login')
    expect(useUserStore().token).toBeNull()
    expect(auth.getTokenCookie()).toBeFalsy()
  })

  it('laisse toujours passer /login', async () => {
    await navigateTo('/login')

    expect(useRouter().currentRoute.value.path).toBe('/login')
    expect(auth.checkUserAuthentification).not.toHaveBeenCalled()
  })
})
