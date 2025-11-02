import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import {
  MCPServerConfigCreate,
  MCPServerConfigUpdate,
  ConnectionType,
  MCPServerConfig
} from '../../types/mcp';

interface ServerConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: MCPServerConfigCreate | MCPServerConfigUpdate) => Promise<void>;
  editingServer?: MCPServerConfig;
  loading?: boolean;
}

const ServerConfigForm: React.FC<ServerConfigFormProps> = ({
  open,
  onClose,
  onSubmit,
  editingServer,
  loading = false
}) => {
  const [formData, setFormData] = useState<MCPServerConfigCreate>({
    name: editingServer?.name || '',
    connection_type: editingServer?.connection_type || ConnectionType.STDIO,
    command: editingServer?.command || '',
    args: editingServer?.args || [],
    url: editingServer?.url || '',
    headers: editingServer?.headers || {},
    timeout: editingServer?.timeout || 30,
    retry_count: editingServer?.retry_count || 3,
    enabled: editingServer?.enabled ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newArg, setNewArg] = useState('');
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  React.useEffect(() => {
    if (editingServer) {
      setFormData({
        name: editingServer.name,
        connection_type: editingServer.connection_type,
        command: editingServer.command || '',
        args: editingServer.args || [],
        url: editingServer.url || '',
        headers: editingServer.headers || {},
        timeout: editingServer.timeout,
        retry_count: editingServer.retry_count,
        enabled: editingServer.enabled,
      });
    } else {
      setFormData({
        name: '',
        connection_type: ConnectionType.STDIO,
        command: '',
        args: [],
        url: '',
        headers: {},
        timeout: 30,
        retry_count: 3,
        enabled: true,
      });
    }
    setErrors({});
  }, [editingServer, open]);

  const handleChange = (field: keyof MCPServerConfigCreate) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Server name is required';
    }

    if (formData.connection_type === ConnectionType.STDIO) {
      if (!formData.command?.trim()) {
        newErrors.command = 'Command is required for stdio connections';
      }
    }

    if (formData.connection_type === ConnectionType.HTTP) {
      if (!formData.url?.trim()) {
        newErrors.url = 'URL is required for HTTP connections';
      } else {
        try {
          new URL(formData.url);
        } catch {
          newErrors.url = 'Please enter a valid URL';
        }
      }
    }

    if (formData.timeout && formData.timeout < 1) {
      newErrors.timeout = 'Timeout must be at least 1 second';
    }

    if (formData.retry_count && formData.retry_count < 0) {
      newErrors.retry_count = 'Retry count must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save server:', error);
    }
  };

  const addArg = () => {
    if (newArg.trim()) {
      setFormData(prev => ({
        ...prev,
        args: [...prev.args, newArg.trim()]
      }));
      setNewArg('');
    }
  };

  const removeArg = (index: number) => {
    setFormData(prev => ({
      ...prev,
      args: prev.args.filter((_, i) => i !== index)
    }));
  };

  const addHeader = () => {
    if (newHeaderKey.trim() && newHeaderValue.trim()) {
      setFormData(prev => ({
        ...prev,
        headers: {
          ...prev.headers,
          [newHeaderKey.trim()]: newHeaderValue.trim()
        }
      }));
      setNewHeaderKey('');
      setNewHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...formData.headers };
    delete newHeaders[key];
    setFormData(prev => ({
      ...prev,
      headers: newHeaders
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingServer ? 'Edit MCP Server' : 'Add MCP Server'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Basic Configuration */}
            <Grid item xs={12}>
              <TextField
                label="Server Name"
                fullWidth
                value={formData.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.connection_type}>
                <InputLabel>Connection Type</InputLabel>
                <Select
                  value={formData.connection_type}
                  label="Connection Type"
                  onChange={handleChange('connection_type')}
                >
                  <MenuItem value={ConnectionType.STDIO}>STDIO</MenuItem>
                  <MenuItem value={ConnectionType.HTTP}>HTTP</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                }
                label="Enable Server"
              />
            </Grid>

            {/* Connection-specific Configuration */}
            {formData.connection_type === ConnectionType.STDIO ? (
              <>
                <Grid item xs={12}>
                  <TextField
                    label="Command"
                    fullWidth
                    value={formData.command}
                    onChange={handleChange('command')}
                    error={!!errors.command}
                    helperText={errors.command || 'Command to execute (e.g., python, node)'}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Arguments
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {formData.args.map((arg, index) => (
                      <Chip
                        key={index}
                        label={arg}
                        onDelete={() => removeArg(index)}
                        deleteIcon={<RemoveIcon />}
                        variant="outlined"
                      />
                    ))}
                    <Box display="flex" gap={1}>
                      <TextField
                        size="small"
                        placeholder="Add argument"
                        value={newArg}
                        onChange={(e) => setNewArg(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addArg()}
                        fullWidth
                      />
                      <Button onClick={addArg} variant="outlined" startIcon={<AddIcon />}>
                        Add
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <TextField
                    label="URL"
                    fullWidth
                    value={formData.url}
                    onChange={handleChange('url')}
                    error={!!errors.url}
                    helperText={errors.url || 'HTTP endpoint URL'}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Headers
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {Object.entries(formData.headers).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key}: ${value}`}
                        onDelete={() => removeHeader(key)}
                        deleteIcon={<RemoveIcon />}
                        variant="outlined"
                      />
                    ))}
                    <Box display="flex" gap={1}>
                      <TextField
                        size="small"
                        placeholder="Header name"
                        value={newHeaderKey}
                        onChange={(e) => setNewHeaderKey(e.target.value)}
                        sx={{ minWidth: 150 }}
                      />
                      <TextField
                        size="small"
                        placeholder="Header value"
                        value={newHeaderValue}
                        onChange={(e) => setNewHeaderValue(e.target.value)}
                        fullWidth
                      />
                      <Button onClick={addHeader} variant="outlined" startIcon={<AddIcon />}>
                        Add
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </>
            )}

            {/* Advanced Configuration */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Configuration</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Timeout (seconds)"
                        type="number"
                        fullWidth
                        value={formData.timeout}
                        onChange={handleChange('timeout')}
                        error={!!errors.timeout}
                        helperText={errors.timeout}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Retry Count"
                        type="number"
                        fullWidth
                        value={formData.retry_count}
                        onChange={handleChange('retry_count')}
                        error={!!errors.retry_count}
                        helperText={errors.retry_count}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>

          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Please fix the errors above before submitting.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {editingServer ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ServerConfigForm;