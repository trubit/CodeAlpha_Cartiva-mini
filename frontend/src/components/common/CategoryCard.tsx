import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { CategoryWithChildrenDto } from '@shared/api.types';

interface CategoryCardProps {
  category: CategoryWithChildrenDto;
  imageUrl?: string;
  bgColor?: string;
}

// Fallback high-quality genuine product images for categories
const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  electronics:
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
  fashion:
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
  'home-living':
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
  beauty:
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
  sports:
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
  health:
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  books:
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
  groceries:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
};

const DEFAULT_BG_COLORS = [
  '#EEF4FF', // Soft Blue
  '#FFF7ED', // Soft Orange
  '#FEF3C7', // Soft Yellow
  '#F3E8FF', // Soft Purple
  '#ECFDF5', // Soft Green
  '#FDF2F8', // Soft Pink
];

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  imageUrl,
  bgColor,
}) => {
  const slugKey = Object.keys(DEFAULT_CATEGORY_IMAGES).find((k) =>
    category.slug.toLowerCase().includes(k)
  );
  const image =
    imageUrl ||
    category.imageUrl ||
    (slugKey ? DEFAULT_CATEGORY_IMAGES[slugKey] : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80');

  // Deterministic soft background based on category id length
  const resolvedBg =
    bgColor ||
    DEFAULT_BG_COLORS[category.name.length % DEFAULT_BG_COLORS.length];

  return (
    <Paper
      component={RouterLink}
      to={`/shop?category=${category.slug}`}
      elevation={0}
      sx={{
        p: 2,
        borderRadius: '18px',
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#1F2937' : resolvedBg),
        border: '1px solid',
        borderColor: (theme) => (theme.palette.mode === 'dark' ? '#374151' : 'rgba(226, 232, 240, 0.9)'),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        height: '100%',
        minHeight: 160,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px -4px rgba(16, 29, 59, 0.1)',
          borderColor: '#1557D5',
          '& .category-img': {
            transform: 'scale(1.08)',
          },
          '& .category-name': {
            color: '#1557D5',
          },
        },
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.5,
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={image}
          alt={category.name}
          className="category-img"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transition: 'transform 300ms ease',
          }}
          loading="lazy"
        />
      </Box>

      <Typography
        variant="subtitle2"
        className="category-name"
        sx={{
          fontWeight: 700,
          color: (theme) => (theme.palette.mode === 'dark' ? '#F8FAFC' : '#101D3B'),
          textAlign: 'center',
          fontSize: '0.88rem',
          lineHeight: 1.25,
          transition: 'color 200ms ease',
        }}
      >
        {category.name}
      </Typography>
    </Paper>
  );
};
