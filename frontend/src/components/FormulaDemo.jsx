import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';
import SpreadsheetComponent from '../components/SpreadsheetComponent';

const FormulaDemo = () => {
  // Sample data for demonstration
  const [sampleData, setSampleData] = useState([
    ['Product A', 100, 5, 500, 'Complete'],
    ['Product B', 150, 3, 450, 'Pending'],
    ['Product C', 80, 7, 560, 'Complete'],
    ['Product D', 200, 2, 400, 'Complete'],
    ['Product E', 120, 4, 480, 'Pending']
  ]);

  const headers = ['Product', 'Unit Price', 'Quantity', 'Total', 'Status'];

  const [demoScenarios] = useState([
    {
      title: 'Basic Calculation',
      description: 'Multiply Unit Price by Quantity',
      formula: '=[Unit Price] * [Quantity]',
      explanation: 'This formula multiplies the Unit Price column by the Quantity column for each row.'
    },
    {
      title: 'Conditional Logic',
      description: 'Apply discount for completed orders',
      formula: '=IF([Status]="Complete", [Total] * 0.9, [Total])',
      explanation: 'This formula applies a 10% discount to completed orders, otherwise uses the original total.'
    },
    {
      title: 'Range Sum',
      description: 'Sum from Unit Price to Total',
      formula: '=SUM([Unit Price]:[Total])',
      explanation: 'This formula sums all numeric values from Unit Price to Total columns.'
    },
    {
      title: 'Average Calculation',
      description: 'Calculate average price',
      formula: '=AVERAGE([Unit Price]:[Quantity])',
      explanation: 'This formula calculates the average of values from Unit Price to Quantity columns.'
    },
    {
      title: 'Mixed References',
      description: 'Combine column names with cell references',
      formula: '=[Unit Price] + C5',
      explanation: 'This formula adds the Unit Price column value to the value in cell C5.'
    }
  ]);

  const handleDataChange = (newData) => {
    setSampleData(newData);
  };

  const resetData = () => {
    setSampleData([
      ['Product A', 100, 5, 500, 'Complete'],
      ['Product B', 150, 3, 450, 'Pending'],
      ['Product C', 80, 7, 560, 'Complete'],
      ['Product D', 200, 2, 400, 'Complete'],
      ['Product E', 120, 4, 480, 'Pending']
    ]);
  };

  const addSampleRow = () => {
    const newRow = [
      `Product ${String.fromCharCode(65 + sampleData.length)}`,
      Math.floor(Math.random() * 200) + 50,
      Math.floor(Math.random() * 10) + 1,
      0,
      Math.random() > 0.5 ? 'Complete' : 'Pending'
    ];
    setSampleData([...sampleData, newRow]);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <TableChartIcon sx={{ mr: 2, fontSize: 'inherit' }} />
          Formula Feature Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This demo showcases the enhanced formula feature that supports column names instead of cell references.
          You can now create formulas using meaningful column names in square brackets like [Price] or [Quantity].
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Main Spreadsheet */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Interactive Spreadsheet
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={addSampleRow}
                  sx={{ mr: 1 }}
                >
                  Add Row
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={resetData}
                >
                  Reset Data
                </Button>
              </Box>
            </Box>
            
            <SpreadsheetComponent
              data={sampleData}
              headers={headers}
              onDataChange={handleDataChange}
              height={400}
              title=""
            />
          </Paper>
        </Grid>

        {/* Formula Examples */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Formula Examples
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Try these formula examples in the spreadsheet:
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {demoScenarios.map((scenario, index) => (
                <Card key={index} variant="outlined" sx={{ cursor: 'pointer' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {scenario.title}
                    </Typography>
                    <Chip
                      label={scenario.formula}
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{ fontFamily: 'monospace', mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {scenario.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Feature Highlights */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Feature Highlights
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Alert severity="info" sx={{ height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Column Name Support
                  </Typography>
                  <Typography variant="body2">
                    Use [Column Name] syntax instead of cell references like A1, B1
                  </Typography>
                </Alert>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Alert severity="success" sx={{ height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Auto-Complete
                  </Typography>
                  <Typography variant="body2">
                    Column names are auto-suggested as you type your formulas
                  </Typography>
                </Alert>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Alert severity="warning" sx={{ height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Real-time Validation
                  </Typography>
                  <Typography variant="body2">
                    Formulas are validated to ensure all column names exist
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Advanced Features */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Advanced Features
            </Typography>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Range Operations</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  You can use range operations with column names:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip label="=SUM([Price]:[Total])" variant="outlined" size="small" />
                  <Chip label="=AVERAGE([Start]:[End])" variant="outlined" size="small" />
                  <Chip label="=MAX([Col1]:[Col5])" variant="outlined" size="small" />
                </Box>
                <Typography variant="body2">
                  These formulas work across multiple columns and automatically adjust when applied to different rows.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Backward Compatibility</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  The system maintains full backward compatibility with traditional Excel-style cell references:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip label="=A1+B1" variant="outlined" size="small" />
                  <Chip label="=SUM(A1:C1)" variant="outlined" size="small" />
                  <Chip label="=IF(D1>0,A1*B1,0)" variant="outlined" size="small" />
                </Box>
                <Typography variant="body2">
                  You can even mix column names with cell references in the same formula.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Column Formula Application</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  Apply formulas to entire columns with a single action:
                </Typography>
                <Typography variant="body2" paragraph>
                  1. Select any cell in the target column
                  <br />
                  2. Click the formula button and enter your formula
                  <br />
                  3. Choose "Apply to Column" to apply the formula to all rows
                </Typography>
                <Typography variant="body2">
                  The formula will automatically adjust for each row, converting column names to the appropriate cell references.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FormulaDemo;