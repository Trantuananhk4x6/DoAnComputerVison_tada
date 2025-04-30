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
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  PeopleOutline as PeopleIcon,
  Pets as PetsIcon,
  LocalOffer as ClassIcon,
  AutoGraph as TrackIcon
} from '@mui/icons-material';

const TrackingDataTable = ({ tracks, totalFrames }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Convert tracks object to array for table display
  const tracksArray = tracks ? Object.entries(tracks).map(([trackId, data]) => ({
    id: trackId,
    ...data,
    duration: data.last_frame - data.first_frame + 1,
    durationPercent: ((data.last_frame - data.first_frame + 1) / totalFrames) * 100
  })) : [];

  // Filter by search term
  const filteredTracks = tracksArray.filter(track => 
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
    </Paper>
  );
};

export default TrackingDataTable;