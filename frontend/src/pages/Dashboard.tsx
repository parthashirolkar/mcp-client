import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Storage as ServerIcon,
  Build as ToolsIcon,
  CheckCircle as ConnectedIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { MCPServerConfig, ServerStatus } from '../types/mcp';
import { serversAPI, toolsAPI } from '../services/api';
import websocketService from '../services/websocket';

interface DashboardStats {
  totalServers: number;
  connectedServers: number;
  totalTools: number;
  recentErrors: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalServers: 0,
    connectedServers: 0,
    totalTools: 0,
    recentErrors: 0
  });
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    setupWebSocketListeners();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [serversData, toolsData] = await Promise.all([
        serversAPI.listServers(),
        toolsAPI.listAllTools()
      ]);

      const connected = serversData.filter(s => s.status === ServerStatus.CONNECTED).length;
      const errors = serversData.filter(s => s.status === ServerStatus.ERROR).length;

      setStats({
        totalServers: serversData.length,
        connectedServers: connected,
        totalTools: toolsData.total_tools,
        recentErrors: errors
      });

      setServers(serversData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocketListeners = () => {
    const handleStatusUpdate = (data: { servers: any[] }) => {
      setServers(prevServers => {
        const updatedServers = prevServers.map(server => {
          const updatedServer = data.servers.find((s: any) => s.id === server.id);
          if (updatedServer) {
            return {
              ...server,
              status: updatedServer.status,
              last_error: updatedServer.last_error
            };
          }
          return server;
        });

        const connected = updatedServers.filter(s => s.status === ServerStatus.CONNECTED).length;
        const errors = updatedServers.filter(s => s.status === ServerStatus.ERROR).length;

        setStats(prev => ({
          ...prev,
          connectedServers: connected,
          recentErrors: errors
        }));

        return updatedServers;
      });
    };

    websocketService.onStatusUpdate(handleStatusUpdate);
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'primary' | 'success' | 'error' | 'info';
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box color={`${color}.main`} fontSize={40}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Servers"
            value={stats.totalServers}
            icon={<ServerIcon />}
            color="primary"
            subtitle="Configured MCP servers"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Connected"
            value={stats.connectedServers}
            icon={<ConnectedIcon />}
            color="success"
            subtitle="Active connections"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Available Tools"
            value={stats.totalTools}
            icon={<ToolsIcon />}
            color="info"
            subtitle="From connected servers"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Errors"
            value={stats.recentErrors}
            icon={<ErrorIcon />}
            color="error"
            subtitle="Servers with errors"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Server Status Overview
            </Typography>
            {servers.length === 0 ? (
              <Typography color="textSecondary">
                No servers configured yet. Start by adding your first MCP server.
              </Typography>
            ) : (
              <Box>
                {servers.map((server) => (
                  <Box key={server.id} sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1">
                        {server.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body2"
                          color={server.status === ServerStatus.CONNECTED ? 'success.main' : 'text.secondary'}
                        >
                          {server.status}
                        </Typography>
                        {server.status === ServerStatus.CONNECTED && (
                          <Typography variant="body2" color="text.secondary">
                            • {server.connection_type.toUpperCase()}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {server.last_error && (
                      <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        {server.last_error}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Stats
            </Typography>
            <Box>
              <Typography variant="body2" paragraph>
                <strong>Connection Rate:</strong> {stats.totalServers > 0
                  ? Math.round((stats.connectedServers / stats.totalServers) * 100)
                  : 0}%
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Error Rate:</strong> {stats.totalServers > 0
                  ? Math.round((stats.recentErrors / stats.totalServers) * 100)
                  : 0}%
              </Typography>
              <Typography variant="body2">
                <strong>Avg Tools per Server:</strong> {stats.connectedServers > 0
                  ? Math.round(stats.totalTools / stats.connectedServers)
                  : 0}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;