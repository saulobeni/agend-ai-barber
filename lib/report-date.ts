export function getDefaultReportDateRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const format = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return { startDate: format(start), endDate: format(end) }
}

export function formatReportPeriodLabel(startDate: string, endDate: string): string {
  const fmt = (value: string) => {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }

  return `${fmt(startDate)} a ${fmt(endDate)}`
}
