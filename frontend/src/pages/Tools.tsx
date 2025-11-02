import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { ToolInfo, ToolExecutionResult } from '../types/mcp';
import { toolsAPI, serversAPI } from '../services/api';
import websocketService from '../services/websocket';

const Tools: React.FC = () => {
  const [tools, setTools] = useState<Record<number, ToolInfo[]>>({});
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<{ serverId: number; tool: ToolInfo } | null>(null);
  const [toolArguments, setToolArguments] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ToolExecutionResult | null>(null);

  useEffect(() => {
    loadTools();
    loadServers();
    setupWebSocketListeners();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const data = await toolsAPI.listAllTools();
      setTools(data.servers);
    } catch (err) {
      console.error('Failed to load tools:', err);
      setError('Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const loadServers = async () => {
    try {
      const data = await serversAPI.getAllServerStatus();
      setServers(data);
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
  };

  const setupWebSocketListeners = () => {
    const handleToolsUpdate = (data: { servers: Record<number, ToolInfo[]> }) => {
      setTools(data.servers);
    };

    const handleToolExecutionResult = (data: { server_id: number; tool_name: string; result: ToolExecutionResult }) => {
      if (selectedTool && selectedTool.serverId === data.server_id && selectedTool.tool.name === data.tool_name) {
        setExecutionResult(data.result);
        setExecuting(false);
      }
    };

    websocketService.onToolsUpdate(handleToolsUpdate);
    websocketService.onToolExecutionResult(handleToolExecutionResult);
  };

  const handleExecuteTool = (serverId: number, tool: ToolInfo) => {
    setSelectedTool({ serverId, tool });

    // Initialize arguments with empty values or defaults from schema
    const initialArgs: Record<string, any> = {};
    if (tool.input_schema?.properties) {
      Object.entries(tool.input_schema.properties).forEach(([key, prop]: [string, any]) => {
        initialArgs[key] = prop.default || '';
      });
    }

    setToolArguments(initialArgs);
    setExecutionResult(null);
    setExecuteDialogOpen(true);
  };

  const executeTool = async () => {
    if (!selectedTool) return;

    try {
      setExecuting(true);
      const result = await toolsAPI.executeTool({
        server_id: selectedTool.serverId,
        tool_name: selectedTool.tool.name,
        arguments: toolArguments
      });
      setExecutionResult(result);
    } catch (err) {
      console.error('Failed to execute tool:', err);
      setExecutionResult({
        success: false,
        error: 'Failed to execute tool'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleArgumentChange = (key: string, value: any) => {
    setToolArguments(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getServerName = (serverId: number): string => {
    const server = servers.find(s => s.id === serverId);
    return server?.name || `Server ${serverId}`;
  };

  const getServerStatus = (serverId: number): string => {
    const server = servers.find(s => s.id === serverId);
    return server?.status || 'unknown';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading tools...</Typography>
      </Box>
    );
  }

  const totalTools = Object.values(tools).reduce((sum, serverTools) => sum + serverTools.length, 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Available Tools
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="body1">
          Found {totalTools} tools across {Object.keys(tools).length} connected servers
        </Typography>
      </Paper>

      {totalTools === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight={300}
          textAlign="center"
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Tools Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect to MCP servers to see their available tools here.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {Object.entries(tools).map(([serverId, serverTools]) => (
            <Grid item xs={12} key={serverId}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {getServerName(parseInt(serverId))}
                    </Typography>
                    <Chip
                      label={getServerStatus(parseInt(serverId))}
                      size="small"
                      color={getServerStatus(parseInt(serverId)) === 'connected' ? 'success' : 'default'}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    {serverTools.map((tool) => (
                      <Grid item xs={12} sm={6} md={4} key={tool.name}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="flex-start" mb={1}>
                              <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                                {tool.name}
                              </Typography>
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {tool.description}
                            </Typography>

                            {tool.input_schema?.properties && (
                              <Box mb={2}>
                                <Typography variant="caption" color="text.secondary">
                                  Parameters: {Object.keys(tool.input_schema.properties).join(', ')}
                                </Typography>
                              </Box>
                            )}

                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<ExecuteIcon />}
                              onClick={() => handleExecuteTool(parseInt(serverId), tool)}
                              disabled={getServerStatus(parseInt(serverId)) !== 'connected'}
                            >
                              Execute
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tool Execution Dialog */}
      <Dialog
        open={executeDialogOpen}
        onClose={() => !executing && setExecuteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Execute Tool: {selectedTool?.tool.name}
        </DialogTitle>
        <DialogContent>
          {selectedTool && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedTool.tool.description}
              </Typography>

              {selectedTool.tool.input_schema?.properties ? (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Parameters:
                  </Typography>
                  {Object.entries(selectedTool.tool.input_schema.properties).map(([key, prop]: [string, any]) => (
                    <TextField
                      key={key}
                      label={`${key}${selectedTool.tool.input_schema.required?.includes(key) ? ' *' : ''}`}
                      type={prop.type === 'number' ? 'number' : 'text'}
                      fullWidth
                      multiline={prop.type === 'string'}
                      rows={prop.type === 'string' ? 3 : 1}
                      value={toolArguments[key] || ''}
                      onChange={(e) => handleArgumentChange(key, e.target.value)}
                      sx={{ mb: 2 }}
                      required={selectedTool.tool.input_schema.required?.includes(key)}
                      helperText={prop.description}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  This tool doesn't require any parameters.
                </Typography>
              )}

              {executionResult && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Result:
                  </Typography>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography
                        color={executionResult.success ? 'success.main' : 'error.main'}
                      >
                        {executionResult.success ? '✓ Success' : '✗ Failed'}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {executionResult.success ? (
                        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                          {JSON.stringify(executionResult.result, null, 2)}
                        </pre>
                      ) : (
                        <Typography color="error">
                          {executionResult.error}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setExecuteDialogOpen(false)}
            disabled={executing}
          >
            Close
          </Button>
          <Button
            onClick={executeTool}
            variant="contained"
            disabled={executing || !selectedTool}
            startIcon={executing ? <CircularProgress size={16} /> : <ExecuteIcon />}
          >
            {executing ? 'Executing...' : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tools;