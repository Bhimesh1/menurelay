"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { eventSchema } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { slugify } from "@/lib/utils"

export async function createEvent(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const title = formData.get("title") as string
    const restaurantName = formData.get("restaurantName") as string

    const validated = eventSchema.parse({
        title,
        restaurantName: restaurantName || undefined,
    })

    const randomSuffix = Math.random().toString(36).substring(2, 7)
    const slug = `${slugify(validated.title)}-${randomSuffix}`

    const event = await prisma.event.create({
        data: {
            userId: session.user.id,
            slug,
            title: validated.title,
            restaurantName: validated.restaurantName,
            status: "DRAFT",
        },
    })

    revalidatePath("/admin")
    return event
}

export async function updateEventStatus(id: string, status: "DRAFT" | "PUBLISHED" | "LOCKED") {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.event.update({
        where: { id, userId: session.user.id },
        data: { status },
    })

    revalidatePath("/admin")
    revalidatePath(`/admin/e/${id}`)
}

export async function deleteEvent(id: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.event.delete({
        where: { id, userId: session.user.id },
    })

    revalidatePath("/admin")
}
export async function updateEventSettings(id: string, data: {
    title: string,
    restaurantName?: string | null,
    showPrices: boolean,
    spiceScale: "GERMAN" | "INDIAN",
    pdfReportTitle?: string,
    pdfRestaurantLabel?: string,
    pdfSectionTitle?: string,
    pdfHeaderTitle?: string,
    pdfAddress?: string,
    vipName?: string | null,
    vipMessage?: string | null
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const event = await prisma.event.update({
        where: { id, userId: session.user.id },
        data: {
            title: data.title,
            restaurantName: data.restaurantName || null,
            showPrices: data.showPrices,
            spiceScale: data.spiceScale,
            pdfReportTitle: data.pdfReportTitle,
            pdfRestaurantLabel: data.pdfRestaurantLabel,
            pdfSectionTitle: data.pdfSectionTitle,
            pdfHeaderTitle: data.pdfHeaderTitle,
            pdfAddress: data.pdfAddress || null,
            vipName: data.vipName || null,
            vipMessage: data.vipMessage || null,
        } as any,
    })

    revalidatePath("/admin")
    revalidatePath(`/admin/e/${event.slug}`)
    revalidatePath(`/e/${event.slug}`)
    return event
}
