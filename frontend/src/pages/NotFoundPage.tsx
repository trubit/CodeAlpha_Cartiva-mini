import React from 'react';
import { Container, Typography, Button, Paper, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  ExploreOutlined as ExploreIcon,
  SupportAgentOutlined as SupportIcon,
} from '@mui/icons-material';

export const NotFoundPage: React.FC = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
      <Paper
        elevation={0}
        className="cm-card"
        sx={{
          p: { xs: 4, sm: 6 },
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="overline" color="primary" fontWeight={800} letterSpacing="1.5px">
          LOOKING FOR SOMETHING SPECIAL?
        </Typography>
        <Typography
          variant="h2"
          fontWeight={900}
          color="text.primary"
          letterSpacing="-1.5px"
          sx={{ mt: 1, mb: 2 }}
        >
          We Couldn&apos;t Find That Page
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          paragraph
          lineHeight={1.7}
          sx={{ maxWidth: 440, mx: 'auto' }}
        >
          The piece you are looking for may have moved to a new collection, or the link may be
          outdated. Don&apos;t worry—our newest curated arrivals are waiting for you.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          sx={{ mt: 4 }}
        >
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            color="primary"
            size="large"
            startIcon={<ExploreIcon />}
            sx={{ px: 3.5, py: 1.5, fontWeight: 700, borderRadius: '10px' }}
          >
            Explore Curated Collections
          </Button>
          <Button
            component={RouterLink}
            to="/#our-story"
            variant="outlined"
            color="inherit"
            size="large"
            startIcon={<SupportIcon />}
            sx={{ px: 3, py: 1.5, fontWeight: 600, borderRadius: '10px', borderColor: 'divider' }}
          >
            Customer Care
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};
