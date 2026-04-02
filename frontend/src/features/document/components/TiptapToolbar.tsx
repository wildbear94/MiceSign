import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table,
  Image,
} from 'lucide-react';

interface TiptapToolbarProps {
  editor: Editor;
}

export default function TiptapToolbar({ editor }: TiptapToolbarProps) {
  function btn(
    active: boolean,
    onClick: () => void,
    ariaLabel: string,
    icon: React.ReactNode,
  ) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`h-8 w-8 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
          active
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        {icon}
      </button>
    );
  }

  function divider(key: string) {
    return (
      <div
        key={key}
        className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"
      />
    );
  }

  function handleInsertImage() {
    const url = window.prompt('이미지 URL을 입력하세요');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
      {/* Text group */}
      {btn(
        editor.isActive('bold'),
        () => editor.chain().focus().toggleBold().run(),
        '굵게',
        <Bold className="h-4 w-4" />,
      )}
      {btn(
        editor.isActive('italic'),
        () => editor.chain().focus().toggleItalic().run(),
        '기울임',
        <Italic className="h-4 w-4" />,
      )}
      {btn(
        editor.isActive('underline'),
        () => editor.chain().focus().toggleUnderline().run(),
        '밑줄',
        <Underline className="h-4 w-4" />,
      )}

      {divider('d1')}

      {/* Heading group */}
      {btn(
        editor.isActive('heading', { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        '제목 1',
        <Heading1 className="h-4 w-4" />,
      )}
      {btn(
        editor.isActive('heading', { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        '제목 2',
        <Heading2 className="h-4 w-4" />,
      )}
      {btn(
        editor.isActive('heading', { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        '제목 3',
        <Heading3 className="h-4 w-4" />,
      )}

      {divider('d2')}

      {/* List group */}
      {btn(
        editor.isActive('bulletList'),
        () => editor.chain().focus().toggleBulletList().run(),
        '글머리 기호',
        <List className="h-4 w-4" />,
      )}
      {btn(
        editor.isActive('orderedList'),
        () => editor.chain().focus().toggleOrderedList().run(),
        '번호 매기기',
        <ListOrdered className="h-4 w-4" />,
      )}

      {divider('d3')}

      {/* Block group */}
      {btn(
        editor.isActive('blockquote'),
        () => editor.chain().focus().toggleBlockquote().run(),
        '인용',
        <Quote className="h-4 w-4" />,
      )}

      {divider('d4')}

      {/* Table */}
      {btn(
        false,
        () =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
        '표 삽입',
        <Table className="h-4 w-4" />,
      )}

      {divider('d5')}

      {/* Media */}
      {btn(false, handleInsertImage, '이미지 삽입', <Image className="h-4 w-4" />)}
    </div>
  );
}
