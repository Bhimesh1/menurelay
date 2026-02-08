"use server"

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signUpSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function signUp(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const validated = signUpSchema.safeParse({ email, password })

    if (!validated.success) {
        return { error: validated.error.issues[0].message }
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    })

    if (existingUser) {
        return { error: "User already exists" }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    try {
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
            },
        })

        return { success: true }
    } catch (error) {
        return { error: "Failed to create user" }
    }
}
