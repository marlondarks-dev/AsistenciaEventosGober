import { Suspense } from 'react'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ReportViewerClient from './ReportViewerClient'

export const instant = false

export default async function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  await headers()
  const { id } = await params
  
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { person: true },
        orderBy: { registeredAt: 'asc' }
      }
    }
  })

  if (!event) {
    redirect('/admin/events')
  }

  // Pass all registrations so the client can filter between "Todos", "Asistieron", "Pendientes", or by Search
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#64748B' }}>
        <p>Cargando fichas de asistencia...</p>
      </div>
    }>
      <ReportViewerClient 
        event={{
          id: event.id,
          name: event.name,
          location: event.location,
          startDate: event.startDate,
          requiredFields: event.requiredFields
        }} 
        registrations={event.registrations} 
      />
    </Suspense>
  )
}
