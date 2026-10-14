import { createContext, useContext } from 'react';
import type { ThemeConfig } from '../state/types';
import { grassTheme } from './themes';
interface ThemeContextValue { theme: ThemeConfig; setTheme: (theme: ThemeConfig) => void; }
export const ThemeContext = createContext<ThemeContextValue>({ theme: grassTheme, setTheme: () => {} });
export function useTheme(): ThemeContextValue { return useContext(ThemeContext); }
