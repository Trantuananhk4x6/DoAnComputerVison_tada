import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Divider,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Functions as FunctionsIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import FormulaInput from './FormulaInput';
import { validateFormula } from '../ultils/formulaUtils';

const AddColumnModal = ({ 
  open, 
  onClose, 
  onSave, 
  availableColumns = [],
  editingColumn = null 
}) => {
  const [columnName, setColumnName] = useState(editingColumn?.name || '');
  const [formula, setFormula] = useState(editingColumn?.formula || '');
  const [validationResult, setValidationResult] = useState({ isValid: true, errors: [] });
  const [isValidating, setIsValidating] = useState(false);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setColumnName(editingColumn?.name || '');
      setFormula(editingColumn?.formula || '');
      setValidationResult({ isValid: true, errors: [] });
    }
  }, [open, editingColumn]);

  // Handle validation
  const handleValidation = (result) => {
    setValidationResult(result);
  };

  // Handle save
  const handleSave = () => {
    if (!columnName.trim()) {
      setValidationResult({ isValid: false, errors: ['Column name is required'] });
      return;
    }

    if (!formula.trim()) {
      setValidationResult({ isValid: false, errors: ['Formula is required'] });
      return;
    }

    const formularValidation = validateFormula(formula, availableColumns);
    if (!formularValidation.isValid) {
      setValidationResult(formularValidation);
      return;
    }

    // Save the column
    onSave({
      name: columnName.trim(),
      formula: formula.trim(),
      id: editingColumn?.id || Date.now().toString()
    });

    // Close dialog
    onClose();
  };

  // Handle close
  const handleClose = () => {
    setColumnName('');
    setFormula('');
    setValidationResult({ isValid: true, errors: [] });
    onClose();
  };

  // Formula examples
  const formulaExamples = [
    {
      title: 'Basic Operations',
      examples: [
        { formula: '=[Start Frame] + [End Frame]', description: 'Add two columns' },
        { formula: '=[End Frame] - [Start Frame]', description: 'Subtract columns' },
        { formula: '=[Duration] * [Percentage]', description: 'Multiply columns' },
        { formula: '=[Duration] / 100', description: 'Divide by constant' }
      ]
    },
    {
      title: 'Conditional Logic',
      examples: [
        { formula: '=IF([Duration] > 100, "Long", "Short")', description: 'Conditional text' },
        { formula: '=IF([Percentage] > 50, [Duration], 0)', description: 'Conditional value' },
        { formula: '=IF([Object Type] = "person", 1, 0)', description: 'Type checking' }
      ]
    },
    {
      title: 'Aggregation Functions',
      examples: [
        { formula: '=SUM([Start Frame]:[End Frame])', description: 'Sum range' },
        { formula: '=AVERAGE([Duration])', description: 'Average value' },
        { formula: '=MAX([Duration])', description: 'Maximum value' },
        { formula: '=MIN([Duration])', description: 'Minimum value' }
      ]
    }
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FunctionsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            {editingColumn ? 'Edit Column' : 'Add New Column'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Grid container spacing={3}>
          {/* Left Panel - Form */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Column Name"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Enter column name (e.g., 'Total Score')"
                error={!validationResult.isValid && validationResult.errors.some(e => e.includes('name'))}
                sx={{ mb: 2 }}
              />

              <FormulaInput
                value={formula}
                onChange={setFormula}
                availableColumns={availableColumns}
                onValidation={handleValidation}
                placeholder="Enter formula (e.g., =SUM([Start Frame]:[End Frame]))"
                label="Formula"
              />
            </Box>

            {/* Validation Status */}
            {validationResult.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Box>
                  {validationResult.errors.map((error, index) => (
                    <Typography key={index} variant="body2">
                      {error}
                    </Typography>
                  ))}
                </Box>
              </Alert>
            )}

            {validationResult.isValid && formula && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckIcon sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    Formula is valid!
                  </Typography>
                </Box>
              </Alert>
            )}

            {/* Formula Syntax Help */}
            <Paper sx={{ p: 2, bgcolor: 'info.main', color: 'info.contrastText' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <InfoIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle2">Formula Syntax</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Use <code>[Column Name]</code> to reference columns
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Start formulas with <code>=</code>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Support for ranges: <code>[Col1]:[Col2]</code>
              </Typography>
              <Typography variant="body2">
                • Functions: SUM, AVERAGE, MAX, MIN, IF, etc.
              </Typography>
            </Paper>
          </Grid>

          {/* Right Panel - Examples */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ mr: 1 }} />
              Formula Examples
            </Typography>

            <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {formulaExamples.map((category, categoryIndex) => (
                <Box key={categoryIndex} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    {category.title}
                  </Typography>
                  <List dense>
                    {category.examples.map((example, exampleIndex) => (
                      <ListItem
                        key={exampleIndex}
                        button
                        onClick={() => setFormula(example.formula)}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {example.formula}
                            </Typography>
                          }
                          secondary={example.description}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={editingColumn ? <CheckIcon /> : <AddIcon />}
          disabled={!validationResult.isValid || !columnName.trim() || !formula.trim()}
        >
          {editingColumn ? 'Update Column' : 'Add Column'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddColumnModal;