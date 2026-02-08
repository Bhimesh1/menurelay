"use server"

import { PDFParse } from "pdf-parse"
import { auth } from "@/auth"

export async function extractTextFromPDF(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const file = formData.get("file") as File
    if (!file) throw new Error("No file uploaded")

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const parser = new PDFParse({ data: buffer })
    try {
        const result = await parser.getText()
        console.log(`Successfully extracted ${result.total} pages from PDF`)
        return result.text
    } catch (error) {
        console.error("PDF Parsing failed:", error)
        throw new Error(`PDF Parsing failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
        await parser.destroy()
    }
}
