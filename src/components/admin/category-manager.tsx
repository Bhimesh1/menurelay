"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { updateCategory, createCategory, deleteCategory } from "@/app/actions/category"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Trash2, Plus, Save, Edit2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryManagerProps {
    eventId: string
    categories: any[]
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    initialCategoryId?: string
}

export function CategoryManager({ eventId, categories, isOpen, onOpenChange, initialCategoryId }: CategoryManagerProps) {
    const router = useRouter()
    const [editingCatId, setEditingCatId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editParentId, setEditParentId] = useState<string | "none">("none")
    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState("")

    useEffect(() => {
        if (isOpen && initialCategoryId) {
            setTimeout(() => {
                const element = document.getElementById(`cat-${initialCategoryId}`)
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" })
                }
            }, 100)
        }
    }, [isOpen, initialCategoryId])

    const handleUpdate = async (id: string, updates: { name?: string, parentId?: string | null }) => {
        try {
            await updateCategory(id, updates)
            toast.success("Category updated")
            setEditingCatId(null)
            router.refresh()
        } catch (error) {
            toast.error("Failed to update category")
        }
    }

    const handleCreate = async () => {
        if (!newName.trim()) return
        try {
            await createCategory(eventId, {
                name: newName,
                parentId: editParentId === "none" ? null : editParentId
            })
            toast.success("Category created")
            setIsAdding(false)
            setNewName("")
            setEditParentId("none")
            router.refresh()
        } catch (error) {
            toast.error("Failed to create category")
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("Delete this category? Items will remain but may lose their grouping.")) {
            try {
                await deleteCategory(id)
                toast.success("Category deleted")
                router.refresh()
            } catch (error) {
                toast.error("Failed to delete category")
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border-none">
                <DialogHeader className="p-10 pb-4">
                    <DialogTitle className="text-3xl font-black text-slate-900">Manage Categories</DialogTitle>
                    <DialogDescription className="font-bold text-slate-400 text-lg">
                        Rename or change the hierarchy of your menu categories.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-10 py-6 max-h-[50vh] overflow-y-auto space-y-4 no-scrollbar">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            id={`cat-${cat.id}`}
                            className={cn(
                                "p-4 rounded-2xl border transition-all flex items-center justify-between gap-4",
                                cat.id === initialCategoryId
                                    ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20 shadow-sm"
                                    : "bg-slate-50 border-slate-100"
                            )}
                        >
                            <div className="flex-1 flex items-center gap-4">
                                {editingCatId === cat.id ? (
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="h-10 bg-white border-slate-200 rounded-xl font-bold text-slate-700"
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                                            {cat.name}
                                            {cat.parentId && (
                                                <Badge variant="outline" className="text-[8px] font-black text-indigo-400 border-indigo-100 bg-indigo-50/50">
                                                    SUB
                                                </Badge>
                                            )}
                                        </span>
                                        {cat.parentId && (
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                Under {categories.find(c => c.id === cat.parentId)?.name || "Main"}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Select
                                    value={cat.parentId || "none"}
                                    onValueChange={(val) => handleUpdate(cat.id, { parentId: val === "none" ? null : val })}
                                >
                                    <SelectTrigger className="w-[180px] bg-white border-slate-200 rounded-xl font-bold text-slate-600 h-10 px-4">
                                        <SelectValue placeholder="Parent Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Main Category</SelectItem>
                                        {categories.filter(c => c.id !== cat.id && !c.parentId).map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    size="icon" variant="ghost"
                                    className={cn("h-10 w-10 rounded-xl transition-colors", cat.isHidden ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50")}
                                    onClick={() => handleUpdate(cat.id, { isHidden: !cat.isHidden })}
                                >
                                    {cat.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>

                                <div className="flex gap-1">
                                    {editingCatId === cat.id ? (
                                        <Button size="icon" variant="ghost" className="h-10 w-10 text-emerald-500 hover:bg-emerald-50 rounded-xl" onClick={() => handleUpdate(cat.id, { name: editName })}>
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl" onClick={() => {
                                            setEditingCatId(cat.id);
                                            setEditName(cat.name);
                                        }}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => handleDelete(cat.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isAdding ? (
                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 border-dashed space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex gap-4">
                                <Input
                                    placeholder="New Category Name..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="flex-1 h-10 bg-white border-indigo-100 rounded-xl font-bold"
                                    autoFocus
                                />
                                <Select value={editParentId} onValueChange={setEditParentId}>
                                    <SelectTrigger className="w-[180px] h-10 bg-white border-indigo-100 rounded-xl font-bold">
                                        <SelectValue placeholder="Parent (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Main Category</SelectItem>
                                        {categories.filter(c => !c.parentId).map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="font-bold">Cancel</Button>
                                <Button size="sm" onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 rounded-xl transition-all active:scale-95">
                                    Create Category
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={() => setIsAdding(true)}
                            className="w-full h-14 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-200 hover:text-indigo-400 hover:bg-indigo-50/30 transition-all gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            Add New Category
                        </Button>
                    )}
                </div>
                <DialogFooter className="bg-slate-50 p-8 border-t rounded-b-[2.5rem]">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full h-12 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-white shadow-sm">
                        Close Manager
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
