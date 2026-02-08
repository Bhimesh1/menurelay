"use server"

import prisma from "@/lib/prisma"
import { guestOrderSchema } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function submitGuestOrder(eventSlug: string, data: any) {
    const event = await prisma.event.findUnique({
        where: { slug: eventSlug },
        select: { id: true, status: true, spiceScale: true }
    })

    if (!event || event.status === "LOCKED") {
        throw new Error("Event is not accepting orders")
    }

    const validated = guestOrderSchema.parse(data)

    // Use a transaction to handle existing orders (overwrite)
    const result = await prisma.$transaction(async (tx) => {
        // Look for existing order by name in this event
        const existingOrder = await tx.guestOrder.findUnique({
            where: {
                eventId_guestName: {
                    eventId: event.id,
                    guestName: validated.guestName
                }
            }
        })

        if (existingOrder) {
            // Delete existing order items
            await tx.orderItem.deleteMany({
                where: { guestOrderId: existingOrder.id }
            })

            // Update the main order
            return tx.guestOrder.update({
                where: { id: existingOrder.id },
                data: {
                    notes: validated.notes,
                    items: {
                        create: validated.items.map(item => ({
                            menuItemId: item.menuItemId,
                            bundleId: item.bundleId,
                            kind: item.kind,
                            codeSnapshot: item.codeSnapshot,
                            nameSnapshot: item.nameSnapshot,
                            qty: item.qty,
                            optionLabel: item.optionLabel,
                            optionPrice: item.optionPrice,
                            priceSnapshot: item.priceSnapshot || 0,
                            spiceLevel: item.spiceLevel,
                            spiceScale: item.spiceScale || event.spiceScale,
                            note: item.note
                        }))
                    }
                }
            })
        } else {
            // Create new order
            return tx.guestOrder.create({
                data: {
                    eventId: event.id,
                    guestName: validated.guestName,
                    notes: validated.notes,
                    items: {
                        create: validated.items.map(item => ({
                            menuItemId: item.menuItemId,
                            bundleId: item.bundleId,
                            kind: item.kind,
                            codeSnapshot: item.codeSnapshot,
                            nameSnapshot: item.nameSnapshot,
                            qty: item.qty,
                            optionLabel: item.optionLabel,
                            optionPrice: item.optionPrice,
                            priceSnapshot: item.priceSnapshot || 0,
                            spiceLevel: item.spiceLevel,
                            spiceScale: (item.spiceScale || event.spiceScale) as any,
                            note: item.note
                        })) as any[]
                    }
                }
            })
        }
    })

    revalidatePath(`/e/${eventSlug}`)
    revalidatePath(`/admin/e/${eventSlug}`)
    return result
}

export async function deleteGuestOrder(id: string, eventSlug: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.guestOrder.delete({
        where: { id }
    })

    revalidatePath(`/admin/e/${eventSlug}`)
}
