import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
const { apiGet, apiPost } = await import('@/services/http')
const { useUserStore } = await import('@/stores/user')

// happy-dom conserve un cookie expiré avec une valeur vide : seul un cookie non vide compte
const hasCookie = (name: string) => document.cookie.split('; ').some(c => c.startsWith(name + '=') && c.length > name.length + 1)

beforeEach(() => {
  // Le middleware utilise le pinia de l'app Nuxt : on le garde actif et on remet la session à zéro
  setActivePinia(useNuxtApp().$pinia as Pinia)
  auth.removeCookies()
  useUserStore().closeSession()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cookies de session', () => {
  it('écrit puis relit userID, y compris après un await ; aucun cookie userToken', async () => {
    auth.saveCookies({ userID: 12 })
    await Promise.resolve()

    expect(String(auth.getUserIDCookie())).toBe('12')
    expect(hasCookie('userToken')).toBe(false)
  })

  it('supprime un ancien cookie userToken (JWT lisible en JS)', () => {
    document.cookie = 'userToken=old.jwt.token; path=/'
    auth.removeLegacyTokenCookie()

    expect(hasCookie('userToken')).toBe(false)
  })

  it('supprime les cookies', () => {
    auth.saveCookies({ userID: 1 })
    auth.removeCookies()

    expect(auth.getUserIDCookie()).toBeFalsy()
  })

  it('login : le JWT n\'est ni renvoyé ni stocké côté front', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ userId: 7 }), { status: 200 })))

    expect(await auth.auth('a@b.c', '123456', '')).toEqual({ userID: 7 })
  })
})

describe('client HTTP', () => {
  it('envoie les cookies et l\'en-tête anti-CSRF, jamais d\'Authorization', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiGet('/api/comptes', { token: 'ignored' })
    await apiPost('/api/comptes', { NomCompte: 'x' })

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.credentials).toBe('same-origin')
      expect(init.headers['X-Requested-With']).toBe('mccbng')
      expect(init.headers.Authorization).toBeUndefined()
    }
  })
})

describe('déconnexion', () => {
  it('appelle POST /api/users/logout puis supprime le cookie userID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    auth.saveCookies({ userID: 3 })

    await auth.logout('')

    expect(fetchMock).toHaveBeenCalledWith('/api/users/logout', expect.objectContaining({ method: 'POST' }))
    expect(auth.getUserIDCookie()).toBeFalsy()
  })

  it('un échec réseau n\'empêche pas la déconnexion locale', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    auth.saveCookies({ userID: 3 })

    await auth.logout('')

    expect(auth.getUserIDCookie()).toBeFalsy()
  })
})

describe('middleware d\'authentification global', () => {
  it('redirige vers /login sans cookie', async () => {
    await navigateTo('/stats')

    expect(useRouter().currentRoute.value.path).toBe('/login')
  })

  it('redirige vers /login et conserve la session absente si la session serveur est invalide', async () => {
    auth.saveCookies({ userID: 1 })
    vi.mocked(auth.checkUserAuthentification).mockResolvedValue(false)

    await navigateTo('/stats')

    expect(useRouter().currentRoute.value.path).toBe('/login')
    expect(useUserStore().token).toBeNull()
  })

  it('conserve le lien profond et réhydrate le store quand la session est valide', async () => {
    auth.saveCookies({ userID: 1 })
    vi.mocked(auth.checkUserAuthentification).mockResolvedValue(true)

    await navigateTo('/stats')

    expect(useRouter().currentRoute.value.path).toBe('/stats')
    expect(useUserStore().token).toBe(true)
  })

  it('supprime un ancien cookie userToken au démarrage', async () => {
    document.cookie = 'userToken=old.jwt.token; path=/'

    // Route différente de la courante, sinon la navigation (et donc le middleware) n'a pas lieu
    await navigateTo('/config')

    expect(hasCookie('userToken')).toBe(false)
  })

  it('redirige vers /login et supprime la session si le chargement de l\'utilisateur échoue', async () => {
    auth.saveCookies({ userID: 1 })
    vi.mocked(auth.checkUserAuthentification).mockResolvedValue(true)
    const { fetchUser } = await import('@/services/user')
    vi.mocked(fetchUser).mockRejectedValueOnce(new Error('HTTP 500'))

    await navigateTo('/config')

    expect(useRouter().currentRoute.value.path).toBe('/login')
    expect(useUserStore().token).toBeNull()
    expect(auth.getUserIDCookie()).toBeFalsy()
  })

  it('laisse toujours passer /login', async () => {
    await navigateTo('/login')

    expect(useRouter().currentRoute.value.path).toBe('/login')
    expect(auth.checkUserAuthentification).not.toHaveBeenCalled()
  })
})
