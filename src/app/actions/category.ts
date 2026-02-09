"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getCategories(eventId: string) {
    return await prisma.category.findMany({
        where: { eventId },
        include: {
            children: true,
            parent: true
        },
        orderBy: { sort: "asc" }
    })
}

export async function updateCategory(id: string, data: { name?: string, parentId?: string | null, sort?: number }) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Get the category before update to check changes
    const oldCat = await prisma.category.findUnique({
        where: { id },
        include: { parent: true }
    })

    const category = await prisma.category.update({
        where: { id },
        data: {
            name: data.name,
            parentId: data.parentId === undefined ? undefined : data.parentId,
            sort: data.sort
        },
        include: { parent: true }
    })

    // Sync MenuItems if name or parent changed
    if (data.name !== undefined || data.parentId !== undefined) {
        // 1. Update items directly in this category
        const parentName = category.parent?.name || category.name
        const subName = category.parent ? category.name : null

        await prisma.menuItem.updateMany({
            where: { categoryId: id },
            data: {
                category: parentName,
                subCategory: subName
            }
        })

        // 2. If this category has children, update them too? 
        // Actually, if this category is a parent and its name changed, its children's items need updating.
        if (data.name !== undefined) {
            const children = await prisma.category.findMany({ where: { parentId: id } })
            for (const child of children) {
                await prisma.menuItem.updateMany({
                    where: { categoryId: child.id },
                    data: {
                        category: category.name,
                        subCategory: child.name
                    }
                })
            }
        }
    }

    revalidatePath(`/admin/e/[slug]`, "page")
    return category
}

export async function createCategory(eventId: string, data: { name: string, parentId?: string | null, type?: "FOOD" | "DRINK" }) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const category = await prisma.category.create({
        data: {
            eventId,
            name: data.name,
            parentId: data.parentId,
            type: data.type || "FOOD",
            key: data.name.toLowerCase().replace(/[^a-z0-9]/g, "-"), // Simple key generation
        }
    })

    revalidatePath(`/admin/e/[slug]`, "page")
    return category
}

export async function deleteCategory(id: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Note: Items in this category might need to be reassigned or deleted.
    // In schema.prisma, MenuItem has categoryId but NO onDelete: Cascade by default for Category relation.
    // Let's check schema.prisma
    await prisma.category.delete({
        where: { id }
    })

    revalidatePath(`/admin/e/[slug]`, "page")
}
