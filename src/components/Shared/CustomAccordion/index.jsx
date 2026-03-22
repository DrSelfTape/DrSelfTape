import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

export const CustomAccordion = ({ header, icon, children }) => {
  return (
    <Accordion
      className='!shadow-none border-b rounded-none border-style text-[16px]'
      disableGutters
      square
      sx={{
        '&.Mui-expanded': {
          margin: 0,
        },
      }}
    >
      <AccordionSummary
        expandIcon={
          <ArrowDropDownIcon className='!h-6 !w-6 transition-transform duration-200' />
        }
        aria-controls='panel-content'
        id='panel-header'
        className='flex flex-1 items-center justify-between h-[56px] font-medium'
      >
        <div className='flex items-center gap-2'>
          {icon}
          <span>{header}</span>
        </div>
      </AccordionSummary>

      <AccordionDetails className='p-4 ml-1'>
        {children || <p>No data found</p>}
      </AccordionDetails>
    </Accordion>
  );
};
