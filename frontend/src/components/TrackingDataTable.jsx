import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Box,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
  Button,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  PeopleOutline as PeopleIcon,
  Pets as PetsIcon,
  LocalOffer as ClassIcon,
  AutoGraph as TrackIcon,
  Add as AddIcon,
  Functions as FunctionsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import AddColumnModal from './AddColumnModal';
import { getAvailableColumns, evaluateFormula } from '../ultils/formulaUtils';

const TrackingDataTable = ({ tracks, totalFrames }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [customColumns, setCustomColumns] = useState([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [selectedColumnId, setSelectedColumnId] = useState(null);
  const theme = useTheme();

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value.toLowerCase());
    setPage(0);
  };

  // Get available columns for formulas
  const availableColumns = getAvailableColumns(tracks);

  // Handle adding custom column
  const handleAddColumn = (column) => {
    setCustomColumns(prev => [...prev, column]);
    setShowAddColumnModal(false);
  };

  // Handle editing custom column
  const handleEditColumn = (column) => {
    setCustomColumns(prev => prev.map(col => 
      col.id === column.id ? column : col
    ));
    setEditingColumn(null);
    setShowAddColumnModal(false);
  };

  // Handle deleting custom column
  const handleDeleteColumn = (columnId) => {
    setCustomColumns(prev => prev.filter(col => col.id !== columnId));
    setColumnMenuAnchor(null);
    setSelectedColumnId(null);
  };

  // Handle column menu
  const handleColumnMenuOpen = (event, columnId) => {
    setColumnMenuAnchor(event.currentTarget);
    setSelectedColumnId(columnId);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
    setSelectedColumnId(null);
  };

  // Handle editing column from menu
  const handleEditFromMenu = () => {
    const column = customColumns.find(col => col.id === selectedColumnId);
    if (column) {
      setEditingColumn(column);
      setShowAddColumnModal(true);
    }
    handleColumnMenuClose();
  };

  // Convert tracks object to array for table display
  const tracksArray = tracks ? Object.entries(tracks).map(([trackId, data]) => ({
    id: trackId,
    ...data,
    duration: data.last_frame - data.first_frame + 1,
    durationPercent: ((data.last_frame - data.first_frame + 1) / totalFrames) * 100
  })) : [];

  // Add custom column values
  const tracksWithCustomColumns = tracksArray.map(track => {
    const customValues = {};
    
    customColumns.forEach(column => {
      try {
        const value = evaluateFormula(column.formula, track, availableColumns);
        customValues[column.id] = value;
      } catch (error) {
        console.error(`Error evaluating formula for column ${column.name}:`, error);
        customValues[column.id] = 'Error';
      }
    });
    
    return {
      ...track,
      customColumns: customValues
    };
  });

  // Filter by search term
  const filteredTracks = tracksWithCustomColumns.filter(track => 
    track.class?.toLowerCase().includes(searchTerm) ||
    track.id.toLowerCase().includes(searchTerm)
  );

  // Apply pagination
  const displayedTracks = filteredTracks
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Function to get class type color
  const getClassColor = (className) => {
    if (!className) return theme.palette.info.main;
    
    const lowerClass = className.toLowerCase();
    if (lowerClass.includes('person')) return theme.palette.error.main;
    if (lowerClass.includes('animal') || lowerClass.includes('dog') || lowerClass.includes('cat')) {
      return theme.palette.success.main;
    }
    return theme.palette.info.main;
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        borderRadius: 2, 
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center' }}>
          <TrackIcon sx={{ mr: 1 }} />
          Chi tiết Object Tracking
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowAddColumnModal(true)}
            sx={{ borderRadius: 2 }}
          >
            Add Column
          </Button>
          
          <TextField
            placeholder="Tìm kiếm..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 }
            }}
          />
        </Box>
      </Box>
      
      <TableContainer sx={{ maxHeight: 440, borderRadius: 2, mb: 2 }}>
        <Table stickyHeader aria-label="tracking data table" size="small">
          <TableHead>
            <TableRow>
              <TableCell>Track ID</TableCell>
              <TableCell>Loại đối tượng</TableCell>
              <TableCell>Frame bắt đầu</TableCell>
              <TableCell>Frame kết thúc</TableCell>
              <TableCell>Thời gian xuất hiện</TableCell>
              <TableCell align="center">% Video</TableCell>
              {customColumns.map((column) => (
                <TableCell key={column.id} align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FunctionsIcon sx={{ mr: 1, fontSize: 'small', color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {column.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleColumnMenuOpen(e, column.id)}
                      sx={{ ml: 1, opacity: 0.7 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedTracks.length > 0 ? (
              displayedTracks.map((track) => (
                <TableRow 
                  key={track.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    #{track.id}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={
                        track.class?.toLowerCase().includes('person') ? <PeopleIcon fontSize="small" /> : 
                        (track.class?.toLowerCase().includes('animal') || 
                         track.class?.toLowerCase().includes('dog') || 
                         track.class?.toLowerCase().includes('cat')) ? <PetsIcon fontSize="small" /> : 
                        <ClassIcon fontSize="small" />
                      }
                      label={track.class || 'Unknown'}
                      size="small"
                      sx={{
                        bgcolor: `${getClassColor(track.class)}20`,
                        color: getClassColor(track.class),
                        borderColor: getClassColor(track.class)
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{track.first_frame}</TableCell>
                  <TableCell>{track.last_frame}</TableCell>
                  <TableCell>{track.duration} frames</TableCell>
                  <TableCell align="center">
                    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: '100%',
                          height: 8,
                          mr: 1,
                          borderRadius: 1,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            width: `${track.durationPercent}%`,
                            height: '100%',
                            bgcolor: getClassColor(track.class)
                          }}
                        />
                      </Box>
                      <Typography variant="caption">
                        {track.durationPercent.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  {customColumns.map((column) => (
                    <TableCell key={column.id} align="center">
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        minHeight: '32px'
                      }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                          }}
                        >
                          {track.customColumns?.[column.id] ?? 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6 + customColumns.length} align="center">
                  {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu tracking'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredTracks.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Hiển thị:"
      />

      {/* Column Menu */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={handleColumnMenuClose}
        PaperProps={{
          sx: { minWidth: 150 }
        }}
      >
        <MenuItem onClick={handleEditFromMenu}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleDeleteColumn(selectedColumnId)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Add Column Modal */}
      <AddColumnModal
        open={showAddColumnModal}
        onClose={() => {
          setShowAddColumnModal(false);
          setEditingColumn(null);
        }}
        onSave={editingColumn ? handleEditColumn : handleAddColumn}
        availableColumns={availableColumns}
        editingColumn={editingColumn}
      />
    </Paper>
  );
};

export default TrackingDataTable;