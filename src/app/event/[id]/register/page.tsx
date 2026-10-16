import ClientForm from './ClientForm'
import prisma from '@/lib/prisma'
import type { Metadata } from 'next'

export const instant = false

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })

  if (!event) {
    return {
      title: 'Inscripción a Evento | Gobernación de Norte de Santander',
      description: 'Formulario oficial de pre-registro a eventos institucionales de la Gobernación de Norte de Santander.'
    }
  }

  const eventName = event.name
  const title = `Inscripción: ${eventName}`
  const description = event.description 
    ? `${event.description} — Diligencie su formulario oficial de pre-registro con la Gobernación de Norte de Santander.`
    : `Formulario oficial de pre-registro e inscripción para el evento "${eventName}". Asegure su participación — Gobernación de Norte de Santander.`

  const imageUrl = event.imageUrl || 'https://asistenciaeventos.nortedesantander.gov.co/logo.png'

  return {
    title,
    description,
    openGraph: {
      title: `${eventName} — Inscripción Oficial`,
      description,
      url: `https://asistenciaeventos.nortedesantander.gov.co/event/${id}/register`,
      siteName: 'Gobernación de Norte de Santander',
      locale: 'es_CO',
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: eventName
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${eventName} — Inscripción Oficial`,
      description,
      images: [imageUrl]
    }
  }
}

export default async function RegisterEventPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ mode?: string }>
}) {
  const { id } = await params
  const { mode } = await searchParams
  
  const event = await prisma.event.findUnique({ where: { id } })
  const formConfig = event?.requiredFields ? JSON.parse(event.requiredFields) : {}

  // Calculate current registrations count per municipality for this event
  const registrations = await prisma.registration.findMany({
    where: { eventId: id },
    select: { person: { select: { municipality: true } } }
  })
  
  const municipalityCounts: Record<string, number> = {}
  registrations.forEach(r => {
    const m = r.person?.municipality
    if (m) {
      municipalityCounts[m] = (municipalityCounts[m] || 0) + 1
    }
  })

  return (
    <ClientForm 
      eventId={id} 
      eventData={{
        name: event?.name || 'Evento Institucional',
        description: event?.description || '',
        startDate: event?.startDate ? event.startDate.toISOString() : null,
        endDate: event?.endDate ? event.endDate.toISOString() : null,
        location: event?.location || null,
        organizer: event?.organizer || null,
        capacity: event?.capacity || null,
        imageUrl: event?.imageUrl || null
      }}
      mode={mode || 'public'} 
      formConfig={formConfig} 
      municipalityCounts={municipalityCounts} 
    />
  )
}
