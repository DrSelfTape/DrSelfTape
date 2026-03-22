import { Box, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

export const NoDataFound = () => {
  return (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <DescriptionIcon fontSize='large' sx={{ color: 'primary.main' }} />
      <Typography
        sx={{
          mt: 2,
          color: 'black',
          whiteSpace: 'nowrap',
          fontSize: '0.875rem',
          fontFamily: 'Montserrat',
        }}
      >
        No data found.
      </Typography>
    </Box>
  );
};
