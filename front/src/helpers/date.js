export function lastDayOfMonth (year, month) {
  const lastDay = new Date(year, month, 0)
  return lastDay.getDate()
}
