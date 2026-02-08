"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, FileText, Download, AlertCircle, Utensils, IndianRupee, Euro, Layers, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SPICE_LEVELS } from "@/lib/utils"
import { format } from "date-fns"
import { useState } from "react"
import { deleteGuestOrder } from "@/app/actions/orders"
import { toast } from "sonner"

import { PDFDownloadButton } from "./pdf-download-button"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export function OrdersTab({ event, orders }: { event: any, orders: any[] }) {
    const spiceScale = event.spiceScale as "GERMAN" | "INDIAN"
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (id: string, guestName: string) => {
        if (!confirm(`Are you sure you want to delete ${guestName}'s order?`)) return

        setDeletingId(id)
        try {
            await deleteGuestOrder(id, event.slug)
            toast.success(`Deleted ${guestName}'s order`)
        } catch (error) {
            toast.error("Failed to delete order")
        } finally {
            setDeletingId(null)
        }
    }

    // Helper to get the most accurate price for an item
    const getPrice = (item: any) => {
        if (item.priceSnapshot && item.priceSnapshot > 0) return item.priceSnapshot
        if (item.optionPrice && item.optionPrice > 0) return item.optionPrice
        return item.menuItem?.price || item.bundle?.price || 0
    }

    interface TotalItem {
        code: string;
        name: string;
        optionLabel?: string | null;
        kind: string;
        qty: number;
        notes: { guest: string; note?: string | null; spice: number }[];
    }

    // Calculate totals by menu item and option
    const itemTotals = orders.reduce((acc: Record<string, TotalItem>, order: any) => {
        order.items.forEach((item: any) => {
            const key = `${item.codeSnapshot} -${item.optionLabel || 'base'}`
            const existing = acc[key]

            if (existing) {
                existing.qty += item.qty
                if (item.note || item.spiceLevel > 0) {
                    existing.notes.push({ guest: order.guestName, note: item.note, spice: item.spiceLevel })
                }
            } else {
                acc[key] = {
                    code: item.codeSnapshot,
                    name: item.nameSnapshot,
                    optionLabel: item.optionLabel,
                    kind: item.kind,
                    qty: item.qty,
                    notes: (item.note || item.spiceLevel > 0) ? [{ guest: order.guestName, note: item.note, spice: item.spiceLevel }] : []
                }
            }
        })
        return acc
    }, {} as Record<string, TotalItem>)

    const sortedTotals = Object.values(itemTotals).sort((a: TotalItem, b: TotalItem) => a.code.localeCompare(b.code))

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 📥 EXPORT & SUMMARY ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm ring-1 ring-slate-200/50">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-none mb-1.5">Fulfillment Dashboard</h2>
                    <p className="text-sm font-medium text-slate-400">Total Orders: <span className="text-indigo-600 font-bold">{orders.length}</span> • Everything synced & ready.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-slate-200 h-12 px-6 rounded-xl font-bold gap-2 text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 shadow-sm">
                                <Utensils className="h-4 w-4" />
                                View Kitchen Summary
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-slate-50">
                            <DialogHeader className="p-8 pb-0">
                                <DialogTitle className="text-2xl font-black text-slate-900">Kitchen Master List</DialogTitle>
                                <DialogDescription className="text-slate-400 font-medium">Consolidated totals and guest preferences for all orders.</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="p-8 pt-6 h-full max-h-[calc(90vh-120px)]">
                                <div className="space-y-10 pb-10">
                                    {/* Consolidated List Inside Dialog */}
                                    <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow className="border-slate-100/50">
                                                    <TableHead className="w-24 font-black text-slate-400 uppercase tracking-widest text-[9px] pl-8 h-12">Code</TableHead>
                                                    <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Item</TableHead>
                                                    <TableHead className="w-24 text-center font-black text-slate-400 uppercase tracking-widest text-[9px] pr-8">Qty</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedTotals.map((item, idx) => (
                                                    <TableRow key={idx} className="border-slate-50">
                                                        <TableCell className="pl-8">
                                                            <Badge className="bg-slate-100 text-slate-600 border-none font-black px-2.5 h-7 rounded-lg">
                                                                {item.code}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                                                                {item.optionLabel && (
                                                                    <Badge variant="outline" className="text-[9px] font-black uppercase text-indigo-500 border-indigo-100 bg-indigo-50/30">
                                                                        {item.optionLabel}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center pr-8">
                                                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-600 text-white font-black text-sm">
                                                                {item.qty}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </section>

                                    {/* Special Notes Inside Dialog */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 ml-1">
                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Special Preferences</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {sortedTotals.filter(i => i.notes.length > 0).map((item, idx) => (
                                                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2">
                                                        <span>{item.code}</span>
                                                        <span className="text-slate-900">{item.name}</span>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {item.notes.map((note, nIdx) => (
                                                            <div key={nIdx} className="text-[11px] leading-relaxed">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="font-bold text-slate-500">{note.guest}</span>
                                                                    {note.spice > 0 && <span className="text-rose-500 font-bold uppercase text-[8px] tracking-tighter">{(SPICE_LEVELS[spiceScale] as any)[note.spice]}</span>}
                                                                </div>
                                                                {note.note && <p className="text-slate-400 italic font-medium pl-2 border-l border-amber-200">"{note.note}"</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <PDFDownloadButton event={event} totals={sortedTotals} orders={orders} />
                </div>
            </div>

            <div className="space-y-8">
                {/* 👥 GUEST ORDERS (FULL WIDTH) */}
                <div className="flex justify-between items-end px-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight italic underline decoration-indigo-100 decoration-8 underline-offset-8">Live Guest Feed</h3>
                    </div>
                    {orders.length > 0 && (
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Aggregated Revenue</p>
                            <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                                {orders.reduce((sum: number, order: any) =>
                                    sum + order.items.reduce((s: number, item: any) => s + (getPrice(item) * item.qty), 0)
                                    , 0).toFixed(2)}<span className="text-xl ml-0.5 font-black text-emerald-400">€</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {orders.length === 0 ? (
                        <div className="col-span-full text-center py-32 px-8 bg-white rounded-[3rem] ring-1 ring-slate-200/50 shadow-sm border border-dashed border-slate-200 transition-all hover:bg-slate-50/50">
                            <Users className="mx-auto h-16 w-16 text-slate-200 mb-6 animate-pulse" />
                            <h4 className="text-xl font-black text-slate-900 mb-2">Awaiting First Guest...</h4>
                            <p className="text-slate-400 font-medium max-w-xs mx-auto">Share your menu link with guests to start receiving live orders here.</p>
                        </div>
                    ) : (
                        orders.map((order: any) => {
                            const orderTotal = order.items.reduce((s: number, item: any) => s + (getPrice(item) * item.qty), 0)
                            return (
                                <Card key={order.id} className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] ring-1 ring-slate-200/50 hover:ring-indigo-200 transition-all rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-xl hover:-translate-y-1 duration-300">
                                    <CardHeader className="p-8 pb-5 bg-slate-50/40 group-hover:bg-indigo-50/30 transition-colors relative">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <CardTitle className="text-2xl font-black text-slate-900 leading-none italic decoration-indigo-200 decoration-4 underline-offset-4 group-hover:underline transition-all">{order.guestName}</CardTitle>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/80 px-3 py-1 rounded-full border border-slate-100/50 shadow-sm">{order.items.length} items</span>
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/30 shadow-sm">
                                                        {format(new Date(order.createdAt), "h:mm a")}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-3">
                                                <span className="font-black text-emerald-600 text-2xl tracking-tighter">{orderTotal.toFixed(2)}€</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(order.id, order.guestName)}
                                                    disabled={deletingId === order.id}
                                                    className="h-10 w-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm hover:shadow-rose-100"
                                                >
                                                    <Trash2 className={`h-5 w-5 ${deletingId === order.id ? "animate-pulse" : ""}`} />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-6 space-y-6">
                                        <ul className="space-y-4">
                                            {order.items.map((item: any, iIdx: number) => (
                                                <li key={iIdx} className="group/item">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex gap-4">
                                                            <div className="flex flex-col items-center pt-1">
                                                                <span className="text-indigo-600 font-black text-lg leading-none">{item.qty}x</span>
                                                                <div className="w-[1.5px] h-full bg-slate-50 group-last/item:hidden mt-2" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-black text-slate-800 text-sm">{item.nameSnapshot}</p>
                                                                    {item.kind === "BUNDLE" && <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[7px] h-3.5 uppercase px-1.5">SET</Badge>}
                                                                </div>
                                                                {item.optionLabel && (
                                                                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest block">{item.optionLabel}</span>
                                                                )}
                                                                {item.spiceLevel > 0 && (
                                                                    <span className="text-[8px] font-black uppercase text-rose-400 tracking-tighter mt-1 block">
                                                                        🔥 {(SPICE_LEVELS[spiceScale] as any)[item.spiceLevel]}
                                                                    </span>
                                                                )}
                                                                {item.note && (
                                                                    <p className="text-[10px] text-amber-500 font-bold italic mt-1 pl-2 border-l border-amber-100">"{item.note}"</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-slate-300 text-[11px] whitespace-nowrap pt-1">
                                                            {(getPrice(item) * item.qty).toFixed(2)}€
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                        {order.notes && (
                                            <div className="bg-amber-50/30 p-5 rounded-[1.5rem] border border-amber-100/50 relative overflow-hidden group/shared-note">
                                                <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-400 opacity-20" />
                                                <div className="flex items-center gap-2 text-amber-500/80 mb-2">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest underline decoration-amber-200 underline-offset-4">General Guest Note</span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 font-bold leading-relaxed italic">"{order.notes}"</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

