import { FileText, FileSpreadsheet, Presentation, Image, FileArchive, File } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, { icon: LucideIcon; label: string }> = {
  pdf: { icon: FileText, label: 'PDF 파일' },
  doc: { icon: FileText, label: '문서 파일' },
  docx: { icon: FileText, label: '문서 파일' },
  hwp: { icon: FileText, label: '문서 파일' },
  hwpx: { icon: FileText, label: '문서 파일' },
  xls: { icon: FileSpreadsheet, label: '스프레드시트 파일' },
  xlsx: { icon: FileSpreadsheet, label: '스프레드시트 파일' },
  ppt: { icon: Presentation, label: '프레젠테이션 파일' },
  pptx: { icon: Presentation, label: '프레젠테이션 파일' },
  jpg: { icon: Image, label: '이미지 파일' },
  jpeg: { icon: Image, label: '이미지 파일' },
  png: { icon: Image, label: '이미지 파일' },
  gif: { icon: Image, label: '이미지 파일' },
  bmp: { icon: Image, label: '이미지 파일' },
  webp: { icon: Image, label: '이미지 파일' },
  svg: { icon: Image, label: '이미지 파일' },
  zip: { icon: FileArchive, label: '압축 파일' },
  rar: { icon: FileArchive, label: '압축 파일' },
  '7z': { icon: FileArchive, label: '압축 파일' },
  tar: { icon: FileArchive, label: '압축 파일' },
  gz: { icon: FileArchive, label: '압축 파일' },
};

const DEFAULT_ICON = { icon: File, label: '파일' };

export function getFileIcon(filename: string): { icon: LucideIcon; label: string } {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ICON_MAP[ext] ?? DEFAULT_ICON;
}
