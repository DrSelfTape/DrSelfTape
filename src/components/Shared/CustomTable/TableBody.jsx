import React from 'react';
import TableBody from '@mui/material/TableBody';
import { styled } from '@mui/material/styles';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { CustomCheckbox, NoDataFound } from '../../shared';

const BodyCell = styled(TableCell)(({ theme }) => ({
  color: 'var(--color-secondary-dark)',
  fontSize: '12px',
  height: '44px',
  padding: '0 17px 0 0',
  borderBottom: '1px solid var(--color-input)',
  fontFamily: 'var(--font-sans)',
  overflow: 'visible',
  direction: 'ltr',
}));

const BodyRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: 'var(--color-white)',
  '&:nth-of-type(even)': {
    backgroundColor: 'var(--color-primary-light)',
  },
  '&:hover': {
    backgroundColor: 'var(--color-input-hover-20)',
  },
}));

const TableMainBody = ({
  rows,
  columns,
  selectedIds,
  setSelectedIds,
  tableColumnExtensions,
  dataProviders,
  onRowClick,
  noCheckbox,
}) => {
  return (
    <TableBody sx={{ padding: '10px 17px 10px 17px' }}>
      {rows?.length > 0 ? (
        rows?.map((row, rowIndex) => {
          const id = row?.id;
          const isRowSelected = selectedIds?.includes(id);
          const onChange = () => {
            const ids = isRowSelected
              ? selectedIds?.filter((ele) => ele !== id)
              : [...selectedIds, id];
            setSelectedIds(ids);
          };
          return (
            <BodyRow key={rowIndex}>
              {noCheckbox ? (
                ''
              ) : (
                <BodyCell sx={{ padding: '0 17px 0 17px' }}>
                  <CustomCheckbox
                    checked={Boolean(isRowSelected)}
                    onChange={onChange}
                    sx={{
                      '& .MuiSvgIcon-root': {
                        color: isRowSelected
                          ? 'var(--color-primary)'
                          : 'var(--color-input)',
                        width: '21px',
                        height: '21px',
                      },
                      '&.Mui-checked': {
                        color: 'var(--color-primary)',
                      },
                    }}
                  />
                </BodyCell>
              )}
              {columns?.map((col, colIndex) => {
                const columnExtension = tableColumnExtensions?.find(
                  (item) => item?.columnName === col?.name
                );
                const width = columnExtension?.width || 100;
                const dataProvider = dataProviders?.find(
                  (provider) => provider?.columnName[0] === col?.name
                );
                return (
                  <BodyCell
                    key={colIndex}
                    sx={{
                      width,
                      minWidth: width,
                      maxWidth: width,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',

                      textAlign:
                        col?.name === 'Status'
                          ? 'end'
                          : colIndex === columns.length - 1
                          ? 'right'
                          : colIndex === 0 && noCheckbox
                          ? 'left'
                          : 'left',
                      paddingRight:
                        colIndex === columns.length - 1 ? '17px' :col?.name != 'Status'&& '20px',
                      cursor: col?.name !== 'action' ? 'pointer' : 'default',
                      paddingLeft:noCheckbox && colIndex === 0 && '17px',
                      boxSizing: 'border-box',

                      ...(col?.name === 'action' && {
                        textAlign: 'right !important',
                        '& > *': {
                          display: 'inline-flex !important',
                          justifyContent: 'flex-end !important',
                          width: 'auto !important',
                          textAlign: 'right !important',
                          paddingRight: '15px',
                        },
                      }),
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (col?.name !== 'action') {
                        onRowClick(row);
                      }
                    }}
                  >
                    {dataProvider !== undefined
                      ? dataProvider?.func({ row })
                      : row[col?.name]}
                  </BodyCell>
                );
              })}
            </BodyRow>
          );
        })
      ) : (
        <BodyRow>
          <BodyCell
            colSpan={columns?.length + 1}
            sx={{ textAlign: 'center', py: 3, paddingLeft: '17px' }}
          >
            <NoDataFound />
          </BodyCell>
        </BodyRow>
      )}
    </TableBody>
  );
};

export default TableMainBody;
