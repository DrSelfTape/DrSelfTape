import React from 'react';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { CustomCheckbox } from '../../shared';

const Cell = styled(TableCell)(() => ({
  color: 'var(--color-secondary-dark)',
  backgroundColor: 'var(--color-secondary-light)',
  fontSize: '12px',
  fontWeight: '600',
  height: '48px',
  padding: 0,
  borderBottom: '1px solid var(--color-input)',
  fontFamily: 'var(--font-sans)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));

const SelectionCell = styled(TableCell)(() => ({
  padding: 0,
  borderBottom: '1px solid var(--color-input)',
  width: '25px',
  height: '48px',
  textAlign: 'center',
  verticalAlign: 'middle',
}));

const TableHeader = ({
  rows,
  columns,
  selectedIds,
  setSelectedIds,
  tableColumnExtensions,
  noCheckbox,
  centerHeaderColumnName,
}) => {
  return (
    <TableHead
      sx={{
        position: 'sticky',
        top: 0,
        height: '48px',
        backgroundColor: 'var(--color-secondary-light)',
        zIndex: 1,
        padding: '10px 17px 10px 4px',
      }}
    >
      <TableRow>
        {!noCheckbox && (
          <SelectionCell>
            {selectedIds?.length > 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '48px',
                  gap: '8px',
                  pl: '17px',
                }}
              >
                <Box
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedIds([]);
                  }}
                  sx={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px',
                    backgroundColor: 'var(--color-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                    '&:hover': {
                      backgroundColor: 'var(--color-primary-dark)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      color: 'var(--color-white)',
                      fontSize: '16px',
                      lineHeight: '1',
                      fontWeight: 'bold',
                    }}
                  >
                    –
                  </Box>
                </Box>
                <Box
                  sx={{
                    fontSize: '14px',
                    color: 'var(--color-secondary-dark)',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedIds?.length} Selected
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  height: '48px',
                  pl: '17px',
                }}
              >
                <CustomCheckbox
                  sx={{
                    width: '21px !important',
                    height: '21px !important',
                    padding: 0,
                    '& .MuiSvgIcon-root': {
                      fontSize: '21px !important',
                      width: '21px !important',
                      height: '21px !important',
                      color: 'var(--color-input)',
                    },
                    '&.Mui-checked .MuiSvgIcon-root': {
                      color: 'var(--color-primary)',
                    },
                  }}
                  checked={selectedIds?.length > 0}
                  onChange={() => {
                    setSelectedIds(
                      selectedIds?.length === 0
                        ? rows?.map((row) => row?.id)
                        : []
                    );
                  }}
                />
              </Box>
            )}
          </SelectionCell>
        )}
        {columns?.map((col, colIndex) => {
          const columnExtension = tableColumnExtensions?.find(
            (item) => item?.columnName === col?.name
          );
          const width = columnExtension?.width || 100;
          return (
            <Cell
              key={colIndex}
              sx={{
                width,
                minWidth: width,
                maxWidth: width,
                textAlign:
                  col?.name === 'Status' ||
                  col?.name === centerHeaderColumnName
                    ? 'center'
                    : colIndex === columns.length - 1
                    ? 'right'
                    : 'left',
                boxSizing: 'border-box',
                paddingLeft:noCheckbox && colIndex === 0 && '17px',
                paddingRight: colIndex === columns.length - 1 ? '17px' : '',
              }}
            >
              {selectedIds?.length === 0 ? col?.title : ''}
            </Cell>
          );
        })}
      </TableRow>
    </TableHead>
  );
};

export default TableHeader;
