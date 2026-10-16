import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // First, delete all registrations for this event to avoid foreign key constraints
    await prisma.registration.deleteMany({
      where: { eventId: id }
    })
    
    // Then delete the event itself
    await prisma.event.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    let requiredFieldsObj: any = {}
    try {
      requiredFieldsObj = event.requiredFields ? JSON.parse(event.requiredFields) : {}
    } catch (e) {}

    if (body.municipalityQuotas !== undefined) {
      requiredFieldsObj.municipalityQuotas = body.municipalityQuotas
    }

    if (body.restrictedByEmail !== undefined) {
      requiredFieldsObj.restrictedByEmail = Boolean(body.restrictedByEmail)
    }

    if (body.allowedEmails !== undefined) {
      requiredFieldsObj.allowedEmails = Array.isArray(body.allowedEmails)
        ? body.allowedEmails.map((e: string) => e.toString().trim().toLowerCase()).filter(Boolean)
        : []
    }

    if (body.requiredFields !== undefined) {
      const incoming = typeof body.requiredFields === 'string' 
        ? JSON.parse(body.requiredFields) 
        : body.requiredFields
      requiredFieldsObj = { ...requiredFieldsObj, ...incoming }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        requiredFields: JSON.stringify(requiredFieldsObj),
        ...(body.name && { name: body.name }),
        ...(body.status && { status: body.status }),
        ...(body.capacity !== undefined && { capacity: body.capacity })
      }
    })

    revalidatePath(`/admin/events/${id}`)
    revalidatePath(`/event/${id}/register`)
    return NextResponse.json({ success: true, event: updated })
  } catch (err: any) {
    console.error('Update event error:', err)
    return NextResponse.json({ error: err.message || 'Error al actualizar evento' }, { status: 500 })
  }
}
