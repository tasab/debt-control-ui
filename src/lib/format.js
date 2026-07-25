// Display helpers. Engine returns Decimal; format at the edge only.
export function money(dec, digits = 2) {
  const n = dec?.toNumber ? dec.toNumber() : Number(dec || 0)
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}
