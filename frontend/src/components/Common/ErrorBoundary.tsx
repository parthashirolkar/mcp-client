import React, { Component, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowDown as ExpandMore
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, showDetails: false });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
          <Paper sx={{ p: 4, maxWidth: 600, width: '100%' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <ErrorIcon color="error" sx={{ fontSize: 32 }} />
              <Typography variant="h5" color="error">
                Oops! Something went wrong
              </Typography>
            </Box>

            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>Application Error</AlertTitle>
              <Typography variant="body2" gutterBottom>
                We're sorry, but something unexpected happened. This error has been logged and our team will look into it.
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary" paragraph>
              You can try refreshing the page, or if the problem persists, please contact support.
            </Typography>

            <Box display="flex" gap={2} mb={3}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </Box>

            {this.state.error && (
              <Box>
                <Button
                  startIcon={<ExpandMore />}
                  onClick={this.toggleDetails}
                  sx={{ mb: 1 }}
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                </Button>

                <Collapse in={this.state.showDetails}>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: 200
                    }}
                  >
                    <strong>Error:</strong> {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        <br />
                        <strong>Stack:</strong>
                        <br />
                        {this.state.error.stack}
                      </>
                    )}
                    {this.state.errorInfo && (
                      <>
                        <br />
                        <strong>Component Stack:</strong>
                        <br />
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;