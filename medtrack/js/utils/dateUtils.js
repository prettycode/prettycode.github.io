// Date formatting and manipulation utilities
const dateUtils = {
  /**
   * Format a time difference in milliseconds to a human-readable string
   * @param {number} milliseconds - Time difference in milliseconds
   * @returns {string} Formatted time string (e.g. "2d 5h 30m" or "45m 20s")
   */
  formatTimeDifference: (milliseconds) => {
    const ms = Math.max(0, milliseconds);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  },
  
  /**
   * Format a date string to a full readable format
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string (e.g. "Monday, Jan 1, 2025, 2:30 PM EST")
   */
  formatDateTime: (dateString) => {
    const date = new Date(dateString);
    const dayOfWeek = date.toLocaleString(undefined, { weekday: 'long' });
    const month = date.toLocaleString(undefined, { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12 || 12;
    const timeZone = date.toLocaleString(undefined, { timeZoneName: 'short' }).split(' ').pop();
    
    return `${dayOfWeek}, ${month} ${day}, ${year}, ${hours}:${minutes} ${ampm} ${timeZone}`;
  },
  
  /**
   * Format a date string with day of week and time components
   * @param {string} dateString - ISO date string
   * @returns {Object} Object with dayOfWeek, timeOfDay, and timeZone properties
   */
  formatDateTimeWithDayOfWeek: (dateString) => {
    const date = new Date(dateString);
    const dayOfWeek = date.toLocaleString(undefined, { weekday: 'long' });
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12 || 12;
    const timeOfDay = `${hours}:${minutes} ${ampm}`;
    const timeZone = date.toLocaleString(undefined, { timeZoneName: 'short' }).split(' ').pop();
    
    return { dayOfWeek, timeOfDay, timeZone };
  },
  
  /**
   * Get the current date and time formatted for datetime-local input
   * @returns {string} Formatted date-time string for input
   */
  getCurrentDateTimeForInput: () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  },

  /**
   * Format a date string for datetime-local input
   * @param {string} timeString - ISO date string
   * @returns {string} Formatted date-time string for input
   */
  getDateTimeForEditInput: (timeString) => {
    const date = new Date(timeString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  },
  
  /**
   * Calculate the time difference between two dates in minutes
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {number} Difference in minutes
   */
  getMinutesDifference: (date1, date2) => {
    return Math.abs(date1 - date2) / (1000 * 60);
  },
  
  /**
   * Check if a date is in the future
   * @param {Date} date - Date to check
   * @returns {boolean} True if date is in the future
   */
  isFutureDate: (date) => {
    return date > new Date();
  }
}; 