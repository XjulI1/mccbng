// Configuration globale pour Jest
import { config } from '@vue/test-utils'

// Configuration globale des composants de test
config.global.stubs = {
  // Stub des composants tiers si nécessaire
  'router-link': {
    template: '<a><slot /></a>'
  },
  'router-view': {
    template: '<div><slot /></div>'
  }
}

// Mock des modules externes si nécessaire
global.console = {
  ...console,
  // Désactive les logs pendant les tests si souhaité
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}
