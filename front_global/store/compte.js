export const initialState = {
  activeAccount: {},
  accountList: [],
  currency: '€'
}

export const filterBloquedAccounts = ({ accountList }) => {
  return accountList.filter((account) => {
    if (account.bloque) {
      return account
    }
  })
}

export const filterAvailableAccounts = ({ accountList }) => {
  return accountList.filter((account) => {
    if (!account.bloque && !account.porte_feuille) {
      return account
    }
  })
}

export const filterPorteFeuilleAccount = ({ accountList }) => {
  return accountList.filter((account) => {
    if (account.porte_feuille) {
      return account
    }
  })
}

export const totalAvailable = (_, { availableCompte, porteFeuilleCompte }) => {
  const availableAndPorteFeuilleAccounts = availableCompte.concat(porteFeuilleCompte)

  return availableAndPorteFeuilleAccounts.reduce((acc, account) => {
    acc += account.solde
    return Math.round(acc * 100) / 100
  }, 0)
}

export const totalGlobal = (_, { bloquedCompte, totalAvailable }) => {
  return bloquedCompte.reduce((acc, account) => {
    acc += account.solde
    return Math.round(acc * 100) / 100
  }, totalAvailable)
}

export const getAccount = ({ accountList }) => {
  return (IDcompte) => {
    return accountList.filter((account) => {
      if (account.IDcompte === parseInt(IDcompte)) {
        return account
      }
    })[0]
  }
}

export const createBaseSoldeIntoEachAccount = (accountList) => {
  return accountList.map((account) => {
    account.base_solde = account.solde

    return account
  })
}

export const setSumAllAccountForUser = (accountList, sumList) => {
  return accountList.map((account, index) => {
    const sum = sumList.filter(sum => sum.IDCompte === account.IDcompte)

    if (sum[0]) {
      const account = accountList[index]

      account.base_solde += sum[0].TotalChecked + (sum[0].TotalNotChecked || 0)
      account.base_solde = Math.round(account.base_solde * 100) / 100

      account.solde = account.base_solde
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
  createBaseSoldeIntoEachAccount,
  setSumAllAccountForUser
}
