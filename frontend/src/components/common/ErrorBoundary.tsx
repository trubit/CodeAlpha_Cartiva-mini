import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="h4" color="error" gutterBottom fontWeight={700}>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              An unexpected application error occurred. You can return to the home page or try
              again.
            </Typography>
            {this.state.error && (
              <Box
                sx={{
                  p: 2,
                  my: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  overflowX: 'auto',
                }}
              >
                {this.state.error.message}
              </Box>
            )}
            <Button variant="contained" color="primary" onClick={this.handleReset} sx={{ mt: 2 }}>
              Return to Home
            </Button>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}
