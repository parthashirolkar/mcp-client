import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';

const BreadcrumbNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const pathnames = location.pathname.split('/').filter(x => x);

  const breadcrumbMap: Record<string, string> = {
    '': 'Dashboard',
    'servers': 'MCP Servers',
    'tools': 'Tools',
    'settings': 'Settings'
  };

  const getBreadcrumbLabel = (segment: string) => {
    return breadcrumbMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          color="inherit"
          onClick={() => navigate('/')}
        >
          <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
          Home
        </Link>
        {pathnames.map((segment, index) => {
          const isLast = index === pathnames.length - 1;
          const path = `/${pathnames.slice(0, index + 1).join('/')}`;

          return isLast ? (
            <Typography
              key={segment}
              color="text.primary"
              sx={{ fontWeight: 'medium' }}
            >
              {getBreadcrumbLabel(segment)}
            </Typography>
          ) : (
            <Link
              key={segment}
              underline="hover"
              color="inherit"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(path)}
            >
              {getBreadcrumbLabel(segment)}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default BreadcrumbNavigation;