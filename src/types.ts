export type Feedback = 'TOO_LOW' | 'TOO_HIGH' | 'CORRECT';

export interface GuessResponse {
  feedback: Feedback;
  guessCount: number;
  finished: boolean;
  target?: number;
}

export interface GameStatus {
  active: boolean;
  guessCount: number;
  finished: boolean;
  target?: number;
}

export interface ApiError { error: string }
