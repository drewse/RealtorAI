
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  // Base navigation items
  const baseNavigation = [
    { name: 'Record', href: '/', icon: 'ri-mic-line' },
    { name: 'Properties', href: '/properties', icon: 'ri-home-line' },
    { name: 'Clients', href: '/clients', icon: 'ri-user-line' },
    { name: 'Dashboard', href: '/dashboard', icon: 'ri-dashboard-line' },
    { name: 'Settings', href: '/settings', icon: 'ri-settings-line' },
  ];

  // Add development-only navigation items
  const navigation = [...baseNavigation];
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    navigation.splice(-1, 0, 
      { name: 'Admin', href: '/admin', icon: 'ri-admin-line' },
      { name: 'QA Tools', href: '/qa-tools', icon: 'ri-tools-line' }
    );
  }

  // Determine grid columns based on number of items
  const gridCols = navigation.length === 7 ? 'grid-cols-7' : 'grid-cols-5';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-50">
      <div className="max-w-md mx-auto">
        <div className={`grid ${gridCols} min-h-[60px]`}>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link 
                key={item.name}
                href={item.href} 
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors cursor-pointer min-h-[60px] ${
                  isActive ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center mb-1">
                  <i className={`${item.icon} text-lg`}></i>
                </div>
                <span className="text-xs leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
