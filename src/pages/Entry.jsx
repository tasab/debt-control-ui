import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  blankSnapshot,
  emptyPerson,
  saveSnapshot,
  useCurrencies,
  usePeople,
  useSnapshots,
} from '../lib/store'
import { today } from '../lib/format'
import { validateSnapshot } from '../lib/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Controlled data-entry form. RHF + Zod are installed for stricter validation
// later; the base keeps a plain controlled model so the shape stays obvious.
export default function Entry() {
  const navigate = useNavigate()
  const snapshots = useSnapshots()
  const { people: roster } = usePeople()
  const { currencies, rateCurrencies, codes, rateCodes } = useCurrencies()
  const [date, setDate] = useState(today())
  const [snap, setSnap] = useState(() => snapshots[today()] ?? blankSnapshot(today()))
  // Tracks whether the user has edited the form, so async-loaded data never
  // clobbers in-progress input.
  const dirty = useRef(false)

  function loadDate(nextDate) {
    setDate(nextDate)
    dirty.current = false
    setSnap(snapshots[nextDate] ?? blankSnapshot(nextDate, roster))
  }

  // When snapshots/roster finish loading, sync the pristine form to the server:
  // load an existing snapshot for this date, or prefill a new one from the
  // roster. Skipped once the user starts editing.
  useEffect(() => {
    if (dirty.current) return
    setSnap(snapshots[date] ?? blankSnapshot(date, roster))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, snapshots, roster])

  function edit(updater) {
    dirty.current = true
    setSnap(updater)
  }

  // The most recent snapshot strictly before the selected date, if any.
  const previousDate = Object.keys(snapshots)
    .filter((d) => d < date)
    .sort()
    .at(-1)

  // Carry rates, per-person balances, and registers forward from the previous
  // date — the daily entry usually starts from yesterday's numbers.
  function copyFromPrevious() {
    if (!previousDate) return
    const prev = snapshots[previousDate]
    edit((s) => ({
      ...s,
      rates: structuredClone(prev.rates ?? {}),
      people: (prev.people ?? []).map((p) => ({
        ...p,
        debt: { ...(p.debt ?? {}) },
        capital: { ...(p.capital ?? {}) },
      })),
      registers: (prev.registers ?? []).map((r) => ({ ...r })),
      startingCapitalUsd: prev.startingCapitalUsd ?? s.startingCapitalUsd,
    }))
  }

  function setRate(code, field, value) {
    edit((s) => ({
      ...s,
      rates: { ...s.rates, [code]: { ...s.rates[code], [field]: value } },
    }))
  }

  function setPersonField(id, key, value) {
    edit((s) => ({
      ...s,
      people: s.people.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    }))
  }

  function setPersonAmount(id, kind, code, value) {
    edit((s) => ({
      ...s,
      people: s.people.map((p) =>
        p.id === id ? { ...p, [kind]: { ...p[kind], [code]: value } } : p,
      ),
    }))
  }

  function setRegister(id, value) {
    edit((s) => ({
      ...s,
      registers: s.registers.map((r) =>
        r.id === id ? { ...r, amount: value } : r,
      ),
    }))
  }

  function setRegisterName(id, value) {
    edit((s) => ({
      ...s,
      registers: s.registers.map((r) =>
        r.id === id ? { ...r, name: value } : r,
      ),
    }))
  }

  function addRegister() {
    edit((s) => ({
      ...s,
      registers: [
        ...s.registers,
        { id: crypto.randomUUID(), name: `КАСА ${s.registers.length + 1}`, amount: '' },
      ],
    }))
  }

  function removeRegister(id) {
    edit((s) => ({
      ...s,
      registers: s.registers.filter((r) => r.id !== id),
    }))
  }

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorList, setErrorList] = useState([])

  // True when the field at `key` failed validation — drives the Input's
  // aria-invalid styling (red ring/border via the shadcn theme).
  function invalid(key) {
    return Boolean(fieldErrors[key])
  }

  async function save() {
    const candidate = { ...snap, date }
    const { valid, fieldErrors: fe, list } = validateSnapshot(candidate, {
      codes,
      rateCodes,
    })
    setFieldErrors(fe)
    setErrorList(list)
    if (!valid) {
      setSaveError(null)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await saveSnapshot(candidate)
      navigate('/dashboard')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Daily Entry</h1>
          <p className="text-sm text-muted-foreground">
            Enter rates and balances for one date, then save the snapshot.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {previousDate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyFromPrevious}
              title={`Copy values from ${previousDate}`}
            >
              Copy from {previousDate}
            </Button>
          )}
          <Label className="text-sm">
            <span className="text-muted-foreground">Date</span>
            <Input
              type="date"
              className="w-auto"
              value={date}
              onChange={(e) => loadDate(e.target.value)}
            />
          </Label>
        </div>
      </div>

      {/* Exchange rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exchange rates (per UAH)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Buy</TableHead>
                <TableHead>Sell</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateCurrencies.map(({ code, name }) => (
                <TableRow key={code}>
                  <TableCell>
                    <span className="font-medium">{code}</span>{' '}
                    <span className="text-muted-foreground">{name}</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      aria-invalid={invalid(`rates.${code}.buy`)}
                      value={snap.rates[code]?.buy ?? ''}
                      onChange={(e) => setRate(code, 'buy', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      aria-invalid={invalid(`rates.${code}.sell`)}
                      value={snap.rates[code]?.sell ?? ''}
                      onChange={(e) => setRate(code, 'sell', e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* People: debt + capital per currency */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">People — debt &amp; working capital</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              edit((s) => ({ ...s, people: [...s.people, emptyPerson()] }))
            }
          >
            + Add person
          </Button>
        </div>

        <div className="space-y-4">
          {snap.people.map((person) => (
            <Card key={person.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    className="max-w-xs"
                    placeholder="Person name"
                    value={person.name}
                    onChange={(e) =>
                      setPersonField(person.id, 'name', e.target.value)
                    }
                  />
                  {snap.people.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        edit((s) => ({
                          ...s,
                          people: s.people.filter((p) => p.id !== person.id),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead />
                      {currencies.map((c) => (
                        <TableHead key={c.code}>{c.code}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['debt', 'capital'].map((kind) => (
                      <TableRow key={kind}>
                        <TableCell className="capitalize text-muted-foreground">
                          {kind}
                        </TableCell>
                        {currencies.map((c) => (
                          <TableCell key={c.code}>
                            <Input
                              type="number"
                              step="0.01"
                              aria-invalid={invalid(
                                `people.${person.id}.${kind}.${c.code}`,
                              )}
                              value={person[kind][c.code] ?? ''}
                              onChange={(e) =>
                                setPersonAmount(
                                  person.id,
                                  kind,
                                  c.code,
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Cash registers + starting capital */}
      <section className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Cash registers (UAH)</CardTitle>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addRegister}
            >
              + Add register
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {snap.registers.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <Input
                  className="w-28"
                  value={r.name ?? ''}
                  placeholder="Name"
                  onChange={(e) => setRegisterName(r.id, e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  aria-invalid={invalid(`registers.${r.id}.amount`)}
                  value={r.amount ?? ''}
                  onChange={(e) => setRegister(r.id, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeRegister(r.id)}
                  title="Remove register"
                >
                  ✕
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Starting capital (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              step="0.01"
              aria-invalid={invalid('startingCapitalUsd')}
              value={snap.startingCapitalUsd ?? ''}
              onChange={(e) =>
                edit((s) => ({ ...s, startingCapitalUsd: e.target.value }))
              }
            />
          </CardContent>
        </Card>
      </section>

      {errorList.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="mb-1 font-medium">
            Fix {errorList.length} field{errorList.length > 1 ? 's' : ''} before
            saving:
          </p>
          <ul className="list-inside list-disc">
            {errorList.map((e) => (
              <li key={e.key}>
                <span className="font-mono text-xs">{e.key}</span> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save snapshot'}
        </Button>
        {saveError && (
          <span className="text-sm text-destructive">{saveError}</span>
        )}
      </div>
    </div>
  )
}
