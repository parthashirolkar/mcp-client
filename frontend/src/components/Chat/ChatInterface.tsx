import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  Fade,
  Alert,
  useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as UserIcon,
  Build as ToolIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import Sidebar from './Sidebar';
import { useAppTheme } from '../../context/ThemeContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
}

interface ToolCall {
  tool: string;
  arguments: Record<string, any>;
  id?: string;
}

interface ToolResult {
  tool: string;
  arguments: Record<string, any>;
  result: any;
  success: boolean;
  error?: string;
  execution_time?: number;
}

interface Conversation {
  conversation_id: string;
  created_at: string;
  message_count: number;
  model: string;
  system_prompt: string;
}

const MainContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  backgroundColor: 'transparent',
}));

const ChatArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
}));

const ChatContainer = styled(Paper)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  backdropFilter: 'blur(10px)',
  margin: theme.spacing(2),
  borderRadius: theme.spacing(3),
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0,0,0,0.3)'
    : '0 8px 32px rgba(0,0,0,0.1)',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255,255,255,0.1)'
    : '1px solid rgba(255,255,255,0.2)',
  overflow: 'hidden',
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
  scrollBehavior: 'smooth',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.divider,
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.text.secondary,
  },
}));

const MessageWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  alignItems: 'flex-start',
  justifyContent: isUser ? 'flex-end' : 'flex-start',
  animation: 'messageSlideIn 0.3s ease-out',
  '@keyframes messageSlideIn': {
    from: {
      opacity: 0,
      transform: 'translateY(10px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
}));

const MessageAvatar = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: isUser
    ? theme.palette.primary.main
    : theme.palette.secondary.main,
  color: theme.palette.primary.contrastText,
  fontSize: '1rem',
  fontWeight: 600,
  flexShrink: 0,
}));

const MessageContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  maxWidth: '65%',
  minWidth: '120px',
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  padding: theme.spacing(2, 2.5),
  borderRadius: theme.spacing(2),
  background: isUser
    ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
    : theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.95) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
  color: isUser
    ? '#ffffff'
    : theme.palette.mode === 'dark'
    ? '#e5e7eb'
    : '#1f2937',
  boxShadow: isUser
    ? '0 4px 12px rgba(249, 115, 22, 0.25)'
    : theme.palette.mode === 'dark'
    ? '0 2px 8px rgba(0, 0, 0, 0.3)'
    : '0 2px 8px rgba(0, 0, 0, 0.06)',
  border: isUser ? 'none' : `1px solid ${theme.palette.divider}`,
  position: 'relative',
  transition: 'all 0.2s ease',
  backdropFilter: 'blur(10px)',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: isUser
      ? '0 6px 16px rgba(249, 115, 22, 0.3)'
      : theme.palette.mode === 'dark'
      ? '0 4px 12px rgba(0, 0, 0, 0.4)'
      : '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  // Enhanced markdown styling inside bubbles
  '& .markdown-content': {
    color: 'inherit',
    '& h1, h2, h3, h4, h5, h6': {
      color: 'inherit',
      marginTop: theme.spacing(1.5),
      marginBottom: theme.spacing(1),
    },
    '& p': {
      color: 'inherit',
      marginBottom: theme.spacing(1),
    },
    '& code': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.1)',
      color: isUser
        ? '#ffffff'
        : theme.palette.mode === 'dark'
        ? '#fbbf24'
        : '#dc2626',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '0.875em',
    },
    '& pre': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(0, 0, 0, 0.3)'
        : 'rgba(0, 0, 0, 0.05)',
      color: 'inherit',
      padding: theme.spacing(1.5),
      borderRadius: theme.spacing(1),
      overflow: 'auto',
      border: `1px solid ${theme.palette.divider}`,
    },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
      '& th, & td': {
        border: `1px solid ${theme.palette.divider}`,
        padding: theme.spacing(0.75),
        textAlign: 'left',
        color: 'inherit',
      },
      '& th': {
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.05)',
        fontWeight: 600,
        color: 'inherit',
      },
    },
    '& ul, ol': {
      color: 'inherit',
      marginBottom: theme.spacing(1),
      '& li': {
        color: 'inherit',
        marginBottom: theme.spacing(0.25),
      },
    },
    '& strong': {
      color: 'inherit',
      fontWeight: 600,
    },
    '& em': {
      color: 'inherit',
      fontStyle: 'italic',
    },
  },
  }));

const MessageTimestamp = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textAlign: 'center',
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5, 3),
  borderTop: `1px solid ${theme.palette.divider}`,
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, rgba(20,20,20,0.95) 100%)`
    : `linear-gradient(180deg, ${theme.palette.background.paper} 0%, rgba(248,250,252,0.95) 100%)`,
  backdropFilter: 'blur(10px)',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 -2px 10px rgba(0, 0, 0, 0.3)'
    : '0 -2px 10px rgba(0, 0, 0, 0.05)',
}));

const InputWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  alignItems: 'flex-end',
  maxWidth: '100%',
}));

const SendButton = styled(IconButton)<{ disabled?: boolean }>(({ theme, disabled }) => ({
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: disabled
    ? theme.palette.action.disabled
    : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  boxShadow: disabled
    ? 'none'
    : '0 4px 12px rgba(249, 115, 22, 0.3)',
  transition: 'all 0.2s ease-in-out',
  '&:hover:not(:disabled)': {
    background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
    transform: 'scale(1.05)',
    boxShadow: '0 6px 16px rgba(249, 115, 22, 0.4)',
  },
  '&:active:not(:disabled)': {
    transform: 'scale(0.95)',
  },
}));

const ToolCallChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25, 0.5),
  fontSize: '0.7rem',
  height: 'auto',
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.palette.info.light,
  color: theme.palette.info.main,
  border: `1px solid ${theme.palette.info.main}`,
  '& .MuiChip-icon': {
    color: theme.palette.info.main,
    fontSize: '0.875rem',
  },
}));

const ToolResultContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
}));

const LoadingBubble = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 2.5),
  borderRadius: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  border: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  animation: 'pulse 1.5s ease-in-out infinite',
  '@keyframes pulse': {
    '0%, 100%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.7,
    },
  },
}));

const ChatInterface: React.FC = () => {
  const theme = useTheme();
  const { toggleMode, isDarkMode } = useAppTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Conversation management state
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/agent/conversations`, {
        // Let the backend handle the system prompt properly
        model: null // Let the agent choose the best model
      });

      setConversation(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to initialize conversation');
      console.error('Error initializing conversation:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !conversation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/agent/conversations/${conversation.conversation_id}/messages`,
        { message: userMessage.content }
      );

      // Debug: Log the actual response structure
      console.log('🔍 DEBUG: Full response:', response.data);
      console.log('🔍 DEBUG: Response structure:', JSON.stringify(response.data, null, 2));

      // Handle different response structures
      let content = 'No response received';
      if (response.data.response?.response?.content) {
        content = response.data.response.response.content;
      } else if (response.data.response?.followup_response?.response?.content) {
        content = response.data.response.followup_response.response.content;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: content,
        timestamp: new Date().toISOString(),
        tool_calls: response.data.tool_calls || [],
        tool_results: response.data.tool_results || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderToolCall = (toolCall: ToolCall) => (
    <ToolCallChip
      key={toolCall.id || toolCall.tool}
      icon={<ToolIcon />}
      label={`${toolCall.tool}`}
      size="small"
      variant="outlined"
      title={JSON.stringify(toolCall.arguments, null, 2)}
    />
  );

  const renderToolResult = (toolResult: ToolResult) => (
    <ToolResultContainer key={toolResult.tool}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        {toolResult.success ? (
          <SuccessIcon color="success" fontSize="small" />
        ) : (
          <ErrorIcon color="error" fontSize="small" />
        )}
        <Typography variant="caption" sx={{
          fontWeight: 600,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {toolResult.tool}
          {toolResult.execution_time && (
            <span style={{ marginLeft: '8px', opacity: 0.7 }}>
              ({toolResult.execution_time}ms)
            </span>
          )}
        </Typography>
      </Box>
      <Box sx={{
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        p: 1.5,
        maxHeight: 200,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme.palette.divider,
          borderRadius: '2px',
        },
      }}>
        <Typography variant="body2" component="pre" sx={{
          fontSize: '0.8rem',
          lineHeight: 1.5,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: theme.palette.text.primary,
        }}>
          {typeof toolResult.result === 'string'
            ? toolResult.result
            : JSON.stringify(toolResult.result, null, 2)
          }
        </Typography>
      </Box>
    </ToolResultContainer>
  );

  // Conversation management handlers
  const handleNewChat = () => {
    initializeConversation();
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleConversationSelect = (id: string) => {
    setActiveConversationId(id);
    // TODO: Load conversation messages
    console.log('Selected conversation:', id);
  };

  const handleConversationDelete = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (activeConversationId === id) {
      handleNewChat();
    }
  };

  const handleConversationRename = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === id ? { ...conv, title: newTitle } : conv
    ));
  };

  return (
    <MainContainer>
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
        onConversationDelete={handleConversationDelete}
        onConversationRename={handleConversationRename}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <ChatArea>
        <ChatContainer>
      <ChatHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.05)',
                },
              }}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <MenuIcon />
            </IconButton>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                AI Agent Chat
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {conversation ? `Model: ${conversation.model || 'Auto-selected'}` : 'Initializing...'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={toggleMode}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.05)',
                },
              }}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: conversation ? 'success.main' : 'warning.main',
              animation: conversation ? 'pulse 2s infinite' : 'none'
            }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {conversation ? 'Connected' : 'Connecting...'}
            </Typography>
          </Box>
        </Box>
      </ChatHeader>

      {error && (
        <Box sx={{ mx: 3, mt: 2 }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        </Box>
      )}

      <MessagesContainer>
        {messages.map((message) => (
          <MessageWrapper key={message.id} isUser={message.role === 'user'}>
            {message.role === 'assistant' && (
              <MessageAvatar isUser={false}>
                <BotIcon fontSize="small" />
              </MessageAvatar>
            )}

            <MessageContent isUser={message.role === 'user'}>
              <MessageBubble isUser={message.role === 'user'}>
                {message.role === 'user' ? (
                  // User messages render as plain text
                  <Typography variant="body1" component="div" sx={{ lineHeight: 1.6 }}>
                    {message.content.split('\n').map((paragraph, index) => (
                      <Typography key={index} sx={{ mb: paragraph.trim() === '' ? 0 : 1 }}>
                        {paragraph}
                      </Typography>
                    ))}
                  </Typography>
                ) : (
                  // Assistant messages render as markdown
                  <Box className="markdown-content" sx={{
                    '& a': {
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }
                  }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                      // @ts-ignore - ReactMarkdown component types
                      p: ({children}: any) => <Typography variant="body1" component="div" sx={{ mb: 1, '&:last-child': { mb: 0 } }}>{children}</Typography>,
                      // @ts-ignore - ReactMarkdown component types
                      code: ({inline, children}: any) => {
                        if (inline) {
                          return <Box component="code" sx={{
                            backgroundColor: 'transparent',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.875em'
                          }}>{children}</Box>
                        }
                        return <Box component="code" sx={{
                          display: 'block',
                          backgroundColor: 'transparent',
                          padding: 1,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontFamily: 'monospace',
                          fontSize: '0.875em',
                          whiteSpace: 'pre-wrap'
                        }}>{children}</Box>
                      },
                      // @ts-ignore - ReactMarkdown component types
                      pre: ({children}: any) => <Box component="pre" sx={{
                        backgroundColor: 'transparent',
                        padding: 0,
                        borderRadius: 0,
                        overflow: 'auto',
                        mb: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875em',
                        margin: 0
                      }}>{children}</Box>
                    }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </Box>
                )}

                {message.tool_calls && message.tool_calls.length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="caption" sx={{
                      mb: 1.5,
                      display: 'block',
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '0.7rem'
                    }}>
                      Tools Used
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {message.tool_calls.map(renderToolCall)}
                    </Box>
                  </Box>
                )}

                {message.tool_results && message.tool_results.length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="caption" sx={{
                      mb: 1.5,
                      display: 'block',
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '0.7rem'
                    }}>
                      Tool Results
                    </Typography>
                    {message.tool_results.map(renderToolResult)}
                  </Box>
                )}
              </MessageBubble>
              <MessageTimestamp variant="caption">
                {formatTimestamp(message.timestamp)}
              </MessageTimestamp>
            </MessageContent>

            {message.role === 'user' && (
              <MessageAvatar isUser={true}>
                <UserIcon fontSize="small" />
              </MessageAvatar>
            )}
          </MessageWrapper>
        ))}

        {isLoading && (
          <MessageWrapper isUser={false}>
            <MessageAvatar isUser={false}>
              <BotIcon fontSize="small" />
            </MessageAvatar>
            <MessageContent isUser={false}>
              <LoadingBubble>
                <CircularProgress size={20} thickness={4} />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Thinking...
                </Typography>
              </LoadingBubble>
            </MessageContent>
          </MessageWrapper>
        )}

        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <InputWrapper>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading || !conversation}
            variant="outlined"
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                backgroundColor: 'background.paper',
                '& fieldset': {
                  borderColor: 'divider',
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                },
              },
            }}
          />
          <SendButton
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || !conversation}
          >
            {isLoading ? (
              <CircularProgress size={20} thickness={3} />
            ) : (
              <SendIcon />
            )}
          </SendButton>
        </InputWrapper>
      </InputContainer>
    </ChatContainer>
      </ChatArea>
    </MainContainer>
  );
};

export default ChatInterface;