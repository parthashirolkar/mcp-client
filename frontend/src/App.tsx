import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import ChatInterface from './components/Chat/ChatInterface';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0066cc', // More modern blue
      light: '#e3f2fd',
      dark: '#004c99',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7c4dff', // Modern purple
      light: '#f3e5f5',
      dark: '#5e35b1',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafbfc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
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
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChatInterface />
    </ThemeProvider>
  );
}

export default App;
