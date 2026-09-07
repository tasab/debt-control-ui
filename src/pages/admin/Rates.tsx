import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/layout/Section'
import { RowsSkeleton } from '@/components/layout/states'
import { useRates, useSetRate } from '@/lib/hooks'

/**
 * Власні курси обмінника.
 *
 * Виставлений тут курс перемагає стрічку агрегатора й не старіє: для обмінника
 * власні курси і є правда, а стрічка — лише орієнтир. Тому поруч видно, чий
 * курс зараз діє.
 *
 * Оцінка портфеля рахується за серединою між купівлею і продажем — вона
 * показана окремою колонкою, щоб не доводилося рахувати в голові, звідки
 * береться цифра на дашборді.
 */
export function Rates() {
  const rates = useRates()

  return (
    <section className="space-y-3">
      <SectionHeader icon={Coins} title="Курси валют" hint="свій курс важливіший за стрічку" />
      {rates.isLoading && <RowsSkeleton rows={4} />}
      {rates.data && (
        <Card>
          <CardContent className="p-3">
            {/* П’ять колонок із двома полями вводу не стискаються нижче
                приблизно 22rem — на вужчому екрані таблиця возиться вбік,
                замість того щоб ламати рядки посеред курсу. */}
            <div className="no-scrollbar -mx-3 overflow-x-auto px-3">
            <div className="grid min-w-[22rem] grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-x-3 gap-y-2 text-sm">
              <span />
              <span className="text-xs text-muted-foreground">Купівля</span>
              <span className="text-xs text-muted-foreground">Продаж</span>
              <span className="text-right text-xs text-muted-foreground">Середній</span>
              <span />
              {[...rates.data]
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((rate) => (
                  <RateRow key={rate.code} rate={rate} />
                ))}
            </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function RateRow({ rate }) {
  const save = useSetRate()
  const [bid, setBid] = useState(rate.bid)
  const [sell, setSell] = useState(rate.sell)

  // Поля перезаповнюються, коли курс змінили деінде — але не поверх того, що
  // людина зараз набирає: цифри тут короткі, і перезапис на льоту дратує.
  useEffect(() => {
    setBid(rate.bid)
    setSell(rate.sell)
  }, [rate.bid, rate.sell])

  const changed = bid !== rate.bid || sell !== rate.sell
  const valid = /^\d+(\.\d+)?$/.test(bid) && /^\d+(\.\d+)?$/.test(sell)
  const mid = valid ? ((Number(bid) + Number(sell)) / 2).toFixed(3) : '—'

  return (
    <>
      <span className="flex items-center gap-1.5 font-medium">
        {rate.code}
        {!rate.isManual && (
          <Badge variant="outline" className="px-1 py-0 text-[10px] text-muted-foreground">
            стрічка
          </Badge>
        )}
      </span>
      <Input
        value={bid}
        onChange={(event) => setBid(event.target.value)}
        inputMode="decimal"
        className="h-8 tabular-nums"
        aria-label={`Курс купівлі ${rate.code}`}
      />
      <Input
        value={sell}
        onChange={(event) => setSell(event.target.value)}
        inputMode="decimal"
        className="h-8 tabular-nums"
        aria-label={`Курс продажу ${rate.code}`}
      />
      <span className="text-right tabular-nums text-muted-foreground">{mid}</span>
      <Button
        size="sm"
        variant={changed ? 'default' : 'ghost'}
        disabled={!changed || !valid || save.isPending}
        onClick={() => save.mutate({ quote: rate.code, bid, sell })}
      >
        Зберегти
      </Button>
    </>
  )
}
