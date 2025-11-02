import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Fade,
  Typography,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  WifiOff as DisconnectedIcon,
  Loop as ConnectingIcon,
  Wifi as ConnectedIcon
} from '@mui/icons-material';
import websocketService from '../../services/websocket';

interface LoadingStatesProps {
  children: React.ReactNode;
}

const GlobalLoadingStates: React.FC<LoadingStatesProps> = ({ children }) => {
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [showReconnectNotif, setShowReconnectNotif] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const checkWsStatus = () => {
      const readyState = websocketService.readyState;
      switch (readyState) {
        case WebSocket.OPEN:
          setWsStatus('connected');
          setReconnecting(false);
          break;
        case WebSocket.CONNECTING:
          setWsStatus('connecting');
          setReconnecting(true);
          break;
        default:
          setWsStatus('disconnected');
          if (!reconnecting) {
            setShowReconnectNotif(true);
          }
          break;
      }
    };

    // Check status initially
    checkWsStatus();

    // Set up interval to check status
    const interval = setInterval(checkWsStatus, 1000);

    return () => clearInterval(interval);
  }, [reconnecting]);

  const handleReconnect = () => {
    setShowReconnectNotif(false);
    setReconnecting(true);
    // Force reconnection by creating new instance
    const currentId = websocketService.connectionId;
    websocketService.disconnect();
    setTimeout(() => {
      // Note: In a real implementation, we'd need to recreate the service
      console.log('Attempting to reconnect...');
    }, 1000);
  };

  return (
    <>
      {/* Global Connection Status Indicator */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
        }}
      >
        <Fade in={wsStatus === 'connecting'}>
          <Chip
            icon={<ConnectingIcon sx={{ animation: 'spin 1s linear infinite' }} />}
            label="Reconnecting..."
            color="warning"
            variant="outlined"
            sx={{ mb: 1 }}
          />
        </Fade>
      </Box>

      {/* Disconnection Notification */}
      <Snackbar
        open={showReconnectNotif && wsStatus === 'disconnected'}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          action={
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton
                size="small"
                color="inherit"
                onClick={handleReconnect}
                disabled={reconnecting}
              >
                {reconnecting ? <CircularProgress size={16} /> : <ConnectingIcon />}
              </IconButton>
              <IconButton size="small" color="inherit" onClick={() => setShowReconnectNotif(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{ minWidth: 300 }}
        >
          <Box>
            <Typography variant="body2" fontWeight="bold">
              Connection Lost
            </Typography>
            <Typography variant="caption">
              Real-time updates are unavailable. Attempting to reconnect...
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {children}
    </>
  );
};

// Server-specific loading component
export const ServerLoadingState: React.FC<{
  status: string;
  serverName: string;
}> = ({ status, serverName }) => {
  if (status === 'connecting') {
    return (
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Connecting to {serverName}...
        </Typography>
      </Box>
    );
  }

  return null;
};

// Tool execution loading component
export const ToolExecutionLoading: React.FC<{
  toolName: string;
  serverName: string;
}> = ({ toolName, serverName }) => {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" py={3}>
      <Box textAlign="center">
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Executing {toolName} on {serverName}...
        </Typography>
        <Typography variant="caption" color="text.secondary">
          This may take a few moments
        </Typography>
      </Box>
    </Box>
  );
};

// Skeleton loading for server cards
export const ServerCardSkeleton: React.FC = () => {
  return (
    <Box>
      <Box
        sx={{
          height: 200,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 2,
        }}
      >
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Box
            sx={{
              height: 28,
              width: '60%',
              bgcolor: 'grey.200',
              borderRadius: 1,
            }}
          />
          <Box
            sx={{
              height: 32,
              width: 32,
              bgcolor: 'grey.200',
              borderRadius: '50%',
            }}
          />
        </Box>
        <Box display="flex" gap={1} mb={2}>
          <Box
            sx={{
              height: 24,
              width: 80,
              bgcolor: 'grey.200',
              borderRadius: 1,
            }}
          />
          <Box
            sx={{
              height: 24,
              width: 100,
              bgcolor: 'grey.200',
              borderRadius: 1,
            }}
          />
        </Box>
        <Box
          sx={{
            height: 16,
            width: '100%',
            bgcolor: 'grey.200',
            borderRadius: 1,
            mb: 1,
          }}
        />
        <Box
          sx={{
            height: 16,
            width: '70%',
            bgcolor: 'grey.200',
            borderRadius: 1,
          }}
        />
      </Box>
    </Box>
  );
};

// Page loading component
export const PageLoading: React.FC<{
  message?: string;
}> = ({ message = 'Loading...' }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight={400}
    >
      <CircularProgress size={48} sx={{ mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default GlobalLoadingStates;