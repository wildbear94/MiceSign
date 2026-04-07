import type { Attachment } from '../../types/document';

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILES_PER_DOC = 10;
export const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB

export const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'hwp', 'hwpx', 'jpg', 'jpeg', 'png', 'zip',
];

export const BLOCKED_EXTENSIONS = ['exe', 'bat', 'sh', 'cmd', 'js', 'vbs'];

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function validateFile(file: File, existingFiles: Attachment[]): string | null {
  const ext = getFileExtension(file.name);

  // Check blocked extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return `허용되지 않는 파일 형식입니다: .${ext}`;
  }

  // Check allowed extensions
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return `허용되지 않는 파일 형식입니다: .${ext}`;
  }

  // Check individual file size
  if (file.size > MAX_FILE_SIZE) {
    return `파일 크기가 50MB를 초과합니다: ${file.name}`;
  }

  // Check file count
  if (existingFiles.length >= MAX_FILES_PER_DOC) {
    return '문서당 첨부파일은 최대 10개입니다.';
  }

  // Check total size
  const currentTotalSize = existingFiles.reduce((sum, a) => sum + a.fileSize, 0);
  if (currentTotalSize + file.size > MAX_TOTAL_SIZE) {
    return '문서당 첨부파일 총 용량은 200MB를 초과할 수 없습니다.';
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
