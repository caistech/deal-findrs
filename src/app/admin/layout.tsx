'use client'

import { usePathname } from 'next/navigation'
import { AdminLayout } from '@/components/common/AdminLayout'

/**
 * Wraps every /admin route in the persistent admin chrome (left navbar + Sign Out),
 * EXCEPT /admin/login — the unauthenticated entry point, which must stay bare
 * (matching how the user login sits outside AuthLayout).
 */
export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/admin/login') return <>{children}</>
  return <AdminLayout>{children}</AdminLayout>
}
