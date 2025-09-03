// src/api.ts
export type GuessResponse = {
  feedback?: string
  result?: string
  message?: string
  guessCount?: number
  target?: number
}

export const api = {
  startGame: async (): Promise<void> => {
    const res = await fetch('/api', { method: 'GET', credentials: 'include' })
    if (!res.ok) throw new Error('Failed to start')
  },
  resetGame: async (): Promise<void> => {
    const res = await fetch('/api/reset', { method: 'GET', credentials: 'include' })
    if (!res.ok) throw new Error('Failed to reset')
  },
  guess: async (value: number): Promise<GuessResponse> => {
    const res = await fetch('/api', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: value })
    })
    if (!res.ok) throw new Error('Guess failed')
    try { return (await res.json()) as GuessResponse } catch { return {} }
  }
}
