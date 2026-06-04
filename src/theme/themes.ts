import type { ThemeConfig } from '../state/types';

export const classicTheme: ThemeConfig = {
  boardSkin: 'classic',
  pieceSet: 'X-O',
};

export const grassTheme: ThemeConfig = {
  boardSkin: 'grass',
  pieceSet: 'cat-dog',
};

export const pieceSymbols: Record<string, Record<string, string>> = {
  'X-O': { X: '✖', O: '◯' },
  'cat-dog': { X: '🐱', O: '🐶' },
  'sun-moon': { X: '☀️', O: '🌙' },
};

export function getPieceSymbol(pieceSet: string, player: string): string {
  return pieceSymbols[pieceSet]?.[player] ?? player;
}
