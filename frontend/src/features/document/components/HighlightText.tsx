function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface HighlightTextProps {
  text: string;
  keyword: string;
}

export default function HighlightText({ text, keyword }: HighlightTextProps) {
  if (!keyword || !text) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegex(keyword)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
