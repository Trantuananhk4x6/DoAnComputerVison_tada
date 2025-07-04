/**
 * Formula utilities for supporting column names instead of cell references
 * Provides functionality to convert Excel-style formulas with column names to cell references
 */

/**
 * Parse column names from a formula string
 * @param {string} formula - The formula string to parse
 * @returns {Array<string>} Array of column names found in the formula
 */
export const parseColumnNamesInFormula = (formula) => {
  if (!formula || typeof formula !== 'string') {
    return [];
  }
  
  // Regular expression to match column names in square brackets
  const columnNameRegex = /\[([^\]]+)\]/g;
  const matches = [];
  let match;
  
  while ((match = columnNameRegex.exec(formula)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
};

/**
 * Convert column names to cell references for a specific row
 * @param {Array<string>} columnNames - Array of column names
 * @param {Array<string>} headers - Array of column headers
 * @param {number} row - Row number (0-based)
 * @returns {Object} Map of column names to cell references
 */
export const convertColumnNamesToReferences = (columnNames, headers, row = 0) => {
  const columnMap = {};
  
  columnNames.forEach(columnName => {
    const columnIndex = headers.findIndex(header => 
      header.toLowerCase() === columnName.toLowerCase()
    );
    
    if (columnIndex !== -1) {
      const columnLetter = numberToColumnLetter(columnIndex);
      columnMap[columnName] = `${columnLetter}${row + 1}`;
    }
  });
  
  return columnMap;
};

/**
 * Convert a number to Excel column letter(s)
 * @param {number} num - Column number (0-based)
 * @returns {string} Column letter(s) (e.g., 0 -> A, 25 -> Z, 26 -> AA)
 */
export const numberToColumnLetter = (num) => {
  let result = '';
  let temp = num;
  
  while (temp >= 0) {
    result = String.fromCharCode(65 + (temp % 26)) + result;
    temp = Math.floor(temp / 26) - 1;
  }
  
  return result;
};

/**
 * Convert column letter(s) to number
 * @param {string} letters - Column letter(s) (e.g., A -> 0, Z -> 25, AA -> 26)
 * @returns {number} Column number (0-based)
 */
export const columnLetterToNumber = (letters) => {
  if (!letters || typeof letters !== 'string') {
    return 0;
  }
  
  let result = 0;
  const upperLetters = letters.toUpperCase();
  
  for (let i = 0; i < upperLetters.length; i++) {
    result = result * 26 + (upperLetters.charCodeAt(i) - 64);
  }
  
  return result - 1;
};

/**
 * Enhanced convertExcelFormula function to handle column names in square brackets
 * @param {string} formula - The formula string with column names
 * @param {Array<string>} headers - Array of column headers
 * @param {number} row - Row number for cell reference (0-based)
 * @returns {string} Formula with column names replaced by cell references
 */
export const convertExcelFormula = (formula, headers, row = 0) => {
  if (!formula || typeof formula !== 'string') {
    return formula;
  }
  
  // Parse column names from formula
  const columnNames = parseColumnNamesInFormula(formula);
  
  if (columnNames.length === 0) {
    return formula; // No column names found, return as is
  }
  
  // Convert column names to cell references
  const columnMap = convertColumnNamesToReferences(columnNames, headers, row);
  
  // Replace column names with cell references
  let convertedFormula = formula;
  
  Object.entries(columnMap).forEach(([columnName, cellRef]) => {
    const regex = new RegExp(`\\[${escapeRegExp(columnName)}\\]`, 'gi');
    convertedFormula = convertedFormula.replace(regex, cellRef);
  });
  
  return convertedFormula;
};

/**
 * Enhanced replaceColumnNamesWithLetters function to handle column name ranges
 * @param {string} formula - The formula string with column names
 * @param {Array<string>} headers - Array of column headers
 * @param {number} row - Row number for cell reference (0-based)
 * @returns {string} Formula with column names replaced by cell references
 */
export const replaceColumnNamesWithLetters = (formula, headers, row = 0) => {
  if (!formula || typeof formula !== 'string') {
    return formula;
  }
  
  let convertedFormula = formula;
  
  // Handle range operations like [Col1]:[Col3]
  const rangeRegex = /\[([^\]]+)\]:\[([^\]]+)\]/g;
  convertedFormula = convertedFormula.replace(rangeRegex, (match, startCol, endCol) => {
    const startIndex = headers.findIndex(h => h.toLowerCase() === startCol.toLowerCase());
    const endIndex = headers.findIndex(h => h.toLowerCase() === endCol.toLowerCase());
    
    if (startIndex !== -1 && endIndex !== -1) {
      const startLetter = numberToColumnLetter(startIndex);
      const endLetter = numberToColumnLetter(endIndex);
      return `${startLetter}${row + 1}:${endLetter}${row + 1}`;
    }
    
    return match; // Return original if columns not found
  });
  
  // Handle single column references
  const singleColumnRegex = /\[([^\]]+)\]/g;
  convertedFormula = convertedFormula.replace(singleColumnRegex, (match, columnName) => {
    const columnIndex = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
    
    if (columnIndex !== -1) {
      const columnLetter = numberToColumnLetter(columnIndex);
      return `${columnLetter}${row + 1}`;
    }
    
    return match; // Return original if column not found
  });
  
  return convertedFormula;
};

/**
 * Apply formula to an entire column
 * @param {string} formula - The formula string with column names
 * @param {Array<string>} headers - Array of column headers
 * @param {number} totalRows - Total number of rows
 * @returns {Array<string>} Array of formulas for each row
 */
export const applyFormulaToColumn = (formula, headers, totalRows) => {
  if (!formula || typeof formula !== 'string' || !headers || totalRows <= 0) {
    return [];
  }
  
  const formulas = [];
  
  for (let row = 0; row < totalRows; row++) {
    const rowFormula = convertExcelFormula(formula, headers, row);
    formulas.push(rowFormula);
  }
  
  return formulas;
};

/**
 * Validate that all column names in a formula exist in the headers
 * @param {string} formula - The formula string to validate
 * @param {Array<string>} headers - Array of column headers
 * @returns {Object} Validation result with isValid and missing columns
 */
export const validateFormulaColumnNames = (formula, headers) => {
  if (!formula || typeof formula !== 'string') {
    return { isValid: true, missingColumns: [] };
  }
  
  const columnNames = parseColumnNamesInFormula(formula);
  const missingColumns = [];
  
  columnNames.forEach(columnName => {
    const found = headers.some(header => 
      header.toLowerCase() === columnName.toLowerCase()
    );
    
    if (!found) {
      missingColumns.push(columnName);
    }
  });
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns: [...new Set(missingColumns)] // Remove duplicates
  };
};

/**
 * Escape special regex characters in a string
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Get available column names for auto-complete
 * @param {Array<string>} headers - Array of column headers
 * @param {string} searchTerm - Search term for filtering
 * @returns {Array<string>} Filtered column names
 */
export const getAvailableColumnNames = (headers, searchTerm = '') => {
  if (!headers || !Array.isArray(headers)) {
    return [];
  }
  
  if (!searchTerm) {
    return headers;
  }
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return headers.filter(header => 
    header.toLowerCase().includes(lowerSearchTerm)
  );
};

/**
 * Check if a formula has mixed references (column names + cell references)
 * @param {string} formula - The formula string to check
 * @returns {boolean} True if formula has mixed references
 */
export const hasMixedReferences = (formula) => {
  if (!formula || typeof formula !== 'string') {
    return false;
  }
  
  const hasColumnNames = /\[([^\]]+)\]/.test(formula);
  const hasCellReferences = /[A-Z]+\d+/.test(formula);
  
  return hasColumnNames && hasCellReferences;
};

/**
 * Get formula examples for user guidance
 * @returns {Array<Object>} Array of formula examples
 */
export const getFormulaExamples = () => {
  return [
    {
      description: 'Sum values in a range',
      formula: '=SUM([Price]:[Total])',
      explanation: 'Adds all values from Price column to Total column'
    },
    {
      description: 'Multiply two columns',
      formula: '=[Unit Price] * [Quantity]',
      explanation: 'Multiplies Unit Price by Quantity for each row'
    },
    {
      description: 'Conditional calculation',
      formula: '=IF([Status]="Complete", [Amount], 0)',
      explanation: 'Returns Amount if Status is Complete, otherwise 0'
    },
    {
      description: 'Mixed references',
      formula: '=SUM([Price]:C5)',
      explanation: 'Adds values from Price column to cell C5'
    },
    {
      description: 'Average calculation',
      formula: '=AVERAGE([Sales]:[Commission])',
      explanation: 'Calculates average of values from Sales to Commission columns'
    }
  ];
};