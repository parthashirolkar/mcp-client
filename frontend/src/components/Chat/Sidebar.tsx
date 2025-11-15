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
  borderRadius: theme.spacing(2),
  margin: theme.spacing(0.75, 1.5),
  padding: theme.spacing(1.5, 2),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: active ? 'rgba(249,115,22,0.15)' : 'transparent',
  border: active ? `1px solid rgba(249,115,22,0.3)` : '1px solid transparent',
  backdropFilter: active ? 'blur(10px)' : 'none',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: active ? 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.05) 100%)' : 'none',
    borderRadius: 'inherit',
    opacity: active ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
  },
  '&:hover': {
    backgroundColor: active ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.08)',
    transform: 'translateX(4px) scale(1.01)',
    boxShadow: active ? '0 4px 16px rgba(249,115,22,0.25)' : '0 2px 8px rgba(0,0,0,0.1)',
    border: active ? `1px solid rgba(249,115,22,0.4)` : '1px solid rgba(249,115,22,0.2)',
    '&::before': {
      opacity: 1,
    },
  },
  '&:active': {
    transform: active ? 'translateX(2px) scale(0.99)' : 'translateX(2px) scale(0.99)',
  },
}));

const NewChatButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'collapsed'
})<{ collapsed?: boolean }>(({ theme, collapsed }) => ({
  width: collapsed ? 40 : 52,
  height: collapsed ? 40 : 52,
  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
  boxShadow: collapsed ? '0 4px 12px rgba(249,115,22,0.3)' : '0 6px 20px rgba(249,115,22,0.4)',
  border: '1px solid rgba(249,115,22,0.2)',
  '&:hover': {
    background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
    transform: 'scale(1.08) rotate(90deg)',
    boxShadow: collapsed ? '0 6px 20px rgba(249,115,22,0.45)' : '0 8px 25px rgba(249,115,22,0.5)',
    border: '1px solid rgba(249,115,22,0.4)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '& .MuiSvgIcon-root': {
    color: 'white',
    fontSize: collapsed ? '1.2rem' : '1.4rem',
    transition: 'all 0.3s ease-in-out',
  },
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
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          mb: isCollapsed ? 2 : 2,
          width: '100%'
        }}>
          {isCollapsed ? (
            <Avatar sx={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              fontSize: '0.8rem',
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
              border: '2px solid rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 6px 16px rgba(249,115,22,0.4)',
              }
            }}>
              AI
            </Avatar>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
              <Avatar sx={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                fontSize: '1rem',
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                border: '2px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 16px rgba(249,115,22,0.4)',
                }
              }}>
                AI
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  lineHeight: 1.2,
                  color: 'text.primary',
                  mb: 0.25
                }}>
                  AI Assistant
                </Typography>
                <Typography variant="caption" sx={{
                  color: 'text.secondary',
                  lineHeight: 1,
                  display: 'block'
                }}>
                  {conversations.length} conversations
                </Typography>
              </Box>
              <Tooltip title="New Chat">
                <NewChatButton onClick={onNewChat} collapsed={isCollapsed}>
                  <AddIcon />
                </NewChatButton>
              </Tooltip>
            </Box>
          )}
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
      <List sx={{ py: 1, px: isCollapsed ? 1 : 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            sx={{
              borderRadius: 2.5,
              mb: 0.75,
              px: isCollapsed ? 1 : 2,
              py: isCollapsed ? 1.5 : 1,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(249,115,22,0.1)',
                transform: isCollapsed ? 'scale(1.05)' : 'translateX(4px) scale(1.02)',
                '& .MuiListItemIcon-root': {
                  color: '#f97316',
                  transform: 'scale(1.1) rotate(5deg)',
                },
                '& .MuiListItemText-primary': {
                  color: '#f97316',
                  fontWeight: 600,
                }
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: isCollapsed ? 'auto' : 40,
                justifyContent: 'center'
              }}
            >
              <HistoryIcon
                fontSize="small"
                sx={{
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </ListItemIcon>
            {!isCollapsed && <ListItemText primary="Recent" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />}
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            sx={{
              borderRadius: 2.5,
              px: isCollapsed ? 1 : 2,
              py: isCollapsed ? 1.5 : 1,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(249,115,22,0.1)',
                transform: isCollapsed ? 'scale(1.05)' : 'translateX(4px) scale(1.02)',
                '& .MuiListItemIcon-root': {
                  color: '#f97316',
                  transform: 'scale(1.1) rotate(5deg)',
                },
                '& .MuiListItemText-primary': {
                  color: '#f97316',
                  fontWeight: 600,
                }
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: isCollapsed ? 'auto' : 40,
                justifyContent: 'center'
              }}
            >
              <SettingsIcon
                fontSize="small"
                sx={{
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </ListItemIcon>
            {!isCollapsed && <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />}
          </ListItemButton>
        </ListItem>
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      {/* Conversations List */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {filteredConversations.length === 0 ? (
          <Box sx={{
            textAlign: 'center',
            py: 6,
            display: isCollapsed ? 'none' : 'block',
            px: 3
          }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                border: '2px solid rgba(249,115,22,0.2)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.05) rotate(10deg)',
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.08) 100%)',
                }
              }}
            >
              <ChatIcon sx={{ fontSize: 36, color: '#f97316' }} />
            </Box>
            <Typography variant="body2" sx={{
              color: 'text.primary',
              fontWeight: 600,
              mb: 1,
              fontSize: '0.95rem'
            }}>
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </Typography>
            <Typography variant="caption" sx={{
              color: 'text.secondary',
              display: 'block',
              lineHeight: 1.5
            }}>
              {searchQuery ? 'Try adjusting your search terms' : 'Click the + button to start your first conversation'}
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
                          sx={{
                            fontSize: '0.7rem',
                            height: 22,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.05) 100%)',
                            borderColor: 'rgba(249,115,22,0.3)',
                            color: '#f97316',
                            '&:hover': {
                              background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.08) 100%)',
                              transform: 'scale(1.05)',
                            }
                          }}
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