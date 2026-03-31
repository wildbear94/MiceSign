// API Response Envelope (matches backend ApiResponse record)
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ErrorDetail | null;
}

export interface ErrorDetail {
  code: string;
  message: string;
}

// Pagination (matches D-16: page=0, size=20, Spring Data Pageable)
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page (0-indexed)
  first: boolean;
  last: boolean;
}

export interface PageRequest {
  page?: number;  // default 0
  size?: number;  // default 20
  sort?: string;
}
