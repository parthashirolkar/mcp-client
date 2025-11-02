import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Fab,
  Alert,
  Snackbar,
  Paper,
  Toolbar,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { MCPServerConfig } from '../types/mcp';
import { serversAPI } from '../services/api';
import websocketService from '../services/websocket';
import ServerList from '../components/Servers/ServerList';
import ServerConfigForm from '../components/Servers/ServerConfigForm';

const Servers: React.FC = () => {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configFormOpen, setConfigFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfig | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MCPServerConfig | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load servers on component mount
  useEffect(() => {
    loadServers();
  }, []);

  // Set up WebSocket listeners
  useEffect(() => {
    const handleStatusUpdate = (data: { servers: any[] }) => {
      setServers(prevServers =>
        prevServers.map(server => {
          const updatedServer = data.servers.find((s: any) => s.id === server.id);
          if (updatedServer) {
            return {
              ...server,
              status: updatedServer.status,
              last_error: updatedServer.last_error
            };
          }
          return server;
        })
      );
    };

    const handleServerStatusUpdate = (data: { server_id: number; status: string; message?: string }) => {
      setServers(prevServers =>
        prevServers.map(server =>
          server.id === data.server_id
            ? { ...server, status: data.status as any, last_error: data.message }
            : server
        )
      );

      if (data.message) {
        setSnackbar({
          open: true,
          message: data.message,
          severity: data.status === 'connected' ? 'success' : 'error'
        });
      }
    };

    websocketService.onStatusUpdate(handleStatusUpdate);
    websocketService.onServerStatusUpdate(handleServerStatusUpdate);

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serversAPI.listServers();
      setServers(data);
    } catch (err) {
      console.error('Failed to load servers:', err);
      setError('Failed to load servers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateServer = () => {
    setEditingServer(undefined);
    setConfigFormOpen(true);
  };

  const handleEditServer = (server: MCPServerConfig) => {
    setEditingServer(server);
    setConfigFormOpen(true);
  };

  const handleDeleteServer = (server: MCPServerConfig) => {
    setDeleteConfirm(server);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm?.id) return;

    try {
      await serversAPI.deleteServer(deleteConfirm.id);
      setServers(prev => prev.filter(s => s.id !== deleteConfirm.id));
      setSnackbar({
        open: true,
        message: 'Server deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Failed to delete server:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete server',
        severity: 'error'
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleConfigSubmit = async (config: any) => {
    try {
      setSubmitting(true);

      if (editingServer?.id) {
        const updated = await serversAPI.updateServer(editingServer.id, config);
        setServers(prev => prev.map(s => s.id === editingServer.id ? updated : s));
        setSnackbar({
          open: true,
          message: 'Server updated successfully',
          severity: 'success'
        });
      } else {
        const created = await serversAPI.createServer(config);
        setServers(prev => [...prev, created]);
        setSnackbar({
          open: true,
          message: 'Server created successfully',
          severity: 'success'
        });
      }

      setConfigFormOpen(false);
      setEditingServer(undefined);
    } catch (err) {
      console.error('Failed to save server:', err);
      setSnackbar({
        open: true,
        message: 'Failed to save server',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const connectedCount = servers.filter(s => s.status === 'connected').length;
  const totalCount = servers.length;

  return (
    <Box>
      <Toolbar>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          MCP Servers
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadServers}
          disabled={loading}
        >
          Refresh
        </Button>
      </Toolbar>

      <Paper sx={{ p: 2, mb: 3, bgcolor: alpha('#000', 0.02) }}>
        <Typography variant="body1" color="text.secondary">
          {totalCount === 0
            ? 'No servers configured. Add your first MCP server to get started.'
            : `${connectedCount} of ${totalCount} servers connected`
          }
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <Typography>Loading servers...</Typography>
        </Box>
      ) : servers.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight={300}
          textAlign="center"
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No MCP Servers Configured
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Get started by adding your first MCP server configuration.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateServer}
          >
            Add Server
          </Button>
        </Box>
      ) : (
        <ServerList
          servers={servers}
          onEdit={handleEditServer}
          onDelete={handleDeleteServer}
          onRefresh={loadServers}
        />
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add server"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
        onClick={handleCreateServer}
      >
        <AddIcon />
      </Fab>

      {/* Server Configuration Form */}
      <ServerConfigForm
        open={configFormOpen}
        onClose={() => {
          setConfigFormOpen(false);
          setEditingServer(undefined);
        }}
        onSubmit={handleConfigSubmit}
        editingServer={editingServer}
        loading={submitting}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: alpha('#000', 0.5),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <Paper sx={{ p: 4, maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>
              Delete Server
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setDeleteConfirm(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={confirmDelete}
                disabled={submitting}
              >
                Delete
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Success/Error Messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Servers;