import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor - envelope unwrapping
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // JWT refresh interceptor will be added in Phase 2
    // For now, just pass through errors
    return Promise.reject(error);
  }
);

export default apiClient;
