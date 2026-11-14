import { useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { TopNav } from './top-nav';

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className="transition-all duration-200"
        style={{ marginLeft: collapsed ? 60 : 230 }}
      >
        <TopNav />
        <main className="px-6 py-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
