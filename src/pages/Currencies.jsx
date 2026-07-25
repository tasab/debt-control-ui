import { useState } from 'react'
import { addCurrency, useCurrencies } from '../lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function Currencies() {
  const { currencies, baseCurrency, isLoading, isError, error } =
    useCurrencies()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function add(e) {
    e.preventDefault()
    const nextCode = code.trim().toUpperCase()
    const nextName = name.trim()
    if (!/^[A-Z]{2,5}$/.test(nextCode)) {
      setErr('Code must be 2–5 letters (e.g. CHF).')
      return
    }
    if (!nextName) {
      setErr('Name is required.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await addCurrency(nextCode, nextName)
      setCode('')
      setName('')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Currencies</h1>
        <p className="text-sm text-muted-foreground">
          The active currency list. Adding one makes it available in daily
          entries, rates, and every total — no code change needed.{' '}
          <span className="font-medium">{baseCurrency}</span> is the base
          currency everything converts through.
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={add} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Code
              </label>
              <Input
                className="w-24 uppercase"
                placeholder="CHF"
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Name
              </label>
              <Input
                className="w-56"
                placeholder="Swiss Franc"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? 'Adding…' : 'Add currency'}
            </Button>
            {err && <span className="text-sm text-destructive">{err}</span>}
          </form>
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-destructive">
          Failed to load currencies: {error?.message}
        </p>
      )}

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="font-medium">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-right">
                    {c.isBase ? (
                      <Badge variant="secondary">Base</Badge>
                    ) : (
                      <Badge variant="outline">Rate</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
