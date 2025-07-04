/**
 * Tests for formula utility functions
 */

import {
  indexToExcelColumn,
  excelColumnToIndex,
  getAvailableColumns,
  convertColumnNamesToReferences,
  convertExcelFormula,
  validateFormula,
  getColumnSuggestions,
  evaluateFormula
} from '../ultils/formulaUtils';

// Test data
const sampleTracks = {
  '001': {
    class: 'person',
    first_frame: 10,
    last_frame: 50,
    confidence: 0.95
  },
  '002': {
    class: 'car',
    first_frame: 20,
    last_frame: 80,
    confidence: 0.87
  }
};

const availableColumns = ['Track ID', 'Object Type', 'Start Frame', 'End Frame', 'Duration', 'Percentage'];

// Test Excel column conversion
console.log('=== Excel Column Conversion Tests ===');
console.log('A =', excelColumnToIndex('A')); // Should be 0
console.log('B =', excelColumnToIndex('B')); // Should be 1
console.log('Z =', excelColumnToIndex('Z')); // Should be 25
console.log('0 =', indexToExcelColumn(0)); // Should be A
console.log('1 =', indexToExcelColumn(1)); // Should be B
console.log('25 =', indexToExcelColumn(25)); // Should be Z

// Test available columns
console.log('\n=== Available Columns Test ===');
const columns = getAvailableColumns(sampleTracks);
console.log('Available columns:', columns);

// Test column name to reference conversion
console.log('\n=== Column Name to Reference Conversion ===');
const testFormula1 = '=SUM([Start Frame]:[End Frame])';
console.log(`Original: ${testFormula1}`);
console.log(`Converted: ${convertColumnNamesToReferences(testFormula1, availableColumns)}`);

const testFormula2 = '=IF([Duration] > 100, [Percentage], 0)';
console.log(`Original: ${testFormula2}`);
console.log(`Converted: ${convertColumnNamesToReferences(testFormula2, availableColumns)}`);

// Test Excel formula conversion
console.log('\n=== Excel Formula Conversion ===');
const excelFormula1 = '=SUM(A1:B1)';
console.log(`Original: ${excelFormula1}`);
console.log(`Converted: ${convertExcelFormula(excelFormula1, availableColumns)}`);

// Test formula validation
console.log('\n=== Formula Validation Tests ===');
const validFormula = '=SUM([Start Frame]:[End Frame])';
const invalidFormula = '=[NonExistent Column]';
const malformedFormula = 'SUM([Start Frame'; // Missing = and closing ]

console.log(`Valid formula "${validFormula}":`, validateFormula(validFormula, availableColumns));
console.log(`Invalid formula "${invalidFormula}":`, validateFormula(invalidFormula, availableColumns));
console.log(`Malformed formula "${malformedFormula}":`, validateFormula(malformedFormula, availableColumns));

// Test column suggestions
console.log('\n=== Column Suggestions Tests ===');
console.log('Suggestions for "Start":', getColumnSuggestions('Start', availableColumns));
console.log('Suggestions for "Frame":', getColumnSuggestions('Frame', availableColumns));
console.log('Suggestions for "Object":', getColumnSuggestions('Object', availableColumns));

// Test formula evaluation
console.log('\n=== Formula Evaluation Tests ===');
const testRow = {
  id: '001',
  class: 'person',
  first_frame: 10,
  last_frame: 50,
  duration: 41,
  durationPercent: 27.3
};

const evalFormula1 = '=[Start Frame] + [End Frame]';
const evalFormula2 = '=[End Frame] - [Start Frame]';
const evalFormula3 = '=[Duration] * 2';

console.log(`${evalFormula1} = ${evaluateFormula(evalFormula1, testRow, availableColumns)}`);
console.log(`${evalFormula2} = ${evaluateFormula(evalFormula2, testRow, availableColumns)}`);
console.log(`${evalFormula3} = ${evaluateFormula(evalFormula3, testRow, availableColumns)}`);

console.log('\n=== All Tests Completed ===');