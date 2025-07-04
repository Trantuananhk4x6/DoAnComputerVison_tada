/**
 * Format file size in bytes to a human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  /**
   * Format date for display
   * @param {string|number} timestamp - Date in ISO format or timestamp
   * @returns {string} Formatted date
   */
  export const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      // Try to parse as Unix timestamp
      if (typeof timestamp === 'number') {
        return new Date(timestamp * 1000).toLocaleString();
      }
      
      // Try to parse as ISO string
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Unknown date';
    }
  };
  
  /**
   * Format duration in seconds
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  export const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };