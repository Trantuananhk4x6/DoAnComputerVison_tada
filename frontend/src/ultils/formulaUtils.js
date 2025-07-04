/**
 * Formula utility functions for converting between Excel-style references and column names
 */

/**
 * Convert column index to Excel-style letter (A, B, C, ...)
 * @param {number} index - Column index (0-based)
 * @returns {string} Excel column letter
 */
export const indexToExcelColumn = (index) => {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
};

/**
 * Convert Excel-style column letter to index
 * @param {string} letter - Excel column letter (A, B, C, ...)
 * @returns {number} Column index (0-based)
 */
export const excelColumnToIndex = (letter) => {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
};

/**
 * Get available column names from tracking data
 * @param {Object} tracks - Tracking data object
 * @returns {Array} Array of available column names
 */
export const getAvailableColumns = (tracks) => {
  if (!tracks || typeof tracks !== 'object') return [];
  
  const sampleTrack = Object.values(tracks)[0];
  if (!sampleTrack) return [];
  
  // Basic columns from tracking data
  const basicColumns = ['Track ID', 'Object Type', 'Start Frame', 'End Frame', 'Duration', 'Percentage'];
  
  // Add any additional properties from the track data
  const additionalColumns = Object.keys(sampleTrack)
    .filter(key => !['id', 'class', 'first_frame', 'last_frame', 'duration', 'durationPercent'].includes(key))
    .map(key => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  
  return [...basicColumns, ...additionalColumns];
};

/**
 * Convert column names to Excel-style references
 * @param {string} formula - Formula with [ColumnName] syntax
 * @param {Array} availableColumns - Available column names
 * @returns {string} Formula with Excel-style references
 */
export const convertColumnNamesToReferences = (formula, availableColumns = []) => {
  if (!formula || typeof formula !== 'string') return formula;
  
  let convertedFormula = formula;
  
  // Pattern to match [ColumnName] or [ColumnName]row
  const columnPattern = /\[([^\]]+)\](\d+)?/g;
  
  convertedFormula = convertedFormula.replace(columnPattern, (match, columnName, rowNumber) => {
    const columnIndex = availableColumns.findIndex(col => 
      col.toLowerCase() === columnName.toLowerCase()
    );
    
    if (columnIndex === -1) {
      console.warn(`Column "${columnName}" not found in available columns`);
      return match; // Keep original if not found
    }
    
    const excelColumn = indexToExcelColumn(columnIndex);
    return rowNumber ? `${excelColumn}${rowNumber}` : `${excelColumn}1`;
  });
  
  return convertedFormula;
};

/**
 * Convert Excel-style formula to support column names
 * @param {string} formula - Excel-style formula
 * @param {Array} availableColumns - Available column names
 * @returns {string} Formula with [ColumnName] syntax
 */
export const convertExcelFormula = (formula, availableColumns = []) => {
  if (!formula || typeof formula !== 'string') return formula;
  
  let convertedFormula = formula;
  
  // Pattern to match Excel-style references (A1, B1, C1, etc.)
  const excelPattern = /([A-Z]+)(\d+)/g;
  
  convertedFormula = convertedFormula.replace(excelPattern, (match, column, row) => {
    const columnIndex = excelColumnToIndex(column);
    
    if (columnIndex < availableColumns.length) {
      const columnName = availableColumns[columnIndex];
      return row === '1' ? `[${columnName}]` : `[${columnName}]${row}`;
    }
    
    return match; // Keep original if column not found
  });
  
  return convertedFormula;
};

/**
 * Validate formula syntax
 * @param {string} formula - Formula to validate
 * @param {Array} availableColumns - Available column names
 * @returns {Object} Validation result with isValid and errors
 */
export const validateFormula = (formula, availableColumns = []) => {
  if (!formula || typeof formula !== 'string') {
    return { isValid: false, errors: ['Formula is required'] };
  }
  
  const errors = [];
  
  // Check for unmatched brackets
  const openBrackets = (formula.match(/\[/g) || []).length;
  const closeBrackets = (formula.match(/\]/g) || []).length;
  
  if (openBrackets !== closeBrackets) {
    errors.push('Unmatched brackets in formula');
  }
  
  // Check for invalid column names
  const columnPattern = /\[([^\]]+)\]/g;
  let match;
  
  while ((match = columnPattern.exec(formula)) !== null) {
    const columnName = match[1];
    const columnExists = availableColumns.some(col => 
      col.toLowerCase() === columnName.toLowerCase()
    );
    
    if (!columnExists) {
      errors.push(`Column "${columnName}" not found`);
    }
  }
  
  // Check for basic formula syntax (starts with =)
  if (!formula.startsWith('=')) {
    errors.push('Formula must start with "="');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get column suggestions for auto-complete
 * @param {string} input - Current input text
 * @param {Array} availableColumns - Available column names
 * @returns {Array} Array of column suggestions
 */
export const getColumnSuggestions = (input, availableColumns = []) => {
  if (!input || !availableColumns.length) return [];
  
  const searchText = input.toLowerCase();
  
  return availableColumns.filter(column => 
    column.toLowerCase().includes(searchText)
  ).sort((a, b) => {
    // Prioritize exact matches and starts-with matches
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    if (aLower.startsWith(searchText) && !bLower.startsWith(searchText)) return -1;
    if (!aLower.startsWith(searchText) && bLower.startsWith(searchText)) return 1;
    
    return a.localeCompare(b);
  });
};

/**
 * Evaluate formula with actual data
 * @param {string} formula - Formula to evaluate
 * @param {Object} rowData - Data for the current row
 * @param {Array} availableColumns - Available column names
 * @returns {*} Evaluated result
 */
export const evaluateFormula = (formula, rowData, availableColumns = []) => {
  if (!formula || !rowData) return null;
  
  try {
    // Convert column names to actual values
    let evalFormula = formula;
    
    // Remove the leading = if present
    if (evalFormula.startsWith('=')) {
      evalFormula = evalFormula.substring(1);
    }
    
    // Replace [ColumnName] with actual values
    const columnPattern = /\[([^\]]+)\]/g;
    evalFormula = evalFormula.replace(columnPattern, (match, columnName) => {
      const columnIndex = availableColumns.findIndex(col => 
        col.toLowerCase() === columnName.toLowerCase()
      );
      
      if (columnIndex === -1) return 0;
      
      // Map column names to actual data properties
      const columnMap = {
        'track id': rowData.id,
        'object type': `"${rowData.class || 'Unknown'}"`,
        'start frame': rowData.first_frame || 0,
        'end frame': rowData.last_frame || 0,
        'duration': rowData.duration || 0,
        'percentage': rowData.durationPercent || 0
      };
      
      const value = columnMap[columnName.toLowerCase()];
      return value !== undefined ? value : 0;
    });
    
    // Basic safety check - only allow safe operations
    if (!/^[0-9+\-*/.() ]+$/.test(evalFormula.replace(/"/g, ''))) {
      return 'Invalid formula';
    }
    
    // Evaluate the formula
    return Function(`"use strict"; return (${evalFormula})`)();
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return 'Error';
  }
};