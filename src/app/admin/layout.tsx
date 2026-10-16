import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AdminLayoutClient from './AdminLayoutClient'

export const instant = false

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <AdminLayoutClient sessionUser={session}>{children}</AdminLayoutClient>
}
