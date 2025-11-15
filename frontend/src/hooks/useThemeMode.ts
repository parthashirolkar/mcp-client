import { useState, useEffect, useMemo } from 'react';
import { createTheme, Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

export const useThemeMode = () => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check localStorage first, then system preference
    const stored = localStorage.getItem('theme-mode') as ThemeMode;
    if (stored) {
      setMode(stored);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }
  }, []);

  useEffect(() => {
    // Save to localStorage whenever mode changes
    if (mounted) {
      localStorage.setItem('theme-mode', mode);
    }
  }, [mode, mounted]);

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  const theme = useMemo(() => {
    if (mode === 'dark') {
      return createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: '#f97316', // Claude orange
            light: '#fed7aa',
            dark: '#ea580c',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#6b7280', // Neutral gray
            light: '#4b5563',
            dark: '#9ca3af',
            contrastText: '#ffffff',
          },
          background: {
            default: '#0f0f0f', // Dark but not pure black
            paper: '#1a1a1a',   // Slightly lighter for better contrast
          },
          text: {
            primary: '#ffffff',
            secondary: '#9ca3af', // Lighter secondary text for better readability
          },
          divider: '#374151', // More visible divider
          success: {
            main: '#10b981',
            light: '#059669',
          },
          error: {
            main: '#ef4444',
            light: '#dc2626',
          },
          warning: {
            main: '#f59e0b',
            light: '#d97706',
          },
          info: {
            main: '#3b82f6',
            light: '#2563eb',
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.2,
          },
          h6: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.3,
          },
          body1: {
            fontSize: '0.95rem',
            lineHeight: 1.6,
            fontWeight: 400,
          },
          body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
            fontWeight: 400,
          },
          caption: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
            fontWeight: 500,
          },
        },
        shape: {
          borderRadius: 12,
        },
        spacing: 8,
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'linear-gradient(135deg, rgba(10,10,10,0.9) 0%, rgba(0,0,0,0.95) 100%)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
                fontWeight: 500,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
                },
              },
              contained: {
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 12,
                  transition: 'all 0.2s ease-in-out',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  '&.Mui-focused': {
                    borderColor: '#f97316',
                    boxShadow: '0 0 0 3px rgba(249, 115, 22, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                borderRadius: 12,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
                },
              },
            },
          },
        },
      });
    } else {
      return createTheme({
        palette: {
          mode: 'light',
          primary: {
            main: '#f97316', // Claude orange
            light: '#fed7aa',
            dark: '#ea580c',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#6b7280', // Neutral gray
            light: '#f3f4f6',
            dark: '#374151',
            contrastText: '#ffffff',
          },
          background: {
            default: '#fafafa',
            paper: '#ffffff',
          },
          text: {
            primary: '#1f2937',
            secondary: '#6b7280',
          },
          divider: '#e5e7eb',
          success: {
            main: '#10b981',
            light: '#d1fae5',
          },
          error: {
            main: '#ef4444',
            light: '#fee2e2',
          },
          warning: {
            main: '#f59e0b',
            light: '#fef3c7',
          },
          info: {
            main: '#3b82f6',
            light: '#dbeafe',
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.2,
          },
          h6: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.3,
          },
          body1: {
            fontSize: '0.95rem',
            lineHeight: 1.6,
            fontWeight: 400,
          },
          body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
            fontWeight: 400,
          },
          caption: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
            fontWeight: 500,
          },
        },
        shape: {
          borderRadius: 12,
        },
        spacing: 8,
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
                fontWeight: 500,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)',
                },
              },
              contained: {
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: '0 2px 4px rgba(249, 115, 22, 0.1)',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 12,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: '#f97316',
                  },
                  '&.Mui-focused': {
                    borderColor: '#f97316',
                    boxShadow: '0 0 0 3px rgba(249, 115, 22, 0.1)',
                  },
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                borderRadius: 12,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
              },
            },
          },
        },
      });
    }
  }, [mode]);

  return {
    theme,
    mode,
    toggleMode,
    isDarkMode: mode === 'dark',
    mounted,
  };
};