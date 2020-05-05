export const initialState = {
  list: []
}

export const getCategoryName = ({ list }) => {
  return (IDcat) => {
    return list.find(categorie => parseInt(categorie.IDcat) === parseInt(IDcat))
  }
}

export default {
  initialState,
  getCategoryName
}
