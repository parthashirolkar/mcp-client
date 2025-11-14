import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Chat as ChatIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const SidebarContainer = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'collapsed'
})<{ collapsed?: boolean }>(({ theme, collapsed }) => ({
  width: collapsed ? 60 : 280,
  height: '100vh',
  borderRadius: 0,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  backdropFilter: 'blur(10px)',
  borderRight: `1px solid ${theme.palette.divider}`,
  boxShadow: collapsed ? '2px 0 12px rgba(0,0,0,0.03)' : '4px 0 24px rgba(0,0,0,0.05)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  position: 'relative',
  '& *': {
    whiteSpace: collapsed ? 'nowrap' : 'normal',
  },
}));

const SidebarHeader = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'collapsed'
})<{ collapsed?: boolean }>(({ theme, collapsed }) => ({
  padding: collapsed ? theme.spacing(1.5) : theme.spacing(3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  flexShrink: 0,
  transition: 'padding 0.3s ease-in-out',
}));

const ConversationItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active?: boolean }>(({ theme, active }) => ({
  borderRadius: theme.spacing(1.5),
  margin: theme.spacing(0.5, 1.5),
  padding: theme.spacing(1.5),
  transition: 'all 0.2s ease-in-out',
  backgroundColor: active ? 'rgba(249,115,22,0.1)' : 'transparent',
  border: active ? `1px solid rgba(249,115,22,0.2)` : '1px solid transparent',
  '&:hover': {
    backgroundColor: active ? 'rgba(249,115,22,0.15)' : 'rgba(0,0,0,0.04)',
    transform: 'translateX(2px)',
  },
}));

const NewChatButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'collapsed'
})<{ collapsed?: boolean }>(({ theme, collapsed }) => ({
  width: collapsed ? 36 : 48,
  height: collapsed ? 36 : 48,
  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  boxShadow: collapsed ? '0 2px 8px rgba(249,115,22,0.25)' : '0 4px 12px rgba(249,115,22,0.3)',
  '&:hover': {
    background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
    transform: 'scale(1.05)',
    boxShadow: collapsed ? '0 4px 12px rgba(249,115,22,0.35)' : '0 6px 16px rgba(249,115,22,0.4)',
  },
  transition: 'all 0.2s ease-in-out',
}));

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  model?: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string | null;
  onConversationSelect: (id: string) => void;
  onNewChat: () => void;
  onConversationDelete: (id: string) => void;
  onConversationRename: (id: string, newTitle: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewChat,
  onConversationDelete,
  onConversationRename,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditStart = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleEditSave = (id: string) => {
    if (editTitle.trim()) {
      onConversationRename(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SidebarContainer elevation={0} collapsed={isCollapsed}>
      {/* Header */}
      <SidebarHeader collapsed={isCollapsed}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', mb: isCollapsed ? 1 : 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%' }}>
            <Avatar sx={{
              width: isCollapsed ? 32 : 36,
              height: isCollapsed ? 32 : 36,
              bgcolor: 'primary.main',
              fontSize: isCollapsed ? '0.8rem' : '1rem',
              flexShrink: 0
            }}>
              AI
            </Avatar>
            {!isCollapsed && (
              <>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2 }}>
                    AI Assistant
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                    {conversations.length} conversations
                  </Typography>
                </Box>
                <Tooltip title="New Chat">
                  <NewChatButton onClick={onNewChat} collapsed={isCollapsed}>
                    <AddIcon />
                  </NewChatButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {/* Search - only show when expanded */}
        {!isCollapsed && (
          <TextField
            size="small"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.12)' 
                  : 'rgba(255,255,255,0.8)',
                transition: 'all 0.2s ease-in-out',
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.16)' 
                    : 'rgba(255,255,255,0.9)',
                },
                '&.Mui-focused': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.2)' 
                    : 'rgba(255,255,255,0.95)',
                  boxShadow: '0 0 0 2px rgba(249,115,22,0.2)',
                },
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.text.primary,
                '&::placeholder': {
                  color: theme.palette.text.secondary,
                  opacity: 1,
                },
              },
            }}
          />
        )}
      </SidebarHeader>

      {/* Navigation */}
      <List sx={{ py: 1, px: 1 }}>
        <ListItem disablePadding>
          <ListItemButton sx={{ borderRadius: 2, mb: 0.5 }}>
            <ListItemIcon>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            {!isCollapsed && <ListItemText primary="Recent" primaryTypographyProps={{ fontSize: '0.9rem' }} />}
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton sx={{ borderRadius: 2 }}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            {!isCollapsed && <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.9rem' }} />}
          </ListItemButton>
        </ListItem>
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      {/* Conversations List */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {filteredConversations.length === 0 ? (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4,
            display: isCollapsed ? 'none' : 'block'
          }}>
            <ChatIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Start a new chat to begin
            </Typography>
          </Box>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              active={conversation.id === activeConversationId}
              onClick={() => onConversationSelect(conversation.id)}
            >
              <ListItemIcon>
                <ChatIcon
                  fontSize="small"
                  sx={{
                    color: conversation.id === activeConversationId ? 'primary.main' : 'text.secondary'
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  editingId === conversation.id ? (
                    <TextField
                      size="small"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(conversation.id);
                        if (e.key === 'Escape') handleEditCancel();
                      }}
                      onBlur={() => handleEditSave(conversation.id)}
                      autoFocus
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          borderRadius: 1,
                        },
                      }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                        {conversation.title}
                      </Typography>
                      {conversation.model && (
                        <Chip
                          label={conversation.model}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                    </Box>
                  )
                }
                secondary={
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {conversation.lastMessage}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                      {formatTimestamp(conversation.timestamp)} • {conversation.messageCount} messages
                    </Typography>
                  </Box>
                }
                primaryTypographyProps={{ fontSize: '0.9rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
              <Box sx={{ display: 'flex', opacity: 0.6, transition: 'opacity 0.2s' }}>
                <Tooltip title="Rename">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStart(conversation);
                    }}
                    sx={{ '&:hover': { opacity: 1 } }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConversationDelete(conversation.id);
                    }}
                    sx={{ '&:hover': { opacity: 1, color: 'error.main' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ConversationItem>
          ))
        )}
      </Box>
    </SidebarContainer>
  );
};

export default Sidebar;