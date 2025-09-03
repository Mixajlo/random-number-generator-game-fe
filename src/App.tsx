import React, { useRef, useState } from 'react'

type Feedback = 'TOO_HIGH' | 'TOO_LOW' | 'CORRECT'
type GuessResponse = { feedback?: Feedback; message?: string; result?: string; target?: number }

const isBlank = (s: string) => s.trim() === ''

async function readBody(res: Response): Promise<{ ok: boolean; data?: GuessResponse; text?: string; err?: string }> {
  const ct = res.headers.get('content-type') || ''
  if (res.ok) {
    if (ct.includes('application/json')) {
      try { return { ok: true, data: (await res.json()) as GuessResponse } } catch { return { ok: true } }
    }
    const t = (await res.text()).trim()
    return { ok: true, text: t }
  } else {
    try {
      if (ct.includes('application/json')) {
        const j = (await res.json()) as Record<string, unknown>
        const msg = j['error'] ?? j['message'] ?? j['detail']
        return { ok: false, err: typeof msg === 'string' ? msg : `HTTP ${res.status}` }
      }
    } catch {}
    const t = (await res.text()).trim()
    return { ok: false, err: t || `HTTP ${res.status}` }
  }
}

function toFeedback(body: { data?: GuessResponse; text?: string }): Feedback | null {
  const raw =
    body.data?.feedback ??
    (typeof body.data?.message === 'string' ? body.data?.message : undefined) ??
    (typeof body.data?.result === 'string' ? body.data?.result : undefined) ??
    body.text
  if (raw === 'TOO_HIGH' || raw === 'TOO_LOW' || raw === 'CORRECT') return raw
  return null
}

function labelFor(fb: Feedback) {
  return fb === 'TOO_HIGH' ? 'Too High' : fb === 'TOO_LOW' ? 'Too Low' : 'Correct'
}

export default function App() {
  const [started, setStarted] = useState(false)
  const [value, setValue] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [msg, setMsg] = useState<string>('')
  const [tries, setTries] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function startGame(): Promise<void> {
    setError(''); setMsg('')
    try {
      setLoading(true)
      const res = await fetch('/api', { method: 'GET', credentials: 'include' })
      const b = await readBody(res)
      if (!b.ok) throw new Error(b.err)
      setStarted(true)
      setFinished(false)
      setTries(0)
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start')
    } finally {
      setLoading(false)
    }
  }

  async function resetGame(): Promise<void> {
    setError('')
    try {
      const res = await fetch('/api/reset', { method: 'GET', credentials: 'include' })
      const b = await readBody(res)
      if (!b.ok) throw new Error(b.err)
      setMsg('Game reset. Counter set to 0.')
      setTries(0)
      setValue('')
      setFinished(false)
      inputRef.current?.focus()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reset')
    }
  }

  async function submitGuess(): Promise<void> {
    setError(''); setMsg('')
    if (isBlank(value)) {
      setError('Please enter a number'); inputRef.current?.focus(); return
    }
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0 || n > 1000) {
      setError('Enter an integer between 0 and 1000'); return
    }
    try {
      setLoading(true)
      const res = await fetch('/api', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: n })
      })
      const b = await readBody(res)
      if (!b.ok) throw new Error(b.err)

      const fb = toFeedback(b)
      setFinished(fb === 'CORRECT')
      const newTries = tries + 1
      setTries(newTries)

      if (fb) {
        setMsg(`${labelFor(fb)}. Total guess ${newTries}`)
      } else {
        // Fallback if server returns something unexpected
        const raw = b.text ?? (b.data?.message ?? b.data?.result ?? 'Submitted.')
        setMsg(`${raw}. Total guess ${newTries}`)
      }

      setValue('')
      inputRef.current?.focus()
    } catch (e: unknown) {
      // e.g., after CORRECT your backend deletes the session; next request shows server error here
      setError(e instanceof Error ? e.message : 'Guess failed')
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isBlank(value)) submitGuess()
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Number Guess</h1>
        {started && (
          <button onClick={resetGame}>
            {finished ? 'Start new game' : 'Reset game'}
          </button>
        )}
      </div>

      {!started ? (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={startGame} disabled={loading}>
            {loading ? 'Starting…' : 'Start game'}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <label htmlFor="guess">Your guess (0–1000):</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              id="guess"
              ref={inputRef}
              type="number"
              min={0}
              max={1000}
              step={1}
              required
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              style={{ flex: 1, padding: 8 }}
            />
            <button onClick={submitGuess} disabled={loading || isBlank(value)}>Guess</button>
          </div>

          {error && <div style={{ color: 'crimson', marginTop: 10 }}>{error}</div>}
          {msg && <div style={{ color: 'green', marginTop: 10 }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
