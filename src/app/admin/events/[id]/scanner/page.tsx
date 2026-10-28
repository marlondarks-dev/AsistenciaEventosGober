import ClientScanner from './ClientScanner'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const instant = false

export default async function ScannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    redirect('/admin/events')
  }

  // Guard for simultaneous events: If the operator is assigned to a different event, redirect them to their own scanner
  if (session?.role === 'VALIDADOR' && session?.assignedEventId && session.assignedEventId !== id) {
    redirect(`/admin/events/${session.assignedEventId}/scanner`)
  }

  const formConfig = event?.requiredFields ? JSON.parse(event.requiredFields) : {}
  const checkpoints = formConfig.checkpoints || ['Ingreso']

  return (
    <ClientScanner 
      eventId={id} 
      eventName={event.name} 
      checkpoints={checkpoints} 
      sessionUser={session} 
    />
  )
}
