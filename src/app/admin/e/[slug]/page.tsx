import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsTab } from "@/components/admin/settings-tab"
import { MenuTab } from "@/components/admin/menu-tab"
import { OrdersTab } from "@/components/admin/orders-tab"
import { Utensils, Settings, ClipboardList, ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function EventAdminPage({ params }: { params: { slug: string } }) {
    const session = await auth()
    const { slug } = await params

    const event = await prisma.event.findUnique({
        where: { slug },
        include: {
            menuItems: {
                orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
            },
            categories: {
                orderBy: { sort: "asc" },
                include: { items: true }
            },
            bundles: {
                include: { lines: true }
            },
            guestOrders: {
                include: {
                    items: {
                        include: {
                            menuItem: true,
                            bundle: true
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            },
        },
    })

    if (!event || event.userId !== session?.user?.id) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-[#fcfcfd]">
            <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <Link href="/admin">
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="h-10 w-[1px] bg-slate-100 hidden sm:block" />
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">{event.title}</h1>
                                <Badge variant={
                                    event.status === "PUBLISHED" ? "default" :
                                        event.status === "LOCKED" ? "destructive" : "secondary"
                                } className={`capitalize font-black text-[9px] tracking-widest px-2.5 h-5 border-none ${event.status === "PUBLISHED" ? "bg-emerald-500 shadow-lg shadow-emerald-100" :
                                    event.status === "LOCKED" ? "bg-rose-500 shadow-lg shadow-rose-100" :
                                        "bg-slate-200 text-slate-600"
                                    }`}>
                                    {event.status.toLowerCase()}
                                </Badge>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Utensils className="h-3 w-3 text-indigo-400" />
                                {event.restaurantName || "No restaurant set"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={`/e/${event.slug}`} target="_blank">
                            <Button variant="outline" className="border-slate-200 h-10 px-5 font-bold gap-2 text-indigo-600 hover:bg-slate-50 transition-all active:scale-95 rounded-xl shadow-sm">
                                <ExternalLink className="h-4 w-4" />
                                Live Menu
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <Tabs defaultValue="orders" className="space-y-10">
                    <div className="flex justify-center sm:justify-start">
                        <TabsList className="bg-slate-100/50 p-1.5 h-14 rounded-2xl ring-1 ring-slate-200/50">
                            <TabsTrigger value="orders" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest border-none transition-all gap-2">
                                <ClipboardList className="h-4 w-4" />
                                Orders
                            </TabsTrigger>
                            <TabsTrigger value="menu" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest border-none transition-all gap-2">
                                <Utensils className="h-4 w-4" />
                                Menu
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest border-none transition-all gap-2">
                                <Settings className="h-4 w-4" />
                                Settings
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="orders" className="mt-0 outline-none">
                        <OrdersTab event={event} orders={event.guestOrders} />
                    </TabsContent>
                    <TabsContent value="menu" className="mt-0 outline-none">
                        <MenuTab eventId={event.id} initialItems={event.menuItems} initialMenuJson={event.menuJson} />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-0 outline-none">
                        <SettingsTab event={event} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
