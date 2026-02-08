"use client"

import { useState, useRef, useEffect } from "react"
import { MenuItem } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Edit2, Search, Utensils, Coffee, FileUp, Leaf, ShieldAlert, CheckCircle, Save, Download, XCircle, AlertCircle, RotateCcw } from "lucide-react"
import { deleteMenuItem, deleteAllMenuItems, addMenuItem, updateMenuItem, importMenuFromJson, getMenuJson } from "@/app/actions/menu"
import { extractTextFromPDF } from "@/app/actions/pdf"
import { menuJsonSchema } from "@/lib/validations"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface MenuTabProps {
    eventId: string
    initialItems: MenuItem[]
    initialMenuJson: any
}

export function MenuTab({ eventId, initialItems, initialMenuJson }: MenuTabProps) {
    const [items, setItems] = useState<MenuItem[]>(initialItems)
    const [importText, setImportText] = useState("")
    const [isImporting, setIsImporting] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [deletePass, setDeletePass] = useState("")
    const [isDeletingAll, setIsDeletingAll] = useState(false)
    const [bulkMode, setBulkMode] = useState<"text" | "json">("text")
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
    const [validationErrors, setValidationErrors] = useState<any[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const jsonInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    useEffect(() => {
        setItems(initialItems)
    }, [initialItems])

    // Manual item form state
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        category: "General",
        price: "",
        description: "",
        isVeg: false,
        isVegan: false,
        isDrink: false
    })

    const handleAddOrUpdate = async () => {
        try {
            if (editingItem?.id) {
                await updateMenuItem(editingItem.id, formData)
                toast.success("Item updated")
            } else {
                await addMenuItem(eventId, formData)
                toast.success("Item added")
            }
            setIsAddOpen(false)
            setEditingItem(null)
            router.refresh()
        } catch (error) {
            toast.error("Failed to save item")
        }
    }

    const startEdit = (item: MenuItem) => {
        setEditingItem(item)
        setFormData({
            code: item.code,
            name: item.name,
            category: item.category,
            price: item.price?.toString() || "",
            description: item.description || "",
            isVeg: item.isVeg,
            isVegan: item.isVegan,
            isDrink: item.isDrink
        })
        setIsAddOpen(true)
    }

    const handleDeleteAll = async () => {
        if (deletePass !== "DELETE") {
            toast.error("Invalid confirmation text")
            return
        }
        setIsDeletingAll(true)
        try {
            await deleteAllMenuItems(eventId)
            setItems([])
            toast.success("All items, categories and bundles deleted")
            setDeletePass("")
        } catch (error) {
            toast.error("Failed to delete everything")
        } finally {
            setIsDeletingAll(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const text = await extractTextFromPDF(formData)
            setImportText(text)
            setBulkMode("text")
            toast.success("Text extracted from PDF! Review and click Import.")
        } catch (error) {
            toast.error("Failed to extract text from PDF")
        } finally {
            setIsImporting(false)
        }
    }

    const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            if (event.target?.result) {
                setImportText(event.target.result as string)
                setBulkMode("json")
                toast.success("JSON loaded from file!")
            }
        }
        reader.readAsText(file)
    }

    const validateJson = () => {
        setValidationErrors([])
        try {
            const parsed = JSON.parse(importText)
            const result = menuJsonSchema.safeParse(parsed)
            if (!result.success) {
                setValidationErrors(result.error.issues)
                toast.error("Schema validation failed")
                return false
            }
            toast.success("JSON is valid!")
            return parsed
        } catch (e: any) {
            setValidationErrors([{ path: ["json"], message: e.message }])
            toast.error("JSON parse failed")
            return false
        }
    }

    const handleImport = async () => {
        if (!importText.trim()) return
        setIsImporting(true)
        setValidationErrors([])

        try {
            if (bulkMode === "json") {
                const parsed = JSON.parse(importText)
                const res = await importMenuFromJson(eventId, parsed)

                if (res.errorType === "SCHEMA") {
                    setValidationErrors(res.issues)
                    toast.error("Validation failed during import")
                } else if (res.errorType) {
                    toast.error(res.message || "Import failed")
                } else {
                    toast.success("Menu imported and normalized successfully!")
                    setIsBulkImportOpen(false)
                    router.refresh()
                }
            } else {
                // Convert text to JSON format
                const items = importText.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map(line => {
                        const parts = line.split('\t');
                        if (parts.length < 2) return null;
                        return {
                            code: parts[0].trim(),
                            name: parts[1].trim(),
                            price: parts[2] ? parseFloat(parts[2].replace(/[^\d.]/g, '')) : 0,
                            category: parts[3] || "General"
                        };
                    })
                    .filter(Boolean);

                if (items.length === 0) {
                    toast.error("No valid items found in text (Expected: Code [Tab] Name [Tab] Price)");
                    return;
                }

                // Group by category to create categories list
                const categoryNames = Array.from(new Set(items.map(i => i!.category)));
                const categories = categoryNames.map((name, i) => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    sort: i,
                    type: "FOOD"
                }));

                const formattedJson = {
                    restaurant: "Imported Menu",
                    categories,
                    items: items.map(item => ({
                        code: item!.code,
                        name: item!.name,
                        price: item!.price,
                        categoryId: item!.category.toLowerCase().replace(/\s+/g, '-'),
                        description: "",
                        diet: { veg: false, vegan: false },
                        options: [],
                        images: []
                    })),
                    bundles: []
                };

                const res = await importMenuFromJson(eventId, formattedJson);
                if (res.errorType) {
                    toast.error(res.message || "Import failed");
                } else {
                    toast.success(`Successfully imported ${items.length} items via JSON conversion`);
                    setIsBulkImportOpen(false);
                    router.refresh();
                }
            }
        } catch (error: any) {
            toast.error(error.message || "Import failed")
        } finally {
            setIsImporting(false)
        }
    }

    const loadSavedJson = async () => {
        setIsImporting(true)
        try {
            const json = await getMenuJson(eventId)
            if (json) {
                setImportText(JSON.stringify(json, null, 2))
                setBulkMode("json")
                toast.success("Loaded saved JSON")
            } else {
                toast.info("No saved JSON found")
            }
        } catch (error) {
            toast.error("Failed to load saved JSON")
        } finally {
            setIsImporting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("Delete this item?")) {
            await deleteMenuItem(id)
            setItems(items.filter(i => i.id !== id))
            toast.success("Item deleted")
        }
    }

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white p-6 rounded-3xl shadow-sm ring-1 ring-slate-200">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Search by name, code or category..."
                        className="pl-12 h-12 bg-slate-50 border-none rounded-2xl focus:bg-white transition-all shadow-inner font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold gap-2 h-12 px-6 rounded-2xl active:scale-95 transition-all">
                                <Trash2 className="h-4 w-4" />
                                Wipe Data
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2.5rem]">
                            <DialogHeader className="p-10 pb-4">
                                <DialogTitle className="text-2xl font-black flex items-center gap-2 text-red-600">
                                    <ShieldAlert className="h-6 w-6" />
                                    Danger Zone
                                </DialogTitle>
                                <DialogDescription className="font-bold text-slate-500 pt-2">
                                    This will permanently remove ALL categories, items, options, and bundles for this event.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="px-10 py-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-black text-[10px] uppercase tracking-[0.1em] text-slate-400 px-1">
                                        Type <span className="text-red-600">DELETE</span> to confirm
                                    </Label>
                                    <Input
                                        value={deletePass}
                                        onChange={(e) => setDeletePass(e.target.value)}
                                        placeholder="DELETE"
                                        className="h-14 bg-slate-100 border-none rounded-2xl font-black text-red-600 focus:bg-white transition-all shadow-inner px-5"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="bg-slate-50 p-10 flex flex-col sm:flex-row gap-4 border-t rounded-b-[2.5rem]">
                                <Button variant="ghost" className="font-bold text-slate-400 h-14" onClick={() => setIsBulkImportOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={handleDeleteAll}
                                    disabled={isDeletingAll || deletePass !== "DELETE"}
                                    className="bg-red-600 hover:bg-red-700 text-white font-black flex-1 rounded-2xl h-14 shadow-lg shadow-red-100"
                                >
                                    {isDeletingAll ? "Wiping..." : "Confirm Wipe Strategy"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-12 border-slate-200 font-bold gap-2 rounded-2xl px-6 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
                                <FileUp className="h-4 w-4" />
                                Bulk Import
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-4xl bg-white border-none shadow-2xl overflow-hidden flex flex-col h-[90vh] rounded-[2.5rem] p-0">
                            <DialogHeader className="p-10 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <DialogTitle className="text-3xl font-black text-slate-900 leading-tight">Advanced Menu Editor</DialogTitle>
                                        <DialogDescription className="font-bold text-slate-400 text-lg pt-2">
                                            Import normalized menu structure.
                                        </DialogDescription>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-2xl ring-1 ring-slate-200 shadow-inner">
                                        <button
                                            onClick={() => setBulkMode("text")}
                                            className={cn(
                                                "text-[10px] font-black px-4 py-2 rounded-xl transition-all duration-300",
                                                bulkMode === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                                            )}
                                        >
                                            TEXT LINES
                                        </button>
                                        <button
                                            onClick={() => setBulkMode("json")}
                                            className={cn(
                                                "text-[10px] font-black px-4 py-2 rounded-xl transition-all duration-300",
                                                bulkMode === "json" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                                            )}
                                        >
                                            JSON FLOW
                                        </button>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="px-10 pb-6 space-y-6 overflow-y-auto flex-1 no-scrollbar">
                                {bulkMode === "json" && (
                                    <div className="flex flex-wrap gap-2">
                                        <Button onClick={() => jsonInputRef.current?.click()} variant="outline" size="sm" className="rounded-xl font-black text-[10px] h-9 gap-2">
                                            <FileUp className="h-3 w-3" /> UPLOAD JSON
                                        </Button>
                                        <input
                                            type="file" ref={jsonInputRef} className="hidden" accept=".json"
                                            onChange={handleJsonUpload}
                                        />
                                        <Button onClick={validateJson} variant="outline" size="sm" className="rounded-xl font-black text-[10px] h-9 gap-2">
                                            <CheckCircle className="h-3 w-3" /> VALIDATE JSON
                                        </Button>
                                        <Button onClick={loadSavedJson} variant="outline" size="sm" className="rounded-xl font-black text-[10px] h-9 gap-2">
                                            <RotateCcw className="h-3 w-3" /> LOAD SAVED
                                        </Button>
                                        <Button onClick={() => setImportText("")} variant="outline" size="sm" className="rounded-xl font-black text-[10px] h-9 gap-2 border-red-100 text-red-500 hover:bg-red-50">
                                            <Trash2 className="h-3 w-3" /> CLEAR
                                        </Button>
                                    </div>
                                )}

                                {bulkMode === "text" && (
                                    <div className="flex flex-col sm:flex-row justify-between items-center bg-indigo-50/50 p-8 rounded-3xl border-2 border-dashed border-indigo-100 gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-indigo-50">
                                                <FileUp className="h-8 w-8 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-xl">Upload PDF Menu</p>
                                                <p className="text-[10px] text-indigo-500 uppercase font-black tracking-widest">Auto-extract items from PDF</p>
                                            </div>
                                        </div>
                                        <Button
                                            className="bg-white hover:bg-white/80 text-indigo-600 font-black h-14 border-indigo-100 rounded-2xl px-8 ring-1 ring-indigo-100 shadow-sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isImporting}
                                        >
                                            {isImporting ? "Processing..." : "Select PDF File"}
                                        </Button>
                                        <input
                                            type="file" ref={fileInputRef} className="hidden" accept=".pdf"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                )}

                                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                        {bulkMode === "text" ? "Paste Menu Text" : "Paste Menu JSON Source"}
                                    </Label>
                                    <Textarea
                                        placeholder={bulkMode === "text" ? "Example:&#10;101. Butter Chicken 14.50&#10;102. Naan 2,50" : "Paste full menu JSON here..."}
                                        className="flex-1 min-h-[400px] font-mono text-[11px] border-none bg-slate-100 rounded-[2rem] p-8 focus:bg-white transition-all shadow-inner outline-none resize-none no-scrollbar"
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                    />
                                </div>

                                {validationErrors.length > 0 && (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 space-y-3">
                                        <h4 className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest">
                                            <AlertCircle className="h-4 w-4" />
                                            Validation Errors
                                        </h4>
                                        <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                                            {validationErrors.map((err, idx) => (
                                                <div key={idx} className="text-[10px] font-bold text-red-500 flex gap-2">
                                                    <span className="bg-red-100 px-1.5 py-0.5 rounded text-red-700 font-mono">
                                                        {err.path.join(".")}
                                                    </span>
                                                    {err.message}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="bg-slate-50 p-10 flex flex-col sm:flex-row gap-4 border-t rounded-b-[2.5rem]">
                                <Button
                                    variant="ghost"
                                    className="font-black text-slate-400 h-14 px-8 hover:text-slate-600"
                                    onClick={() => setIsBulkImportOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={isImporting || !importText}
                                    className="bg-indigo-600 hover:bg-indigo-700 font-black px-12 rounded-2xl h-14 shadow-2xl shadow-indigo-100 transition-all active:scale-95 flex-1"
                                >
                                    {isImporting ? "Importing..." : bulkMode === "json" ? "Validate & Import (Wipe Strategy)" : "Import Text"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button
                        onClick={() => {
                            setEditingItem(null)
                            setFormData({
                                code: "", name: "", category: "General", price: "", description: "",
                                isVeg: false, isVegan: false, isDrink: false
                            })
                            setIsAddOpen(true)
                        }}
                        className="h-12 bg-indigo-600 hover:bg-indigo-700 font-black gap-2 px-6 shadow-xl shadow-indigo-100 rounded-2xl transition-all active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        Add Item
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                            <TableHead className="w-[80px] font-black text-slate-400 uppercase tracking-widest text-[10px] h-16 pl-8">Code</TableHead>
                            <TableHead className="w-[200px] font-black text-slate-400 uppercase tracking-widest text-[10px] h-16">Name</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] h-16">Item Details</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] h-16">Category</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] h-16 text-right">Price</TableHead>
                            <TableHead className="w-[100px] font-black text-slate-400 uppercase tracking-widest text-[10px] h-16 text-center pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-80 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                                        <div className="bg-slate-100 p-8 rounded-full">
                                            <Utensils className="h-12 w-12 text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-xl">No menu items yet</p>
                                            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mt-1">Import a menu or add items manually</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => (
                                <TableRow key={item.id} className="group border-slate-50 hover:bg-indigo-50/30 transition-all duration-300">
                                    <TableCell className="font-black text-slate-900 pl-8 align-top py-4">
                                        <span className="bg-slate-50 px-2 py-1 rounded-lg text-[11px] ring-1 ring-slate-200 shadow-sm whitespace-nowrap">{item.code}</span>
                                    </TableCell>
                                    <TableCell className="align-top py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-black text-slate-800 text-sm leading-snug whitespace-normal">{item.name}</span>
                                            <div className="flex gap-1 shrink-0 mt-1">
                                                {item.isDrink && <Coffee className="h-3 w-3 text-amber-500" strokeWidth={3} />}
                                                {item.isVeg && !item.isVegan && <Leaf className="h-3 w-3 text-emerald-500" strokeWidth={3} />}
                                                {item.isVegan && (
                                                    <div className="flex items-center bg-emerald-50 px-1.5 py-0.5 rounded-md ring-1 ring-emerald-100">
                                                        <Leaf className="h-2.5 w-2.5 text-emerald-600 mr-1" strokeWidth={3} />
                                                        <span className="text-[7px] font-black text-emerald-600">VEGAN</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-4 max-w-xs">
                                        {item.description ? (
                                            <span className="text-[11px] text-slate-500 font-medium whitespace-normal leading-relaxed block">{item.description}</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 italic">No details</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top py-4">
                                        <Badge className="bg-slate-100 text-slate-500 font-bold text-[9px] uppercase tracking-widest px-2 h-6 rounded-lg border-none hover:bg-slate-200 whitespace-nowrap">
                                            {item.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-slate-900 text-sm align-top py-4">
                                        {item.price ? `${item.price.toFixed(2)}€` : "—"}
                                    </TableCell>
                                    <TableCell className="pr-8 align-top py-3">
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                variant="outline" size="icon" className="h-8 w-8 border-slate-200 bg-white rounded-lg hover:text-indigo-600 hover:ring-2 hover:ring-indigo-100 active:scale-95 transition-all shadow-sm"
                                                onClick={() => startEdit(item)}
                                            >
                                                <Edit2 className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 border-slate-200 bg-white rounded-lg hover:text-red-500 hover:ring-2 hover:ring-red-100 active:scale-95 transition-all shadow-sm"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-2xl bg-white border-none shadow-3xl rounded-[2.5rem] p-0 overflow-hidden">
                    <DialogHeader className="p-10 pb-4">
                        <DialogTitle className="text-3xl font-black text-slate-900">
                            {editingItem ? "Edit Menu Item" : "Add Menu Item"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-10 py-6 space-y-6 overflow-y-auto max-h-[65vh] no-scrollbar">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Item Code</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="Ex: 101" className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</Label>
                                <Input
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="Ex: Main Dishes" className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Item Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Butter Chicken" className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description (Optional)</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Tender chicken in creamy tomato sauce..." className="min-h-[120px] bg-slate-100 border-none rounded-2xl font-bold text-slate-700 focus:bg-white transition-all shadow-inner px-5 py-4 resize-none no-scrollbar"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price (€)</Label>
                            <Input
                                type="number" step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="14.50" className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5"
                            />
                        </div>
                        <div className="flex bg-slate-50 p-6 rounded-3xl border border-slate-100 justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="isVeg" checked={formData.isVeg}
                                    onCheckedChange={(c) => setFormData({ ...formData, isVeg: !!c })}
                                    className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <Label htmlFor="isVeg" className="font-black text-slate-700 text-sm">Vegetarian</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="isVegan" checked={formData.isVegan}
                                    onCheckedChange={(c) => setFormData({ ...formData, isVegan: !!c })}
                                    className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <Label htmlFor="isVegan" className="font-black text-slate-700 text-sm">Vegan</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="isDrink" checked={formData.isDrink}
                                    onCheckedChange={(c) => setFormData({ ...formData, isDrink: !!c })}
                                    className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <Label htmlFor="isDrink" className="font-black text-slate-700 text-sm">Drink</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="bg-slate-50 p-10 flex flex-col sm:flex-row gap-4 border-t rounded-b-[2.5rem]">
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="font-black text-slate-400 h-14 px-8">Cancel</Button>
                        <Button
                            onClick={handleAddOrUpdate}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black flex-1 rounded-2xl h-14 shadow-2xl shadow-indigo-100 text-lg transition-all active:scale-95"
                        >
                            {editingItem ? "Update Item" : "Save Menu Item"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
