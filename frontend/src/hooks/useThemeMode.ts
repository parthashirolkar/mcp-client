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
            default: '#0a0a0f', // Rich dark background with subtle blue tint
            paper: 'rgba(15, 15, 25, 0.8)', // Semi-transparent with glassmorphism
          },
          text: {
            primary: '#ffffff',
            secondary: '#a8b2d1', // Softer, more sophisticated secondary text
          },
          divider: 'rgba(255, 255, 255, 0.1)', // Subtle dividers
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
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
          },
          h2: {
            fontSize: '1.875rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          },
          h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: '-0.015em',
          },
          h4: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
          },
          h5: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.4,
          },
          h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: '0.005em',
          },
          body1: {
            fontSize: '1rem',
            lineHeight: 1.7,
            fontWeight: 400,
            letterSpacing: '0.005em',
          },
          body2: {
            fontSize: '0.875rem',
            lineHeight: 1.6,
            fontWeight: 400,
            letterSpacing: '0.01em',
          },
          subtitle1: {
            fontSize: '1rem',
            lineHeight: 1.5,
            fontWeight: 500,
            letterSpacing: '0.005em',
          },
          subtitle2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
            fontWeight: 500,
            letterSpacing: '0.01em',
          },
          caption: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'none',
          },
          overline: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          },
        },
        shape: {
          borderRadius: 16,
        },
        spacing: 10,
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(10, 10, 20, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 12,
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '0.01em',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: '0 8px 25px rgba(249, 115, 22, 0.35)',
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)',
                },
              },
              contained: {
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
                boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
                  boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)',
                },
              },
              outlined: {
                borderColor: 'rgba(249, 115, 22, 0.5)',
                color: '#f97316',
                '&:hover': {
                  borderColor: '#f97316',
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  boxShadow: '0 4px 15px rgba(249, 115, 22, 0.2)',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 16,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  '&:hover': {
                    borderColor: 'rgba(249, 115, 22, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  },
                  '&.Mui-focused': {
                    borderColor: '#f97316',
                    boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.15), 0 4px 20px rgba(0, 0, 0, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '14px 16px',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#a8b2d1',
                  '&.Mui-focused': {
                    color: '#f97316',
                  },
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.8) 0%, rgba(10, 10, 20, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.01)',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(249, 115, 22, 0.2)',
                  borderColor: 'rgba(249, 115, 22, 0.2)',
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                background: 'linear-gradient(90deg, rgba(10, 10, 20, 0.95) 0%, rgba(15, 15, 25, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.95) 0%, rgba(15, 15, 25, 0.98) 100%)',
                backdropFilter: 'blur(20px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.4)',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                margin: '4px 12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: 'rgba(249, 115, 22, 0.15)',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: '#f97316',
                    transform: 'scale(1.1)',
                  },
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(249, 115, 22, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(249, 115, 22, 0.25)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#f97316',
                  },
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
            default: '#fafbfc', // Subtle off-white for a premium feel
            paper: 'rgba(255, 255, 255, 0.9)', // Semi-transparent for glassmorphism
          },
          text: {
            primary: '#1a1f2e', // Rich dark text for better contrast
            secondary: '#64748b', // Sophisticated secondary text
          },
          divider: 'rgba(0, 0, 0, 0.06)', // Subtle dividers
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
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
          },
          h2: {
            fontSize: '1.875rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          },
          h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: '-0.015em',
          },
          h4: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
          },
          h5: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.4,
          },
          h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: '0.005em',
          },
          body1: {
            fontSize: '1rem',
            lineHeight: 1.7,
            fontWeight: 400,
            letterSpacing: '0.005em',
          },
          body2: {
            fontSize: '0.875rem',
            lineHeight: 1.6,
            fontWeight: 400,
            letterSpacing: '0.01em',
          },
          subtitle1: {
            fontSize: '1rem',
            lineHeight: 1.5,
            fontWeight: 500,
            letterSpacing: '0.005em',
          },
          subtitle2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
            fontWeight: 500,
            letterSpacing: '0.01em',
          },
          caption: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'none',
          },
          overline: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          },
        },
        shape: {
          borderRadius: 16,
        },
        spacing: 10,
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                borderRadius: 16,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 12,
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '0.01em',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: '0 8px 25px rgba(249, 115, 22, 0.25)',
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)',
                },
              },
              contained: {
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
                boxShadow: '0 4px 15px rgba(249, 115, 22, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
                  boxShadow: '0 6px 20px rgba(249, 115, 22, 0.3)',
                },
              },
              outlined: {
                borderColor: 'rgba(249, 115, 22, 0.6)',
                color: '#f97316',
                '&:hover': {
                  borderColor: '#f97316',
                  backgroundColor: 'rgba(249, 115, 22, 0.08)',
                  boxShadow: '0 4px 15px rgba(249, 115, 22, 0.15)',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 16,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  '&:hover': {
                    borderColor: 'rgba(249, 115, 22, 0.6)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  },
                  '&.Mui-focused': {
                    borderColor: '#f97316',
                    boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.1), 0 4px 20px rgba(0, 0, 0, 0.15)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '14px 16px',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#64748b',
                  '&.Mui-focused': {
                    color: '#f97316',
                  },
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
                borderRadius: 16,
                border: '1px solid rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.01)',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(249, 115, 22, 0.15)',
                  borderColor: 'rgba(249, 115, 22, 0.15)',
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08)',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.99) 100%)',
                backdropFilter: 'blur(20px)',
                borderRight: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.15)',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                margin: '4px 12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: '#f97316',
                    transform: 'scale(1.1)',
                  },
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(249, 115, 22, 0.15)',
                  '&:hover': {
                    backgroundColor: 'rgba(249, 115, 22, 0.18)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#f97316',
                  },
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