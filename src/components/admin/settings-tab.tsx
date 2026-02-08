"use client"

import { useState } from "react"
import { updateEventStatus, updateEventSettings, deleteEvent } from "@/app/actions/events"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Copy, Check, Globe, Lock, Trash2, Settings, Utensils, FileText, Gift, PartyPopper } from "lucide-react"
import { useRouter } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"

export function SettingsTab({ event }: { event: any }) {
    const [copied, setCopied] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        title: event.title,
        restaurantName: event.restaurantName || "",
        showPrices: event.showPrices,
        spiceScale: event.spiceScale,
        pdfHeaderTitle: (event as any).pdfHeaderTitle || "New Party Order",
        pdfAddress: (event as any).pdfAddress || "",
        pdfReportTitle: (event as any).pdfReportTitle || "MASTER ORDER SUMMARY",
        pdfRestaurantLabel: (event as any).pdfRestaurantLabel || "Restaurant",
        pdfSectionTitle: (event as any).pdfSectionTitle || "DETAILED ORDERS",
        vipName: event.vipName || "",
        vipMessage: event.vipMessage || ""
    })
    const router = useRouter()

    const guestUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateEventSettings(event.id, formData as any)
            toast.success("Settings saved")
        } catch (error) {
            toast.error("Failed to save settings")
        } finally {
            setIsSaving(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(guestUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success("Guest link copied to clipboard")
    }

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
            setIsDeleting(true)
            try {
                await deleteEvent(event.id)
                router.push("/admin")
                toast.success("Event deleted")
            } catch (error) {
                toast.error("Failed to delete event")
            } finally {
                setIsDeleting(false)
            }
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
            {/* 🔗 GUEST LINK SECTION */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50 overflow-hidden rounded-3xl bg-white">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900">Guest Invitation Link</CardTitle>
                            <CardDescription className="text-sm font-medium text-slate-400">Guests use this link to access your menu and place orders.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                    <div className="flex gap-3 p-2 bg-slate-50 border border-slate-100 rounded-[1.25rem]">
                        <div className="relative flex-1">
                            <Input
                                value={guestUrl}
                                readOnly
                                className="h-12 border-none bg-transparent pl-4 font-black text-indigo-600 focus-visible:ring-0 shadow-none text-sm"
                            />
                        </div>
                        <Button
                            onClick={copyToClipboard}
                            className={`h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${copied ? "bg-emerald-500 shadow-emerald-100" : "bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700"
                                }`}
                        >
                            {copied ? (
                                <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Copied</span>
                            ) : (
                                <span className="flex items-center gap-2"><Copy className="h-4 w-4" /> Copy Link</span>
                            )}
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 px-8 py-5 border-t border-slate-100 flex flex-wrap gap-3">
                    {event.status !== "PUBLISHED" && (
                        <Button
                            onClick={() => updateEventStatus(event.id, "PUBLISHED")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest h-10 px-6 rounded-xl shadow-lg shadow-emerald-50 transition-all active:scale-95"
                        >
                            Go Live Now
                        </Button>
                    )}
                    {event.status === "PUBLISHED" && (
                        <Button
                            onClick={() => updateEventStatus(event.id, "LOCKED")}
                            variant="outline"
                            className="border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-100 font-black text-[11px] uppercase tracking-widest h-10 px-6 rounded-xl transition-all active:scale-95 gap-2"
                        >
                            <Lock className="h-3.5 w-3.5" />
                            Lock Orders
                        </Button>
                    )}
                    {event.status !== "DRAFT" && (
                        <Button
                            onClick={() => updateEventStatus(event.id, "DRAFT")}
                            variant="ghost"
                            className="text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase tracking-widest h-10 px-6 rounded-xl transition-all"
                        >
                            Back to Draft
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {/* 🛠️ CORE SETTINGS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm ring-1 ring-slate-200/50 rounded-3xl bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-orange-50 flex items-center justify-center">
                                <Settings className="h-4 w-4 text-orange-600" />
                            </div>
                            <CardTitle className="text-lg font-black text-slate-900">General</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Display Title</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="h-11 rounded-xl border-slate-200 font-bold focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Restaurant Name</Label>
                            <Input
                                value={formData.restaurantName}
                                onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                                className="h-11 rounded-xl border-slate-200 font-bold focus:ring-indigo-500"
                                placeholder="Optional"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm ring-1 ring-slate-200/50 rounded-3xl bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Utensils className="h-4 w-4 text-purple-600" />
                            </div>
                            <CardTitle className="text-lg font-black text-slate-900">Experience</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Show Prices</Label>
                                <p className="text-[10px] text-slate-400 font-bold">Visibility on guest menu</p>
                            </div>
                            <Switch
                                checked={formData.showPrices}
                                onCheckedChange={(checked) => setFormData({ ...formData, showPrices: checked })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Spice Scale Preferences</Label>
                            <Select
                                value={formData.spiceScale}
                                onValueChange={(val: any) => setFormData({ ...formData, spiceScale: val })}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-slate-200 font-bold">
                                    <SelectValue placeholder="Select scale" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                    <SelectItem value="GERMAN" className="font-bold py-3">German Scale</SelectItem>
                                    <SelectItem value="INDIAN" className="font-bold py-3">Indian Scale</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 🎂 CELEBRATION SETTINGS SECTION */}
            <Card className="border-none shadow-sm ring-1 ring-slate-200/50 rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-pink-50 flex items-center justify-center">
                            <PartyPopper className="h-5 w-5 text-pink-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900">Celebration & Surprises</CardTitle>
                            <CardDescription className="text-sm font-medium text-slate-400">Personalize the experience for the guest of honor.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Celebration Name (VIP)</Label>
                            <div className="relative">
                                <Gift className="absolute left-4 top-3.5 h-4 w-4 text-pink-300" />
                                <Input
                                    value={formData.vipName}
                                    onChange={(e) => setFormData({ ...formData, vipName: e.target.value })}
                                    className="h-11 border-slate-200 rounded-xl shadow-sm font-bold focus:ring-pink-500 pl-11 text-slate-900"
                                    placeholder="e.g. Alex"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold px-1 italic">When this name is entered during checkout, the celebration triggers! ✨</p>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Special Message</Label>
                            <Textarea
                                value={formData.vipMessage}
                                onChange={(e) => setFormData({ ...formData, vipMessage: e.target.value })}
                                className="min-h-[100px] border-slate-200 rounded-2xl shadow-sm font-medium focus:ring-pink-500 text-slate-700 bg-slate-50/50"
                                placeholder="Happy Birthday Alex! You're the best! 🎂🥳"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 📝 PDF CUSTOMIZATION SECTION */}
            <Card className="border-none shadow-sm ring-1 ring-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="p-10 pb-6 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black text-slate-900">PDF Report Brand</CardTitle>
                            <CardDescription className="text-sm font-medium text-slate-400">Configure how specifically your generated PDF reports look.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Main Header Title (Top Left)</Label>
                            <Input
                                value={formData.pdfHeaderTitle}
                                onChange={(e) => setFormData({ ...formData, pdfHeaderTitle: e.target.value })}
                                className="h-12 border-slate-200 rounded-2xl shadow-sm font-black focus:ring-indigo-600 text-slate-900"
                                placeholder="e.g. New Party Order"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sub-Title / Document Name</Label>
                            <Input
                                value={formData.pdfReportTitle}
                                onChange={(e) => setFormData({ ...formData, pdfReportTitle: e.target.value })}
                                className="h-12 border-slate-200 rounded-2xl shadow-sm font-black focus:ring-indigo-600 text-slate-900"
                                placeholder="e.g. MASTER ORDER SUMMARY"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Business Address (Shown in Header)</Label>
                        <Input
                            value={formData.pdfAddress}
                            onChange={(e) => setFormData({ ...formData, pdfAddress: e.target.value })}
                            className="h-12 border-slate-200 rounded-2xl shadow-sm font-bold focus:ring-indigo-600 text-slate-900"
                            placeholder="e.g. 123 Gourmet Way, Stuttgart, Germany"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Restaurant Label</Label>
                            <Input
                                value={formData.pdfRestaurantLabel}
                                onChange={(e) => setFormData({ ...formData, pdfRestaurantLabel: e.target.value })}
                                className="h-12 border-slate-200 rounded-2xl shadow-sm font-bold focus:ring-indigo-600 text-slate-900"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sections Heading</Label>
                            <Input
                                value={formData.pdfSectionTitle}
                                onChange={(e) => setFormData({ ...formData, pdfSectionTitle: e.target.value })}
                                className="h-12 border-slate-200 rounded-2xl shadow-sm font-bold focus:ring-indigo-600 text-slate-900"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 p-10 py-6 border-t border-slate-100 flex justify-between items-center">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-14 px-10 rounded-[1.25rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[12px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? "Saving System..." : "Apply All Changes"}
                    </Button>
                    <Button
                        variant="ghost"
                        className="h-12 px-6 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black text-[11px] uppercase tracking-widest flex items-center gap-2"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Permanently
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
