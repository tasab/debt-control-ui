import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrencies } from '@/lib/hooks'

export const ALL_CURRENCIES = '__all__'

/** Currency list comes from GET /currencies — never a hardcoded array. */
export function CurrencySelect({ value, onChange, id, className, only, includeAll = false }) {
  const { data: currencies = [] } = useCurrencies()
  const options = only ? currencies.filter((c) => only.includes(c.code)) : currencies

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder="Валюта" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value={ALL_CURRENCIES}>Усі валюти</SelectItem>}
        {options.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <span className="font-medium">{currency.code}</span>
            <span className="ml-2 text-muted-foreground">{currency.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
