// Configuration globale pour Jest

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
