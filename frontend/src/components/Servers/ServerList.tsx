import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Grid,
  Alert,
  Tooltip,
  Divider
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  PlayArrow as ConnectIcon,
  Stop as DisconnectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Build as ToolsIcon,
  Circle as ConnectedIcon,
  RadioButtonUnchecked as DisconnectedIcon,
  ErrorOutline as ErrorIcon,
  Loop as ConnectingIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { MCPServerConfig, ServerStatus } from '../../types/mcp';
import { serversAPI } from '../../services/api';
import websocketService from '../../services/websocket';

interface ServerListProps {
  servers: MCPServerConfig[];
  onEdit: (server: MCPServerConfig) => void;
  onDelete: (server: MCPServerConfig) => void;
  onRefresh: () => void;
}

const ServerList: React.FC<ServerListProps> = ({
  servers,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedServer, setSelectedServer] = useState<MCPServerConfig | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, server: MCPServerConfig) => {
    setAnchorEl(event.currentTarget);
    setSelectedServer(server);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedServer(null);
  };

  const handleConnect = async (server: MCPServerConfig) => {
    if (!server.id) return;

    setActionLoading(server.id);
    try {
      await serversAPI.connectServer(server.id);
    } catch (error) {
      console.error('Failed to connect to server:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (server: MCPServerConfig) => {
    if (!server.id) return;

    setActionLoading(server.id);
    try {
      await serversAPI.disconnectServer(server.id);
    } catch (error) {
      console.error('Failed to disconnect from server:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestConnection = async (server: MCPServerConfig) => {
    if (!server.id) return;

    setActionLoading(server.id);
    try {
      const result = await serversAPI.testConnection(server.id);
      if (result.success) {
        // You could show a success message here
        console.log('Connection test successful');
      } else {
        console.error('Connection test failed:', result.message);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.CONNECTED:
        return 'success';
      case ServerStatus.CONNECTING:
        return 'warning';
      case ServerStatus.ERROR:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.CONNECTED:
        return <ConnectedIcon sx={{ fontSize: 12, color: 'success.main' }} />;
      case ServerStatus.CONNECTING:
        return (
          <ConnectingIcon
            sx={{
              fontSize: 12,
              color: 'warning.main'
            }}
          />
        );
      case ServerStatus.ERROR:
        return <ErrorIcon sx={{ fontSize: 12, color: 'error.main' }} />;
      default:
        return <DisconnectedIcon sx={{ fontSize: 12, color: 'grey.500' }} />;
    }
  };

  return (
    <Grid container spacing={3}>
      {servers.map((server) => (
        <Grid item xs={12} md={6} lg={4} key={server.id}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h6" component="h2" noWrap>
                  {server.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, server)}
                  disabled={actionLoading === server.id}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>

              <Box mb={2}>
                <Chip
                  label={`${server.connection_type.toUpperCase()}`}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Chip
                  icon={getStatusIcon(server.status)}
                  label={server.status}
                  color={getStatusColor(server.status)}
                  size="small"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {server.connection_type === 'stdio' ? (
                  <>
                    <strong>Command:</strong> {server.command}
                    {server.args && server.args.length > 0 && (
                      <> {server.args.join(' ')}</>
                    )}
                  </>
                ) : (
                  <>
                    <strong>URL:</strong> {server.url}
                  </>
                )}
              </Typography>

              {server.last_error && (
                <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                  <Typography variant="body2">
                    {server.last_error}
                  </Typography>
                </Alert>
              )}

              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Created: {formatDistanceToNow(new Date(server.created_at), { addSuffix: true })}
                </Typography>
              </Box>

              {server.status === ServerStatus.CONNECTING && (
                <Box mt={1}>
                  <LinearProgress />
                </Box>
              )}
            </CardContent>

            <Divider />

            <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
              <Box>
                {server.status === ServerStatus.CONNECTED ? (
                  <Tooltip title="Disconnect">
                    <IconButton
                      onClick={() => handleDisconnect(server)}
                      disabled={actionLoading === server.id}
                      color="error"
                    >
                      <DisconnectIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Connect">
                    <IconButton
                      onClick={() => handleConnect(server)}
                      disabled={actionLoading === server.id || !server.enabled}
                      color="primary"
                    >
                      <ConnectIcon />
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title="Test Connection">
                  <IconButton
                    onClick={() => handleTestConnection(server)}
                    disabled={actionLoading === server.id}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="View Tools">
                  <IconButton
                    disabled={server.status !== ServerStatus.CONNECTED}
                    color="info"
                  >
                    <ToolsIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Typography variant="caption" color="text.secondary">
                {server.enabled ? 'Enabled' : 'Disabled'}
              </Typography>
            </CardActions>
          </Card>
        </Grid>
      ))}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedServer) {
              onEdit(selectedServer);
            }
            handleMenuClose();
          }}
        >
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedServer) {
              onDelete(selectedServer);
            }
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Grid>
  );
};

export default ServerList;