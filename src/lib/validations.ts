import { z } from "zod"

export const eventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    restaurantName: z.string().optional().nullable(),
    pdfHeaderTitle: z.string().min(1, "Header title is required").default("New Party Order"),
    pdfAddress: z.string().optional().nullable(),
    pdfReportTitle: z.string().min(1, "Report title is required").default("MASTER ORDER SUMMARY"),
    pdfRestaurantLabel: z.string().min(1, "Restaurant label is required").default("Restaurant"),
    pdfSectionTitle: z.string().min(1, "Section title is required").default("DETAILED ORDERS"),
    showPrices: z.boolean().default(true),
    spiceScale: z.enum(["GERMAN", "INDIAN"]).default("GERMAN"),
    status: z.enum(["DRAFT", "PUBLISHED", "LOCKED"]).default("DRAFT"),
    vipName: z.string().optional().nullable(),
    vipMessage: z.string().optional().nullable(),
})

export const menuItemOptionSchema = z.object({
    label: z.string(),
    metaQty: z.string().optional().nullable(),
    price: z.number(),
})

export const jsonMenuItemSchema = z.object({
    code: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    categoryId: z.string(),
    subCategory: z.string().optional().nullable(),
    price: z.number().optional().nullable(),
    diet: z.object({
        veg: z.boolean().default(false),
        vegan: z.boolean().default(false),
    }).optional().nullable(),
    images: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    options: z.array(menuItemOptionSchema).default([]),
})

export const jsonBundleLineSchema = z.object({
    label: z.string(),
    note: z.string().optional().nullable(),
    qty: z.number().default(1),
})

export const jsonBundleSchema = z.object({
    code: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    price: z.number(),
    images: z.array(z.string()).default([]),
    lines: z.array(z.string()).default([]),
})

export const jsonCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    sort: z.number().default(0),
    type: z.enum(["FOOD", "DRINK"]).default("FOOD"),
})

export const menuJsonSchema = z.object({
    restaurant: z.string().optional().nullable(),
    sourcePdf: z.string().optional().nullable(),
    currency: z.string().default("EUR"),
    categories: z.array(jsonCategorySchema).default([]),
    items: z.array(jsonMenuItemSchema).default([]),
    bundles: z.array(jsonBundleSchema).default([]),
})

export const orderItemSchema = z.object({
    menuItemId: z.string().optional(),
    bundleId: z.string().optional().nullable(),
    kind: z.enum(["ITEM", "BUNDLE"]).default("ITEM"),
    codeSnapshot: z.string(),
    nameSnapshot: z.string(),
    qty: z.number().int().min(1),
    optionLabel: z.string().optional(),
    optionPrice: z.number().optional(),
    priceSnapshot: z.number().default(0),
    spiceLevel: z.number().int().min(0).max(4),
    spiceScale: z.enum(["GERMAN", "INDIAN"]),
    note: z.string().optional(),
})

export const guestOrderSchema = z.object({
    guestName: z.string().min(1, "Name is required"),
    notes: z.string().optional(),
    items: z.array(orderItemSchema).min(1, "Select at least one item"),
})
