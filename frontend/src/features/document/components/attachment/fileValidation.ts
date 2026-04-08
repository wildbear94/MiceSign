export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'sh', 'cmd', 'msi', 'ps1', 'vbs', 'js', 'jar', 'com',
]);
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILES = 10;
export const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function validateFile(
  file: File,
  currentCount: number,
  currentTotalSize: number,
): string | null {
  const ext = getFileExtension(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) return `허용되지 않는 파일 형식입니다: .${ext}`;
  if (file.size > MAX_FILE_SIZE) return `파일 크기가 50MB를 초과합니다: ${file.name}`;
  if (currentCount >= MAX_FILES) return '문서당 첨부파일은 최대 10개입니다';
  if (currentTotalSize + file.size > MAX_TOTAL_SIZE)
    return '문서당 첨부파일 총 용량은 200MB를 초과할 수 없습니다';
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
