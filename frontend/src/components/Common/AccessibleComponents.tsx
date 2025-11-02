import React, { useRef, useEffect } from 'react';
import { Box, BoxProps } from '@mui/material';

// Accessible status announcer for screen readers
export const StatusAnnouncer: React.FC<{
  message: string;
  priority?: 'polite' | 'assertive';
  timeout?: number;
}> = ({ message, priority = 'polite', timeout = 5000 }) => {
  const [announcement, setAnnouncement] = React.useState(message);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  useEffect(() => {
    setAnnouncement(message);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('');
      }, timeout);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, timeout]);

  return (
    <Box
      component="div"
      aria-live={priority}
      aria-atomic="true"
      sx={{
        position: 'absolute',
        left: -10000,
        top: 'auto',
        width: 1,
        height: 1,
        overflow: 'hidden',
      }}
    >
      {announcement}
    </Box>
  );
};

// Focus management hook
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
    }
  };

  const focusFirst = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement && typeof firstElement.focus === 'function') {
      firstElement.focus();
    }
  };

  const trapFocus = (container: HTMLElement) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const focusableElements = container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  };

  return {
    saveFocus,
    restoreFocus,
    focusFirst,
    trapFocus,
  };
};

// Accessible card component
interface AccessibleCardProps extends BoxProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  children,
  title,
  subtitle,
  action,
  selected = false,
  onClick,
  ...props
}) => {
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <Box
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={title}
      aria-describedby={subtitle ? `${title}-subtitle` : undefined}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      sx={{
        p: 2,
        border: selected ? '2px solid' : '2px solid transparent',
        borderColor: selected ? 'primary.main' : 'transparent',
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        '&:focus': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px',
        },
        '&:hover': onClick ? {
          backgroundColor: 'action.hover',
        } : {},
        ...props.sx,
      }}
      {...props}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              id={`${title}-subtitle`}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
};

// Skip link component for accessibility
export const SkipLink: React.FC<{
  href: string;
  children: React.ReactNode;
}> = ({ href, children }) => (
  <Box
    component="a"
    href={href}
    sx={{
      position: 'absolute',
      top: -40,
      left: 6,
      background: 'primary.main',
      color: 'primary.contrastText',
      padding: 1,
      textDecoration: 'none',
      borderRadius: 1,
      zIndex: 9999,
      '&:focus': {
        top: 6,
      },
    }}
  >
    {children}
  </Box>
);

// Keyboard navigation provider
export const KeyboardNavigationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Alt + S: Skip to main content
      if (event.altKey && event.key === 's') {
        event.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          mainContent.scrollIntoView();
        }
      }

      // Alt + N: Skip to navigation
      if (event.altKey && event.key === 'n') {
        event.preventDefault();
        const nav = document.querySelector('nav[role="navigation"]');
        if (nav) {
          const firstFocusable = nav.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }

      // Escape: Close modals/dropdowns
      if (event.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        const closeButtons = document.querySelectorAll('[data-close-modal]');
        closeButtons.forEach(button => {
          if ((button as HTMLElement).contains(activeElement)) {
            (button as HTMLElement).click();
          }
        });
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return <>{children}</>;
};

// Accessible progress indicator
export const AccessibleProgress: React.FC<{
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
}> = ({ value, max = 100, label, showValue = true }) => (
  <Box role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
      <Typography variant="body2">{label}</Typography>
      {showValue && (
        <Typography variant="body2" color="text.secondary">
          {Math.round((value / max) * 100)}%
        </Typography>
      )}
    </Box>
    <Box
      sx={{
        height: 8,
        backgroundColor: 'grey.200',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: '100%',
          backgroundColor: 'primary.main',
          width: `${(value / max) * 100}%`,
          transition: 'width 0.3s ease',
        }}
      />
    </Box>
  </Box>
);

// Accessible status chip with better screen reader support
export const AccessibleStatusChip: React.FC<{
  status: string;
  color?: 'success' | 'warning' | 'error' | 'info' | 'default';
  icon?: React.ReactNode;
  ariaLabel?: string;
}> = ({ status, color = 'default', icon, ariaLabel }) => (
  <Box
    component="span"
    role="status"
    aria-label={ariaLabel || `Status: ${status}`}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
      px: 2,
      py: 1,
      borderRadius: 1,
      fontSize: '0.75rem',
      fontWeight: 500,
      backgroundColor: color === 'success' ? 'success.light' :
                      color === 'warning' ? 'warning.light' :
                      color === 'error' ? 'error.light' :
                      color === 'info' ? 'info.light' :
                      'grey.100',
      color: color === 'success' ? 'success.contrastText' :
              color === 'warning' ? 'warning.contrastText' :
              color === 'error' ? 'error.contrastText' :
              color === 'info' ? 'info.contrastText' :
              'text.secondary',
    }}
  >
    {icon}
    <span aria-hidden="true">{status}</span>
  </Box>
);

export default {
  StatusAnnouncer,
  useFocusManagement,
  AccessibleCard,
  SkipLink,
  KeyboardNavigationProvider,
  AccessibleProgress,
  AccessibleStatusChip,
};