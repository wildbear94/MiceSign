import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import TiptapToolbar from './TiptapToolbar';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export default function TiptapEditor({
  content,
  onChange,
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div>
      {editable && <TiptapToolbar editor={editor} />}
      <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg">
        <EditorContent
          editor={editor}
          className="min-h-[300px] p-4 prose prose-sm max-w-none dark:prose-invert"
        />
      </div>
    </div>
  );
}
