import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { NAV_ITEMS } from '@/config/nav';
import { formatDateLong } from '@/lib/date-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function TopNav() {
  const location = useLocation();
  const currentItem = NAV_ITEMS.find(
    (item) =>
      item.path === '/app'
        ? location.pathname === '/app'
        : location.pathname.startsWith(item.path)
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/90 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            {currentItem?.label || 'Command Center'}
          </h1>
          <p className="text-[11px] text-muted-foreground">{formatDateLong(new Date())}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="h-8 w-44 border-border bg-card pl-8 text-[13px]"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
