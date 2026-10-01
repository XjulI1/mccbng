// Table de référence capturée depuis src/router.ts avant sa suppression (migration Nuxt).
// Contrat de routage : chemin, nom, parent, componentName (overlays), disabledTotalHeader.
// disabledTotalHeader est la valeur EFFECTIVE (route.meta fusionne la meta du parent) : c'est celle lue par AccountHeader.
export interface RouteFixture {
  path: string
  sample: string
  name: string
  parent?: string
  componentName?: string
  disabledTotalHeader: boolean
}

export const routesFixture: RouteFixture[] = [
  { path: '/', sample: '/', name: 'Home', disabledTotalHeader: false },
  { path: '/newOperation', sample: '/newOperation', name: 'Nouvelle opération', parent: '/', componentName: 'operation-form', disabledTotalHeader: false },
  { path: '/editOperation/:id', sample: '/editOperation/12', name: 'Edition opération', parent: '/', componentName: 'operation-form', disabledTotalHeader: false },
  { path: '/search', sample: '/search', name: 'Search', parent: '/', componentName: 'search', disabledTotalHeader: false },
  { path: '/transfert', sample: '/transfert', name: 'Virement', parent: '/', componentName: 'transfert-form', disabledTotalHeader: false },
  { path: '/retrait', sample: '/retrait', name: 'Retrait', parent: '/', componentName: 'transfert-form', disabledTotalHeader: false },
  { path: '/recurrOperation', sample: '/recurrOperation', name: 'Opérations récurrentes', disabledTotalHeader: true },
  { path: '/newRecurrOperation', sample: '/newRecurrOperation', name: 'Nouvelle opération récurrente', parent: '/recurrOperation', componentName: 'operation-recurrente-form', disabledTotalHeader: true },
  { path: '/editRecurrOperation/:id', sample: '/editRecurrOperation/12', name: 'Edition opération récurrente', parent: '/recurrOperation', componentName: 'operation-recurrente-form', disabledTotalHeader: true },
  { path: '/amortissement', sample: '/amortissement', name: 'Amortissement', disabledTotalHeader: true },
  { path: '/gestion', sample: '/gestion', name: 'Gestion', disabledTotalHeader: true },
  { path: '/comptesGestion', sample: '/comptesGestion', name: 'Mes comptes', disabledTotalHeader: true },
  { path: '/newCompte', sample: '/newCompte', name: 'Nouveau compte', parent: '/comptesGestion', componentName: 'compte-form', disabledTotalHeader: true },
  { path: '/editCompte/:id', sample: '/editCompte/12', name: 'Edition compte', parent: '/comptesGestion', componentName: 'compte-form', disabledTotalHeader: true },
  { path: '/credits', sample: '/credits', name: 'Crédits', disabledTotalHeader: true },
  { path: '/newCredit', sample: '/newCredit', name: 'Nouveau crédit', parent: '/credits', componentName: 'credit-form', disabledTotalHeader: true },
  { path: '/editCredit/:id', sample: '/editCredit/12', name: 'Edition crédit', parent: '/credits', componentName: 'credit-form', disabledTotalHeader: true },
  { path: '/biens', sample: '/biens', name: 'Biens', disabledTotalHeader: true },
  { path: '/newBien', sample: '/newBien', name: 'Nouveau bien', parent: '/biens', componentName: 'bien-form', disabledTotalHeader: true },
  { path: '/editBien/:id', sample: '/editBien/12', name: 'Edition bien', parent: '/biens', componentName: 'bien-form', disabledTotalHeader: true },
  { path: '/stats', sample: '/stats', name: 'Stats', disabledTotalHeader: true },
  { path: '/login', sample: '/login', name: 'Login', disabledTotalHeader: true },
  { path: '/config', sample: '/config', name: 'Config', disabledTotalHeader: true },
  { path: '/editUser', sample: '/editUser', name: 'Mon compte', disabledTotalHeader: true },
]
