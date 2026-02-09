"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { menuJsonSchema } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { DRINK_KEYWORDS, slugify } from "@/lib/utils"

export async function saveMenuJson(eventId: string, json: any) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { userId: true, slug: true }
    })
    if (!event || event.userId !== session.user.id) throw new Error("Unauthorized")

    try {
        const validated = menuJsonSchema.parse(json)

        await prisma.event.update({
            where: { id: eventId },
            data: { menuJson: validated as any } as any
        })

        revalidatePath(`/admin/e/[slug]`, "page")
        revalidatePath(`/e/${event.slug}`, "page")
        return { success: true }
    } catch (error: any) {
        if (error.issues) {
            return { errorType: "SCHEMA", issues: error.issues }
        }
        return { errorType: "PARSE", message: error.message }
    }
}

export async function getMenuJson(eventId: string) {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { menuJson: true } as any
    })
    return (event as any)?.menuJson || null
}

export async function importMenuFromJson(eventId: string, json: any) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    try {
        const validated = menuJsonSchema.parse(json)

        await prisma.$transaction(async (tx) => {
            // Strategy 1: Wipe + Replace
            await tx.bundleLine.deleteMany({ where: { bundle: { eventId } } })
            await tx.bundle.deleteMany({ where: { eventId } })
            await tx.menuItemOption.deleteMany({ where: { item: { eventId } } })
            await tx.menuItemImage.deleteMany({ where: { item: { eventId } } })
            await tx.menuItem.deleteMany({ where: { eventId } })
            await tx.category.deleteMany({ where: { eventId } })

            // 1. Create Categories
            const categoriesMap: Record<string, string> = {}
            for (const cat of validated.categories) {
                const created = await tx.category.create({
                    data: {
                        eventId,
                        key: cat.id,
                        name: cat.name,
                        sort: cat.sort,
                        type: cat.type,
                    }
                })
                categoriesMap[cat.id] = created.id
            }

            // 2. Create Items
            for (const item of validated.items) {
                const categoryInternalId = categoriesMap[item.categoryId]
                if (!categoryInternalId) {
                    throw new Error(`Category link failed: Category ID "${item.categoryId}" not found in categories list.`)
                }

                const createdItem = await tx.menuItem.create({
                    data: {
                        eventId,
                        categoryId: categoryInternalId,
                        code: item.code,
                        name: item.name,
                        description: item.description,
                        category: validated.categories.find(c => c.id === item.categoryId)?.name || "General",
                        subCategory: item.subCategory,
                        price: item.price,
                        isVeg: item.diet?.veg || false,
                        isVegan: item.diet?.vegan || false,
                        isDrink: validated.categories.find(c => c.id === item.categoryId)?.type === "DRINK",
                        tags: item.tags || [],
                    }
                })

                if (item.images && item.images.length > 0) {
                    await tx.menuItemImage.createMany({
                        data: item.images.map((url, i) => ({
                            itemId: createdItem.id,
                            url,
                            sort: i
                        }))
                    })
                }

                if (item.options && item.options.length > 0) {
                    await tx.menuItemOption.createMany({
                        data: item.options.map(opt => ({
                            itemId: createdItem.id,
                            label: opt.label,
                            metaQty: opt.metaQty,
                            price: opt.price
                        }))
                    })
                }
            }

            // 3. Create Bundles
            for (const bundle of validated.bundles) {
                const createdBundle = await tx.bundle.create({
                    data: {
                        eventId,
                        code: bundle.code,
                        name: bundle.name,
                        description: bundle.description,
                        price: bundle.price,
                    }
                })

                if (bundle.lines && bundle.lines.length > 0) {
                    // Parse "2x Some Item" string format
                    const parsedLines: { label: string; qty: number; note: null }[] = bundle.lines.map((lineStr: string) => {
                        const match = lineStr.match(/^(\d+)x\s+(.+)$/i)
                        if (match) {
                            return {
                                label: match[2].trim(),
                                qty: parseInt(match[1]),
                                note: null
                            }
                        }
                        return {
                            label: lineStr.trim(),
                            qty: 1,
                            note: null
                        }
                    })

                    await tx.bundleLine.createMany({
                        data: parsedLines.map(line => ({
                            bundleId: createdBundle.id,
                            label: line.label,
                            note: line.note,
                            qty: line.qty
                        }))
                    })
                }
            }

            // 4. Update Event JSON backup and restaurant name
            await tx.event.update({
                where: { id: eventId },
                data: {
                    menuJson: validated as any,
                    restaurantName: validated.restaurant || undefined
                }
            })
        })

        revalidatePath(`/admin/e/[slug]`, "page")
        return { success: true }
    } catch (error: any) {
        console.error("Import Error:", error)
        if (error.issues) {
            return { errorType: "SCHEMA", issues: error.issues }
        }
        return { errorType: "OTHER", message: error.message }
    }
}

export async function addMenuItem(eventId: string, data: any) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    let categoryId = data.categoryId
    let categoryName = data.category

    if (!categoryId) {
        // For manual add, we need a category. We'll find or create a "Manual" category.
        let category = await prisma.category.findFirst({
            where: { eventId, name: data.category }
        })

        if (!category) {
            category = await prisma.category.create({
                data: {
                    eventId,
                    key: slugify(data.category),
                    name: data.category,
                }
            })
        }
        categoryId = category.id
        categoryName = category.name
    } else {
        const cat = await prisma.category.findUnique({
            where: { id: categoryId },
            include: { parent: true } as any
        })
        if (cat) {
            const c = cat as any
            if (c.parent) {
                categoryName = c.parent.name
                data.subCategory = c.name
            } else {
                categoryName = c.name
                data.subCategory = data.subCategory || null
            }
        }
    }

    const item = await prisma.menuItem.create({
        data: {
            ...data,
            price: parseFloat(data.price) || 0,
            eventId,
            categoryId,
            category: categoryName,
            subCategory: data.subCategory || null,
        },
    })

    revalidatePath(`/admin/e/[slug]`, "page")
    return item
}

export async function updateMenuItem(id: string, data: any) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    let categoryName = data.category
    let subCategory = data.subCategory

    if (data.categoryId) {
        const cat = await prisma.category.findUnique({
            where: { id: data.categoryId },
            include: { parent: true } as any
        })
        if (cat) {
            const c = cat as any
            if (c.parent) {
                categoryName = c.parent.name
                subCategory = c.name
            } else {
                categoryName = c.name
                subCategory = data.subCategory
            }
        }
    }

    const item = await prisma.menuItem.update({
        where: { id },
        data: {
            ...data,
            category: categoryName,
            price: data.price ? parseFloat(data.price) : undefined,
            subCategory: subCategory !== undefined ? subCategory : undefined
        },
    })

    revalidatePath(`/admin/e/[slug]`, "page")
    return item
}

export async function deleteMenuItem(id: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.menuItem.delete({
        where: { id },
    })

    revalidatePath(`/admin/e/[slug]`, "page")
}

export async function deleteAllMenuItems(eventId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.$transaction([
        prisma.bundleLine.deleteMany({ where: { bundle: { eventId } } }),
        prisma.bundle.deleteMany({ where: { eventId } }),
        prisma.menuItemOption.deleteMany({ where: { item: { eventId } } }),
        prisma.menuItemImage.deleteMany({ where: { item: { eventId } } }),
        prisma.menuItem.deleteMany({ where: { eventId } }),
        prisma.category.deleteMany({ where: { eventId } }),
    ])

    revalidatePath(`/admin/e/[slug]`, "page")
}

export async function deleteCategory(eventId: string, categoryName: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.$transaction(async (tx) => {
        // Delete all items in this category or subcategory
        await tx.menuItem.deleteMany({
            where: {
                eventId,
                OR: [
                    { category: categoryName },
                    { subCategory: categoryName }
                ]
            }
        })

        // Also delete the category record if it exists
        await tx.category.deleteMany({
            where: {
                eventId,
                name: categoryName
            }
        })
    })

    revalidatePath(`/admin/e/[slug]`, "page")
}
