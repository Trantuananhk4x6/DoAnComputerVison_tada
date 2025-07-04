import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Functions as FunctionsIcon,
  Help as HelpIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { getColumnSuggestions, validateFormula } from '../ultils/formulaUtils';

const FormulaInput = ({ 
  value = '', 
  onChange, 
  availableColumns = [], 
  placeholder = "Enter formula (e.g., =SUM([Start Frame]:[End Frame]))",
  label = "Formula",
  error = false,
  helperText = '',
  onValidation = () => {},
  ...props 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [validationResult, setValidationResult] = useState({ isValid: true, errors: [] });
  
  const inputRef = useRef(null);
  const theme = useTheme();

  // Update validation when value changes
  useEffect(() => {
    const result = validateFormula(value, availableColumns);
    setValidationResult(result);
    onValidation(result);
  }, [value, availableColumns, onValidation]);

  // Handle input changes
  const handleInputChange = (event) => {
    const newValue = event.target.value;
    const cursorPos = event.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);
    
    // Check if we should show suggestions
    checkForSuggestions(newValue, cursorPos);
  };

  // Check if we should show column suggestions
  const checkForSuggestions = (inputValue, cursorPos) => {
    const textBeforeCursor = inputValue.substring(0, cursorPos);
    const lastBracketIndex = textBeforeCursor.lastIndexOf('[');
    
    if (lastBracketIndex !== -1) {
      const textAfterBracket = textBeforeCursor.substring(lastBracketIndex + 1);
      
      // Check if we're inside brackets and haven't closed them yet
      if (!textAfterBracket.includes(']')) {
        setCurrentInput(textAfterBracket);
        const columnSuggestions = getColumnSuggestions(textAfterBracket, availableColumns);
        setSuggestions(columnSuggestions);
        setShowSuggestions(columnSuggestions.length > 0);
        return;
      }
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastBracketIndex = textBeforeCursor.lastIndexOf('[');
    
    if (lastBracketIndex !== -1) {
      const beforeBracket = textBeforeCursor.substring(0, lastBracketIndex);
      const newValue = `${beforeBracket}[${suggestion}]${textAfterCursor}`;
      
      onChange(newValue);
      setShowSuggestions(false);
      
      // Focus back to input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursorPos = lastBracketIndex + suggestion.length + 2;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Handle key down for navigation
  const handleKeyDown = (event) => {
    if (showSuggestions) {
      if (event.key === 'Escape') {
        setShowSuggestions(false);
        event.preventDefault();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // Handle arrow key navigation in suggestions
        event.preventDefault();
      } else if (event.key === 'Enter' && suggestions.length > 0) {
        // Select first suggestion on Enter
        handleSuggestionClick(suggestions[0]);
        event.preventDefault();
      }
    }
  };

  // Handle blur
  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Handle focus
  const handleFocus = (event) => {
    const cursorPos = event.target.selectionStart;
    setCursorPosition(cursorPos);
    checkForSuggestions(value, cursorPos);
  };

  // Insert function examples
  const insertExample = (example) => {
    const newValue = value + example;
    onChange(newValue);
    
    // Focus and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = newValue.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const commonExamples = [
    { label: 'SUM([Column1]:[Column2])', value: '=SUM([Start Frame]:[End Frame])' },
    { label: 'IF([Column]>100, [Column2], 0)', value: '=IF([Duration]>100, [Percentage], 0)' },
    { label: 'AVERAGE([Column])', value: '=AVERAGE([Duration])' },
    { label: '[Column1] + [Column2]', value: '=[Start Frame] + [End Frame]' }
  ];

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <FunctionsIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="body2" color="text.primary">
          {label}
        </Typography>
        <Tooltip title="Use [ColumnName] syntax for column references. Auto-complete available when typing [">
          <IconButton size="small" sx={{ ml: 1 }}>
            <HelpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {validationResult.isValid ? (
          <CheckIcon sx={{ ml: 1, color: 'success.main' }} fontSize="small" />
        ) : (
          <ErrorIcon sx={{ ml: 1, color: 'error.main' }} fontSize="small" />
        )}
      </Box>

      <TextField
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        fullWidth
        variant="outlined"
        size="small"
        error={error || !validationResult.isValid}
        helperText={helperText || (validationResult.errors.length > 0 ? validationResult.errors[0] : '')}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: validationResult.isValid ? 'primary.main' : 'error.main'
              }
            }
          }
        }}
        {...props}
      />

      {/* Auto-complete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 200,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'primary.main',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: 2
          }}
        >
          <List dense>
            {suggestions.map((suggestion, index) => (
              <ListItem
                key={index}
                button
                onClick={() => handleSuggestionClick(suggestion)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText'
                  }
                }}
              >
                <ListItemText
                  primary={suggestion}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: currentInput && suggestion.toLowerCase().startsWith(currentInput.toLowerCase()) ? 'bold' : 'normal'
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Common examples */}
      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
          Examples:
        </Typography>
        {commonExamples.map((example, index) => (
          <Chip
            key={index}
            label={example.label}
            size="small"
            variant="outlined"
            clickable
            onClick={() => insertExample(example.value)}
            sx={{
              fontSize: '0.7rem',
              height: 'auto',
              '& .MuiChip-label': {
                px: 1,
                py: 0.5,
                fontFamily: 'monospace'
              }
            }}
          />
        ))}
      </Box>

      {/* Available columns */}
      {availableColumns.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Available columns:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {availableColumns.map((column, index) => (
              <Chip
                key={index}
                label={column}
                size="small"
                variant="outlined"
                clickable
                onClick={() => insertExample(`[${column}]`)}
                sx={{
                  fontSize: '0.7rem',
                  height: 'auto',
                  '& .MuiChip-label': {
                    px: 1,
                    py: 0.5
                  }
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FormulaInput;