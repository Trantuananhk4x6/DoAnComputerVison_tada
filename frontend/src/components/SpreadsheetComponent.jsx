import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.min.css';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Autocomplete,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Functions as FunctionsIcon,
  Help as HelpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  convertExcelFormula,
  applyFormulaToColumn,
  validateFormulaColumnNames,
  getAvailableColumnNames,
  hasMixedReferences,
  getFormulaExamples
} from '../utils/formula/formulaUtils';

const SpreadsheetComponent = ({ 
  data = [], 
  headers = [], 
  onDataChange,
  width = '100%',
  height = 400,
  title = 'Spreadsheet'
}) => {
  const [spreadsheetData, setSpreadsheetData] = useState(data);
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [formulaInput, setFormulaInput] = useState('');
  const [formulaValidation, setFormulaValidation] = useState({ isValid: true, missingColumns: [] });
  const [showExamples, setShowExamples] = useState(false);
  const [autoCompleteOpen, setAutoCompleteOpen] = useState(false);
  const hotRef = useRef(null);

  // Update spreadsheet data when props change
  useEffect(() => {
    setSpreadsheetData(data);
  }, [data]);

  // Handle formula input changes with real-time validation
  const handleFormulaChange = useCallback((value) => {
    setFormulaInput(value);
    
    if (value.trim()) {
      const validation = validateFormulaColumnNames(value, headers);
      setFormulaValidation(validation);
    } else {
      setFormulaValidation({ isValid: true, missingColumns: [] });
    }
  }, [headers]);

  // Apply formula to selected cell or column
  const applyFormula = useCallback(() => {
    if (!formulaInput.trim()) {
      return;
    }

    const validation = validateFormulaColumnNames(formulaInput, headers);
    if (!validation.isValid) {
      return;
    }

    const hot = hotRef.current?.hotInstance;
    if (!hot) {
      return;
    }

    const { row, col } = selectedCell;
    
    try {
      // Convert formula for the specific row
      const convertedFormula = convertExcelFormula(formulaInput, headers, row);
      
      // Apply to single cell
      hot.setDataAtCell(row, col, convertedFormula);
      
      // Notify parent component of changes
      const updatedData = hot.getData();
      setSpreadsheetData(updatedData);
      onDataChange?.(updatedData);
      
      setFormulaModalOpen(false);
      setFormulaInput('');
    } catch (error) {
      console.error('Error applying formula:', error);
    }
  }, [formulaInput, headers, selectedCell, onDataChange]);

  // Apply formula to entire column
  const applyFormulaToEntireColumn = useCallback(() => {
    if (!formulaInput.trim()) {
      return;
    }

    const validation = validateFormulaColumnNames(formulaInput, headers);
    if (!validation.isValid) {
      return;
    }

    const hot = hotRef.current?.hotInstance;
    if (!hot) {
      return;
    }

    const { col } = selectedCell;
    const totalRows = spreadsheetData.length;
    
    try {
      // Generate formulas for all rows
      const formulas = applyFormulaToColumn(formulaInput, headers, totalRows);
      
      // Apply to all rows in the column
      formulas.forEach((formula, rowIndex) => {
        hot.setDataAtCell(rowIndex, col, formula);
      });
      
      // Notify parent component of changes
      const updatedData = hot.getData();
      setSpreadsheetData(updatedData);
      onDataChange?.(updatedData);
      
      setFormulaModalOpen(false);
      setFormulaInput('');
    } catch (error) {
      console.error('Error applying formula to column:', error);
    }
  }, [formulaInput, headers, selectedCell, spreadsheetData.length, onDataChange]);

  // Handle cell selection
  const handleCellSelection = useCallback((row, col) => {
    setSelectedCell({ row, col });
  }, []);

  // Open formula modal
  const openFormulaModal = useCallback(() => {
    setFormulaModalOpen(true);
    setFormulaInput('');
    setFormulaValidation({ isValid: true, missingColumns: [] });
  }, []);

  // Get autocomplete options for column names
  const getAutoCompleteOptions = useCallback((searchTerm) => {
    return getAvailableColumnNames(headers, searchTerm);
  }, [headers]);

  // Handle formula input with bracket insertion
  const handleFormulaInputChange = useCallback((event, value) => {
    const options = getAutoCompleteOptions(''); // Use the function to avoid unused variable warning
    
    if (value !== undefined) {
      // Value from autocomplete
      const lastBracketIndex = formulaInput.lastIndexOf('[');
      if (lastBracketIndex !== -1) {
        const beforeBracket = formulaInput.substring(0, lastBracketIndex);
        const newValue = `${beforeBracket}[${value}]`;
        handleFormulaChange(newValue);
      } else {
        handleFormulaChange(`[${value}]`);
      }
    } else {
      // Direct input
      handleFormulaChange(event.target.value);
    }
  }, [formulaInput, handleFormulaChange, getAutoCompleteOptions]);

  // Formula examples
  const formulaExamples = getFormulaExamples();

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <Box>
          <Tooltip title="Insert Formula">
            <IconButton onClick={openFormulaModal} color="primary">
              <FunctionsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Formula Examples">
            <IconButton onClick={() => setShowExamples(true)} color="info">
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ p: 1 }}>
        <HotTable
          ref={hotRef}
          data={spreadsheetData}
          colHeaders={headers}
          rowHeaders={true}
          width={width}
          height={height}
          licenseKey="non-commercial-and-evaluation"
          stretchH="all"
          contextMenu={true}
          manualColumnResize={true}
          manualRowResize={true}
          afterSelectionEnd={(row, col) => handleCellSelection(row, col)}
          afterChange={(changes) => {
            if (changes) {
              const updatedData = hotRef.current?.hotInstance?.getData();
              setSpreadsheetData(updatedData);
              onDataChange?.(updatedData);
            }
          }}
          cells={(row, col) => {
            const cellProperties = {};
            
            // Add formula support
            if (spreadsheetData[row] && spreadsheetData[row][col]) {
              const cellValue = spreadsheetData[row][col];
              if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
                cellProperties.className = 'formula-cell';
              }
            }
            
            return cellProperties;
          }}
        />
      </Paper>

      {/* Formula Modal */}
      <Dialog
        open={formulaModalOpen}
        onClose={() => setFormulaModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '60vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Insert Formula</Typography>
            <IconButton onClick={() => setFormulaModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selected cell: {`${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Use column names in square brackets, e.g., [Price], [Quantity]
            </Typography>
          </Box>

          <Autocomplete
            freeSolo
            options={headers}
            inputValue={formulaInput}
            onInputChange={handleFormulaInputChange}
            open={autoCompleteOpen}
            onOpen={() => setAutoCompleteOpen(true)}
            onClose={() => setAutoCompleteOpen(false)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Formula"
                multiline
                minRows={3}
                placeholder="e.g., =SUM([Price]:[Total]) or =[Price] * [Quantity]"
                error={!formulaValidation.isValid}
                helperText={
                  !formulaValidation.isValid
                    ? `Missing columns: ${formulaValidation.missingColumns.join(', ')}`
                    : hasMixedReferences(formulaInput)
                    ? 'Formula contains mixed references (column names + cell references)'
                    : 'Enter a formula using column names in square brackets'
                }
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      {formulaValidation.isValid ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <ErrorIcon color="error" fontSize="small" />
                      )}
                    </Box>
                  )
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Chip
                  label={option}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                {option}
              </Box>
            )}
          />

          {formulaValidation.isValid && formulaInput.trim() && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Preview:</strong> {convertExcelFormula(formulaInput, headers, selectedCell.row)}
              </Typography>
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Available Columns:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {headers.map((header, index) => (
                <Chip
                  key={index}
                  label={header}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const newFormula = formulaInput + `[${header}]`;
                    handleFormulaChange(newFormula);
                  }}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setFormulaModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={applyFormula}
            variant="contained"
            disabled={!formulaValidation.isValid || !formulaInput.trim()}
          >
            Apply to Cell
          </Button>
          <Button
            onClick={applyFormulaToEntireColumn}
            variant="outlined"
            disabled={!formulaValidation.isValid || !formulaInput.trim()}
          >
            Apply to Column
          </Button>
        </DialogActions>
      </Dialog>

      {/* Examples Modal */}
      <Dialog
        open={showExamples}
        onClose={() => setShowExamples(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Formula Examples</Typography>
            <IconButton onClick={() => setShowExamples(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <List>
            {formulaExamples.map((example, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {example.description}
                        </Typography>
                        <Chip
                          label={example.formula}
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => {
                            handleFormulaChange(example.formula);
                            setShowExamples(false);
                          }}
                          sx={{ cursor: 'pointer', fontFamily: 'monospace' }}
                        />
                      </Box>
                    }
                    secondary={example.explanation}
                  />
                </ListItem>
                {index < formulaExamples.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowExamples(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <style jsx>{`
        .formula-cell {
          background-color: #e3f2fd !important;
          font-family: monospace !important;
        }
      `}</style>
    </Box>
  );
};

export default SpreadsheetComponent;