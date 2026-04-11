import { useState } from 'react';
import { Outlet } from 'react-router';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header with hamburger */}
        <div className="flex items-center p-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="사이드바 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <main className="flex-1 overflow-auto p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
