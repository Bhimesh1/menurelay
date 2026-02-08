import { useState, useEffect } from "react"
import { PDFDownloadLink } from "@react-pdf/renderer"
import { MasterOrderPDF } from "./pdf-report"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function PDFDownloadButton({ event, totals, orders }: any) {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) {
        return (
            <Button disabled className="bg-emerald-600 opacity-50">
                Loading Export...
            </Button>
        )
    }

    const fileName = `MasterOrder_${event.slug}_${new Date().toISOString().split('T')[0]}.pdf`

    // Create a key based on PDF settings to force a fresh render when they change
    const downloadKey = `${event.pdfHeaderTitle}-${event.pdfReportTitle}-${event.pdfAddress}-${event.pdfRestaurantLabel}-${event.pdfSectionTitle}-${event.spiceScale}`

    return (
        <PDFDownloadLink
            key={downloadKey}
            document={<MasterOrderPDF event={event} totals={totals} orders={orders} />}
            fileName={fileName}
        >
            {({ loading }) => (
                <Button
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 shadow-lg shadow-emerald-100 h-11 px-8"
                >
                    <Download className="h-4 w-4" />
                    {loading ? "Generating Master PDF..." : "Export Master PDF"}
                </Button>
            )}
        </PDFDownloadLink>
    )
}
