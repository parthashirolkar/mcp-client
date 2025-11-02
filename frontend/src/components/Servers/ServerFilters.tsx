import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Button,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { ServerStatus } from '../../types/mcp';

interface ServerFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: ServerStatus | 'all';
  onStatusFilterChange: (status: ServerStatus | 'all') => void;
  connectionTypeFilter: 'all' | 'stdio' | 'http';
  onConnectionTypeFilterChange: (type: 'all' | 'stdio' | 'http') => void;
  enabledFilter: 'all' | 'enabled' | 'disabled';
  onEnabledFilterChange: (filter: 'all' | 'enabled' | 'disabled') => void;
  onClearFilters: () => void;
  totalServers: number;
  filteredServers: number;
}

const ServerFilters: React.FC<ServerFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  connectionTypeFilter,
  onConnectionTypeFilterChange,
  enabledFilter,
  onEnabledFilterChange,
  onClearFilters,
  totalServers,
  filteredServers
}) => {
  const hasActiveFilters = searchTerm || statusFilter !== 'all' ||
                          connectionTypeFilter !== 'all' || enabledFilter !== 'all';

  return (
    <Box sx={{ mb: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          MCP Servers
        </Typography>
        {hasActiveFilters && (
          <Tooltip title="Clear all filters">
            <IconButton onClick={onClearFilters} size="small">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search servers by name, command, or URL..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          endAdornment: searchTerm && (
            <IconButton onClick={() => onSearchChange('')} size="small">
              <ClearIcon />
            </IconButton>
          )
        }}
        sx={{ mb: 2 }}
      />

      {/* Filter Controls */}
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => onStatusFilterChange(e.target.value as ServerStatus | 'all')}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value={ServerStatus.CONNECTED}>Connected</MenuItem>
            <MenuItem value={ServerStatus.CONNECTING}>Connecting</MenuItem>
            <MenuItem value={ServerStatus.DISCONNECTED}>Disconnected</MenuItem>
            <MenuItem value={ServerStatus.ERROR}>Error</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Connection Type</InputLabel>
          <Select
            value={connectionTypeFilter}
            label="Connection Type"
            onChange={(e) => onConnectionTypeFilterChange(e.target.value as 'all' | 'stdio' | 'http')}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="stdio">STDIO</MenuItem>
            <MenuItem value="http">HTTP</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Enabled</InputLabel>
          <Select
            value={enabledFilter}
            label="Enabled"
            onChange={(e) => onEnabledFilterChange(e.target.value as 'all' | 'enabled' | 'disabled')}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="enabled">Enabled</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </Select>
        </FormControl>

        {/* Results Count */}
        <Box display="flex" alignItems="center" gap={1} sx={{ ml: 'auto' }}>
          <FilterIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Showing {filteredServers} of {totalServers} servers
          </Typography>
        </Box>
      </Box>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <Box display="flex" gap={1} mt={2} flexWrap="wrap">
          {searchTerm && (
            <Chip
              label={`Search: "${searchTerm}"`}
              onDelete={() => onSearchChange('')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {statusFilter !== 'all' && (
            <Chip
              label={`Status: ${statusFilter}`}
              onDelete={() => onStatusFilterChange('all')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {connectionTypeFilter !== 'all' && (
            <Chip
              label={`Type: ${connectionTypeFilter.toUpperCase()}`}
              onDelete={() => onConnectionTypeFilterChange('all')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {enabledFilter !== 'all' && (
            <Chip
              label={`Enabled: ${enabledFilter}`}
              onDelete={() => onEnabledFilterChange('all')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default ServerFilters;