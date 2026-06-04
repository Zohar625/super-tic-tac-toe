import { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeConfig } from '../state/types';
import { classicTheme } from './themes';

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: classicTheme,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(classicTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
