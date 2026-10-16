import ClientScanner from './ClientScanner'
import prisma from '@/lib/prisma'

export const instant = false

export default async function ScannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const event = await prisma.event.findUnique({ where: { id } })
  const formConfig = event?.requiredFields ? JSON.parse(event.requiredFields) : {}
  const checkpoints = formConfig.checkpoints || ['Ingreso']

  return <ClientScanner eventId={id} checkpoints={checkpoints} />
}
