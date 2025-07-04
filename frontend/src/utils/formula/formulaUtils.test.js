import {
  parseColumnNamesInFormula,
  convertColumnNamesToReferences,
  numberToColumnLetter,
  columnLetterToNumber,
  convertExcelFormula,
  replaceColumnNamesWithLetters,
  applyFormulaToColumn,
  validateFormulaColumnNames,
  getAvailableColumnNames,
  hasMixedReferences,
  getFormulaExamples
} from './formulaUtils';

describe('Formula Utilities', () => {
  const sampleHeaders = ['Product', 'Unit Price', 'Quantity', 'Total', 'Status'];

  describe('parseColumnNamesInFormula', () => {
    test('should parse column names from formula', () => {
      const formula = '=SUM([Price]:[Total])';
      const result = parseColumnNamesInFormula(formula);
      expect(result).toEqual(['Price', 'Total']);
    });

    test('should handle multiple column names', () => {
      const formula = '=[Unit Price] * [Quantity] + [Tax]';
      const result = parseColumnNamesInFormula(formula);
      expect(result).toEqual(['Unit Price', 'Quantity', 'Tax']);
    });

    test('should return empty array for formula without column names', () => {
      const formula = '=A1+B1';
      const result = parseColumnNamesInFormula(formula);
      expect(result).toEqual([]);
    });

    test('should handle null/undefined input', () => {
      expect(parseColumnNamesInFormula(null)).toEqual([]);
      expect(parseColumnNamesInFormula(undefined)).toEqual([]);
    });
  });

  describe('numberToColumnLetter', () => {
    test('should convert numbers to column letters', () => {
      expect(numberToColumnLetter(0)).toBe('A');
      expect(numberToColumnLetter(25)).toBe('Z');
      expect(numberToColumnLetter(26)).toBe('AA');
      expect(numberToColumnLetter(27)).toBe('AB');
    });
  });

  describe('columnLetterToNumber', () => {
    test('should convert column letters to numbers', () => {
      expect(columnLetterToNumber('A')).toBe(0);
      expect(columnLetterToNumber('Z')).toBe(25);
      expect(columnLetterToNumber('AA')).toBe(26);
      expect(columnLetterToNumber('AB')).toBe(27);
    });

    test('should handle lowercase letters', () => {
      expect(columnLetterToNumber('a')).toBe(0);
      expect(columnLetterToNumber('z')).toBe(25);
    });
  });

  describe('convertColumnNamesToReferences', () => {
    test('should convert column names to cell references', () => {
      const columnNames = ['Product', 'Unit Price'];
      const result = convertColumnNamesToReferences(columnNames, sampleHeaders, 0);
      expect(result).toEqual({
        'Product': 'A1',
        'Unit Price': 'B1'
      });
    });

    test('should handle different rows', () => {
      const columnNames = ['Product', 'Unit Price'];
      const result = convertColumnNamesToReferences(columnNames, sampleHeaders, 2);
      expect(result).toEqual({
        'Product': 'A3',
        'Unit Price': 'B3'
      });
    });

    test('should handle case-insensitive matching', () => {
      const columnNames = ['product', 'UNIT PRICE'];
      const result = convertColumnNamesToReferences(columnNames, sampleHeaders, 0);
      expect(result).toEqual({
        'product': 'A1',
        'UNIT PRICE': 'B1'
      });
    });
  });

  describe('convertExcelFormula', () => {
    test('should convert basic formula with column names', () => {
      const formula = '=[Unit Price] * [Quantity]';
      const result = convertExcelFormula(formula, sampleHeaders, 0);
      expect(result).toBe('=B1 * C1');
    });

    test('should handle formula with range', () => {
      const formula = '=SUM([Product]:[Quantity])';
      const result = convertExcelFormula(formula, sampleHeaders, 0);
      expect(result).toBe('=SUM(A1:C1)');
    });

    test('should handle different row numbers', () => {
      const formula = '=[Unit Price] * [Quantity]';
      const result = convertExcelFormula(formula, sampleHeaders, 2);
      expect(result).toBe('=B3 * C3');
    });

    test('should return original formula if no column names found', () => {
      const formula = '=A1+B1';
      const result = convertExcelFormula(formula, sampleHeaders, 0);
      expect(result).toBe('=A1+B1');
    });
  });

  describe('replaceColumnNamesWithLetters', () => {
    test('should replace column names with letters', () => {
      const formula = '=[Unit Price] * [Quantity]';
      const result = replaceColumnNamesWithLetters(formula, sampleHeaders, 0);
      expect(result).toBe('=B1 * C1');
    });

    test('should handle range operations', () => {
      const formula = '=SUM([Product]:[Quantity])';
      const result = replaceColumnNamesWithLetters(formula, sampleHeaders, 0);
      expect(result).toBe('=SUM(A1:C1)');
    });
  });

  describe('applyFormulaToColumn', () => {
    test('should generate formulas for all rows', () => {
      const formula = '=[Unit Price] * [Quantity]';
      const result = applyFormulaToColumn(formula, sampleHeaders, 3);
      expect(result).toEqual([
        '=B1 * C1',
        '=B2 * C2',
        '=B3 * C3'
      ]);
    });

    test('should handle empty input', () => {
      expect(applyFormulaToColumn('', sampleHeaders, 3)).toEqual([]);
      expect(applyFormulaToColumn(null, sampleHeaders, 3)).toEqual([]);
    });
  });

  describe('validateFormulaColumnNames', () => {
    test('should validate existing column names', () => {
      const formula = '=[Unit Price] * [Quantity]';
      const result = validateFormulaColumnNames(formula, sampleHeaders);
      expect(result).toEqual({
        isValid: true,
        missingColumns: []
      });
    });

    test('should detect missing column names', () => {
      const formula = '=[Unit Price] * [NonExistent]';
      const result = validateFormulaColumnNames(formula, sampleHeaders);
      expect(result).toEqual({
        isValid: false,
        missingColumns: ['NonExistent']
      });
    });

    test('should handle case-insensitive validation', () => {
      const formula = '=[unit price] * [QUANTITY]';
      const result = validateFormulaColumnNames(formula, sampleHeaders);
      expect(result).toEqual({
        isValid: true,
        missingColumns: []
      });
    });
  });

  describe('getAvailableColumnNames', () => {
    test('should return all headers when no search term', () => {
      const result = getAvailableColumnNames(sampleHeaders);
      expect(result).toEqual(sampleHeaders);
    });

    test('should filter headers based on search term', () => {
      const result = getAvailableColumnNames(sampleHeaders, 'Price');
      expect(result).toEqual(['Unit Price']);
    });

    test('should handle case-insensitive search', () => {
      const result = getAvailableColumnNames(sampleHeaders, 'price');
      expect(result).toEqual(['Unit Price']);
    });
  });

  describe('hasMixedReferences', () => {
    test('should detect mixed references', () => {
      const formula = '=[Unit Price] + A1';
      const result = hasMixedReferences(formula);
      expect(result).toBe(true);
    });

    test('should return false for column names only', () => {
      const formula = '=[Unit Price] * [Quantity]';
      const result = hasMixedReferences(formula);
      expect(result).toBe(false);
    });

    test('should return false for cell references only', () => {
      const formula = '=A1+B1';
      const result = hasMixedReferences(formula);
      expect(result).toBe(false);
    });
  });

  describe('getFormulaExamples', () => {
    test('should return array of formula examples', () => {
      const examples = getFormulaExamples();
      expect(Array.isArray(examples)).toBe(true);
      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0]).toHaveProperty('description');
      expect(examples[0]).toHaveProperty('formula');
      expect(examples[0]).toHaveProperty('explanation');
    });
  });
});