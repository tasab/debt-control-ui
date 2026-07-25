import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createPerson, removePerson, renamePerson, usePeople } from '../lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function People() {
  const { people, isLoading, isError, error } = usePeople()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function add(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setErr(null)
    try {
      await createPerson(trimmed)
      setName('')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  async function rename(id, current) {
    const next = window.prompt('New name', current)
    if (next === null) return
    const trimmed = next.trim()
    if (!trimmed || trimmed === current) return
    try {
      await renamePerson(id, trimmed)
    } catch (ex) {
      setErr(ex.message)
    }
  }

  async function remove(id, personName) {
    if (!window.confirm(`Remove ${personName} from the roster?`)) return
    try {
      await removePerson(id)
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground">
          The standing roster. New daily entries start pre-populated from this
          list; removing someone here doesn&apos;t touch past snapshots.
        </p>
      </div>

      <form onSubmit={add} className="flex items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Add a person…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={busy}>
          Add
        </Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </form>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-destructive">
          Failed to load people: {error?.message}
        </p>
      )}

      {!isLoading && people.length === 0 && (
        <p className="text-muted-foreground">No people yet.</p>
      )}

      <ul className="divide-y rounded-lg border">
        {people.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <Link
              to={`/people/${p.id}`}
              className="font-medium text-primary hover:underline"
            >
              {p.name}
            </Link>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => rename(p.id, p.name)}
              >
                Rename
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(p.id, p.name)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
