import type { TemplateReadOnlyProps } from './templateRegistry';

export default function GeneralReadOnly({ bodyHtml }: TemplateReadOnlyProps) {
  return (
    <div>
      {bodyHtml ? (
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : (
        <p className="text-sm text-gray-400">내용 없음</p>
      )}
    </div>
  );
}
