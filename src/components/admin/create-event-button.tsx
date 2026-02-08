"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { createEvent } from "@/app/actions/events"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function CreateEventButton() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleCreate = async () => {
        setIsLoading(true)
        const formData = new FormData()
        formData.append("title", "New Party Order")

        try {
            const event = await createEvent(formData)
            toast.success("Event created!")
            router.push(`/admin/e/${event.slug}`)
        } catch (error) {
            toast.error("Failed to create event")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            onClick={handleCreate}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 h-11 px-6 font-semibold gap-2"
        >
            <PlusCircle className="h-5 w-5" />
            {isLoading ? "Creating..." : "Create Event"}
        </Button>
    )
}
