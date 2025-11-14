import React, { createContext, useContext, ReactNode } from 'react';
import { useThemeMode, ThemeMode } from '../hooks/useThemeMode';
import { Theme } from '@mui/material/styles';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  toggleMode: () => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const AppThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { theme, mode, toggleMode, isDarkMode } = useThemeMode();

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleMode, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
};
