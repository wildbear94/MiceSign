import type { TemplateReadOnlyProps } from './templateRegistry';
import DrafterInfoHeader from '../DrafterInfoHeader';

export default function GeneralReadOnly({
  bodyHtml,
  drafterSnapshot,
  drafterLive,
  submittedAt,
}: TemplateReadOnlyProps) {
  return (
    <div>
      <DrafterInfoHeader
        mode="submitted"
        snapshot={drafterSnapshot}
        live={drafterLive}
        submittedAt={submittedAt}
      />
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
