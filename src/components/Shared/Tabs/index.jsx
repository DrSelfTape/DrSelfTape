import { styled, Tab, Tabs } from '@mui/material';

export const CustomTab = styled(Tab)(() => ({
  minHeight: 'auto',
  height: '30px',
  textTransform: 'none',
  fontFamily: 'var(--font-sans)',
  fontWeight: 400,
  fontSize: '0.875rem',
  color: 'var(--color-secondary-dark)',
  padding: '0px',
  minWidth: 'auto',
  borderRadius: '4px',
  transition: 'all 0.2s',
  '&.Mui-selected': {
    color: 'var(--color-primary-dark)',
    fontWeight: 900,
  },
  '&:hover': { color: 'var(--color-primary-dark)' },
  '&:focus-visible': { outline: 'none' },
}));

export const CustomTabs = styled(Tabs)(() => ({
  minHeight: 'auto',
  '& .MuiTabs-flexContainer': {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
  },
  '& .MuiTabs-indicator': { display: 'none' },
}));

export const SectionCustomTab = styled(Tab)(() => ({
  minHeight: 'auto',
  height: '30px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  color: 'var(--color-secondary)',
  padding: '6px 12px',
  borderRadius: '0.125rem',
  transition: 'all 0.2s',
  '&.Mui-selected': {
    color: 'var(--color-secondary-dark)',
    backgroundColor: 'var(--color-white)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  '&:hover': { color: 'var(--color-secondary-dark)' },
  '&:focus-visible': {
    outline: 'none',
    boxShadow: `0 0 0 2px var(--color-primary), 0 0 0 4px rgba(255, 255, 255, 0.5)`,
  },
  '&.Mui-disabled': { pointerEvents: 'none', opacity: 0.5 },
}));

export const SectionCustomTabs = styled(Tabs)(() => ({
  minHeight: 'auto',
  '& .MuiTabs-scroller': {
    overflowX: 'auto !important',
    overflowY: 'hidden',
    whiteSpace: 'nowrap',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'thin',
    width: '100%',
  },
  '& .MuiTabs-flexContainer': {
    display: 'inline-flex',
    minWidth: 'fit-content',
  },
  '& .MuiTabs-scroller::-webkit-scrollbar': { height: '6px' },
  '& .MuiTabs-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
  },
  '& .MuiTabs-indicator': { display: 'none' },
}));
