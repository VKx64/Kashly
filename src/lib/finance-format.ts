export function formatCurrency(amount: number, currency: string) {
  const formatted = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(Math.abs(amount))

  return amount < 0 ? `-${formatted}` : formatted
}

export function formatSignedCurrency(
  amount: number,
  currency: string,
  sign: 'positive' | 'negative' | 'neutral',
) {
  const formatted = formatCurrency(amount, currency)

  if (sign === 'positive') return `+${formatted}`
  if (sign === 'negative') return `-${formatted}`
  return formatted
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatOptionLabel(value: string) {
  return value.replaceAll('_', ' ')
}
