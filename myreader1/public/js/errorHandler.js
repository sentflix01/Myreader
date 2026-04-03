// Frontend Error Handling Utility

class ErrorHandler {
  static showError(message, title = 'Error') {
    // Create error modal or use existing alert system
    if (window.showAlert) {
      window.showAlert(message, 'error');
    } else {
      alert(`${title}: ${message}`);
    }
  }

  static showSuccess(message, title = 'Success') {
    if (window.showAlert) {
      window.showAlert(message, 'success');
    } else {
      console.log(`${title}: ${message}`);
    }
  }

  static showWarning(message, title = 'Warning') {
    if (window.showAlert) {
      window.showAlert(message, 'warning');
    } else {
      console.warn(`${title}: ${message}`);
    }
  }

  static handleApiError(error) {
    let message = 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          message = data.message || 'Invalid request';
          break;
        case 401:
          message = 'Please log in to continue';
          // Redirect to login if needed
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
            return;
          }
          break;
        case 403:
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          message = 'The requested resource was not found';
          break;
        case 413:
          message = 'File is too large';
          break;
        case 415:
          message = 'Unsupported file type';
          break;
        case 429:
          message = 'Too many requests. Please try again later';
          break;
        case 500:
          message = 'Server error. Please try again later';
          break;
        default:
          message = data.message || `Server error (${status})`;
      }
    } else if (error.request) {
      // Network error
      message = 'Network error. Please check your connection';
    } else {
      // Other error
      message = error.message || 'An unexpected error occurred';
    }
    
    this.showError(message);
    console.error('API Error:', error);
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    return password && password.length >= 8;
  }

  static validateFileSize(file, maxSizeMB = 10) {
    return file.size <= maxSizeMB * 1024 * 1024;
  }

  static validateFileType(file, allowedTypes = []) {
    const extension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  ErrorHandler.showError('An unexpected error occurred. Please refresh the page.');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  ErrorHandler.showError('An unexpected error occurred. Please try again.');
});

// Export for use in other modules
window.ErrorHandler = ErrorHandler;

export default ErrorHandler;