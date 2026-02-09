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

export async function updateCategory(id: string, data: { name?: string, parentId?: string | null, sort?: number, isHidden?: boolean }) {
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
            sort: data.sort,
            isHidden: data.isHidden
        } as any,
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
            isHidden: false,
            key: data.name.toLowerCase().replace(/[^a-z0-9]/g, "-"), // Simple key generation
        } as any
    })

    revalidatePath(`/admin/e/[slug]`, "page")
    return category
}

export async function deleteCategory(id: string, deleteAllItems: boolean = false) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Get the category to be deleted
    const category = await prisma.category.findUnique({
        where: { id },
        include: {
            items: true,
            children: true,
            parent: true
        }
    }) as any

    if (!category) throw new Error("Category not found")

    const eventId = category.eventId
    const isSubcategory = !!category.parentId

    if (deleteAllItems) {
        // DELETE EVERYTHING MODE
        const subcategoryIds = category.children?.map((c: any) => c.id) || []
        const allCategoryIds = [id, ...subcategoryIds]

        // Delete all items in these categories
        await prisma.menuItem.deleteMany({
            where: {
                categoryId: { in: allCategoryIds }
            }
        })

        // Delete subcategories
        if (subcategoryIds.length > 0) {
            await prisma.category.deleteMany({
                where: {
                    id: { in: subcategoryIds }
                }
            })
        }
    } else {
        // PRESERVE ITEMS MODE (Smart Reassignment)
        if (isSubcategory) {
            // SUBCATEGORY DELETION: Move items to parent category
            const parentId = category.parentId

            if (category.items.length > 0) {
                await prisma.menuItem.updateMany({
                    where: { categoryId: id },
                    data: {
                        categoryId: parentId,
                        category: category.parent?.name || "General",
                        subCategory: null
                    } as any
                })
            }
        } else {
            // MAIN CATEGORY DELETION: Move all items to "General"

            // Find or create "General" category
            let generalCategory = await prisma.category.findFirst({
                where: {
                    eventId,
                    name: "General",
                    parentId: null
                }
            })

            if (!generalCategory) {
                generalCategory = await prisma.category.create({
                    data: {
                        eventId,
                        name: "General",
                        key: "general",
                        type: "FOOD",
                        sort: 999,
                        isHidden: false
                    } as any
                })
            }

            // Collect all items from this category and its subcategories
            const subcategoryIds = category.children?.map((c: any) => c.id) || []
            const allCategoryIds = [id, ...subcategoryIds]

            // Move all items to General
            if (allCategoryIds.length > 0) {
                await prisma.menuItem.updateMany({
                    where: {
                        categoryId: { in: allCategoryIds }
                    },
                    data: {
                        categoryId: generalCategory.id,
                        category: "General",
                        subCategory: null
                    } as any
                })
            }

            // Delete all subcategories
            if (subcategoryIds.length > 0) {
                await prisma.category.deleteMany({
                    where: {
                        id: { in: subcategoryIds }
                    }
                })
            }
        }
    }

    // Finally, delete the category itself
    await prisma.category.delete({
        where: { id }
    })

    revalidatePath(`/admin/e/[slug]`, "page")
}
