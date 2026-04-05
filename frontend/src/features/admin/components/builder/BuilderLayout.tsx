import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BuilderLayoutProps {
  toolbar: React.ReactNode;
  palette: React.ReactNode;
  canvas: React.ReactNode;
  propertyPanel: React.ReactNode;
}

export default function BuilderLayout({
  toolbar,
  palette,
  canvas,
  propertyPanel,
}: BuilderLayoutProps) {
  const { t } = useTranslation('admin');
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-gray-500">
        <Monitor className="h-12 w-12" />
        <p className="text-lg font-semibold">{t('templates.desktopOnly')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {toolbar}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[200px] shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
          {palette}
        </aside>
        <main className="flex-1 min-w-[400px] overflow-y-auto bg-white dark:bg-gray-950">
          {canvas}
        </main>
        <aside className="w-[300px] shrink-0 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
          {propertyPanel}
        </aside>
      </div>
    </div>
  );
}
