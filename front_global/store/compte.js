export const initialState = {
  activeAccount: {},
  accountList: [],
  currency: "€"
}

export const filterBloquedAccounts = (_, { visibleAccounts }) => {
  return visibleAccounts.filter((account) => {
    if (account.bloque) {
      return account
    }
  })
}

export const filterAvailableAccounts = (_, { visibleAccounts }) => {
  return visibleAccounts.filter((account) => {
    if (!account.bloque && !account.porte_feuille) {
      return account
    }
  })
}

export const filterPorteFeuilleAccount = (_, { visibleAccounts }) => {
  return visibleAccounts.filter((account) => {
    if (account.porte_feuille) {
      return account
    }
  })
}

export const totalAvailable = (_, { availableCompte, porteFeuilleCompte }) => {
  const availableAndPorteFeuilleAccounts = availableCompte.concat(porteFeuilleCompte)

  return availableAndPorteFeuilleAccounts.reduce((acc, account) => {
    acc += account.soldeNotChecked
    return Math.round(acc * 100) / 100
  }, 0)
}

export const totalGlobal = (_, { bloquedCompte, totalAvailable }) => {
  return bloquedCompte.reduce((acc, account) => {
    acc += account.soldeNotChecked
    return Math.round(acc * 100) / 100
  }, totalAvailable)
}

export const getAccount = ({ accountList }) => {
  return (IDcompte) => {
    return accountList.find(account => account.IDcompte === parseInt(IDcompte))
  }
}

export const visibleAccounts = ({ accountList }) => {
  return accountList.filter((account) => {
    if (account.visible) {
      return account
    }
  })
}

export const calcActiveAccountBalances = (activeAccount, { TotalChecked, TotalNotChecked }) => {
  TotalChecked = parseFloat(TotalChecked || 0)
  TotalNotChecked = parseFloat(TotalNotChecked || 0)

  return {
    ...activeAccount,
    soldeChecked: Math.round(TotalChecked * 100) / 100,
    soldeNotChecked: Math.round((TotalChecked + TotalNotChecked) * 100) / 100
  }
}

export const setSumAllAccountForUser = (accountList, sumList) => {
  return accountList.map((account) => {
    const sum = sumList.filter(sum => sum.IDCompte === account.IDcompte)

    if (sum[0]) {
      account = calcActiveAccountBalances(account, {
        TotalChecked: sum[0].TotalChecked,
        TotalNotChecked: sum[0].TotalNotChecked
      })
    }

    return account
  })
}

export const updateSoldeInAccountList = (accountList, IDcompte, solde) => {
  return accountList.map((account) => {
    if (account.IDcompte === IDcompte) {
      account.soldeNotChecked = solde
    }
    return account
  })
}

export default {
  initialState,
  filterBloquedAccounts,
  filterAvailableAccounts,
  filterPorteFeuilleAccount,
  totalAvailable,
  totalGlobal,
  getAccount,
  setSumAllAccountForUser,
  calcActiveAccountBalances,
  updateSoldeInAccountList,
  visibleAccounts
}
