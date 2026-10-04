import { describe, expect, it } from 'vitest'
import { useRouter } from '#imports'
import { routesFixture } from '../fixtures/routes'

// useRouter() exige le contexte Nuxt : appelé au sein de chaque test, pas à la collecte
const getRouter = () => useRouter()

const nameByPath = new Map(routesFixture.map((r) => [r.path, r.name]))

describe('table de routes (contrat de la migration Nuxt)', () => {
  it.each(routesFixture)('résout $sample', (r) => {
    const router = getRouter()
    const resolved = router.resolve(r.sample)

    expect(resolved.matched.length).toBeGreaterThan(0)
    expect(resolved.name).toBe(r.name)
    if (r.path.includes(':id')) {
      expect(resolved.params.id).toBe('12')
    }
  })

  it.each(routesFixture.filter((r) => r.parent))(
    'rend $sample dans son parent $parent',
    (r) => {
      const router = getRouter()
      const resolved = router.resolve(r.sample)

      expect(resolved.matched).toHaveLength(2)
      expect(resolved.matched[0].name).toBe(nameByPath.get(r.parent!))
      expect(resolved.matched[1].name).toBe(r.name)
      expect(resolved.meta.componentName).toBe(r.componentName)
    },
  )

  it.each(routesFixture.filter((r) => !r.parent))(
    'page racine $sample sans parent',
    (r) => {
      const router = getRouter()

      expect(router.resolve(r.sample).matched).toHaveLength(1)
    },
  )

  it.each(routesFixture)('meta disabledTotalHeader de $sample', (r) => {
    const router = getRouter()
    const { meta } = router.resolve(r.sample)

    expect(Boolean(meta.disabledTotalHeader)).toBe(r.disabledTotalHeader)
  })

  it('expose exactement les chemins de la table (ni ajout, ni oubli)', () => {
    const router = getRouter()
    const actual = router
      .getRoutes()
      .map((route) => route.path)
      .sort()
    const expected = routesFixture.map((r) => r.path).sort()

    expect(actual).toEqual(expected)
  })

  it('ne trouve aucune route applicative pour une URL inconnue', () => {
    const router = getRouter()

    expect(router.resolve('/n-existe-pas').matched).toHaveLength(0)
  })
})
