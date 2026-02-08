"use client"

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import { format } from "date-fns"
import { SPICE_LEVELS } from "@/lib/utils"

const styles = StyleSheet.create({
    page: {
        padding: 36,
        fontFamily: "Helvetica",
        color: "#1e293b",
        backgroundColor: "#ffffff",
    },
    header: {
        borderBottomWidth: 4,
        borderBottomColor: "#4f46e5",
        borderBottomStyle: "solid",
        paddingBottom: 25,
        marginBottom: 35,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    headerLeft: {
        flexDirection: "column",
        flex: 1,
    },
    headerRight: {
        flexDirection: "column",
        alignItems: "flex-end",
        width: 170,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#4f46e5",
        letterSpacing: -1.5,
        marginBottom: 4,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#475569",
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 8,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 2.2,
        fontWeight: "bold",
    },
    restaurantInfo: {
        fontSize: 9,
        color: "#4f46e5",
        fontWeight: "black",
        marginBottom: 4,
    },
    address: {
        fontSize: 10,
        color: "#64748b",
        fontWeight: "bold",
        lineHeight: 1.4,
        textAlign: "right",
        marginTop: 2,
    },
    section: {
        marginBottom: 12,
    },
    sectionHeader: {
        backgroundColor: "#f8fafc",
        padding: "5 9",
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#4f46e5",
        borderLeftStyle: "solid",
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#1e293b",
        textTransform: "uppercase",
        letterSpacing: 1.2,
    },
    guestCard: {
        marginBottom: 5,
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#f1f5f9",
        borderStyle: "solid",
    },
    guestHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
        paddingBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        borderBottomStyle: "solid",
    },
    guestName: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#0f172a",
        textDecoration: "underline",
    },
    itemRow: {
        flexDirection: "row",
        marginBottom: 2,
        paddingLeft: 5,
        alignItems: "flex-start",
    },
    qty: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#4f46e5",
        width: 22,
    },
    itemCode: {
        fontSize: 7,
        fontWeight: "bold",
        color: "#64748b",
        backgroundColor: "#f1f5f9",
        padding: "1 4",
        borderRadius: 4,
        marginRight: 6,
        marginTop: 1,
    },
    itemName: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#334155",
        flex: 1,
        lineHeight: 1.1,
    },
    detailsContainer: {
        marginLeft: 44,
        marginTop: -1,
        marginBottom: 3,
        gap: 2,
    },
    itemNote: {
        fontSize: 7,
        color: "#b45309",
        backgroundColor: "#fffbeb",
        padding: "2 6",
        borderRadius: 5,
        fontStyle: "italic",
        borderLeftWidth: 2,
        borderLeftColor: "#fbbf24",
        borderLeftStyle: "solid",
    },
    spiceLabel: {
        fontSize: 6,
        fontWeight: "bold",
        color: "#ef4444",
        backgroundColor: "#fef2f2",
        padding: "2 5",
        borderRadius: 4,
        alignSelf: "flex-start",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    globalNoteBox: {
        marginTop: 12,
        backgroundColor: "#f8fafc",
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: "dashed",
    },
    globalNoteLabel: {
        fontSize: 8,
        color: "#94a3b8",
        fontWeight: "bold",
        textTransform: "uppercase",
        marginBottom: 4,
        letterSpacing: 1,
    },
    globalNoteText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#475569",
        fontStyle: "italic",
        lineHeight: 1.5,
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center",
        color: "#cbd5e1",
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        borderTopStyle: "solid",
        paddingTop: 15,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
})

export function MasterOrderPDF({ event, totals, orders }: any) {
    const dateStr = format(new Date(), "PPpp")
    const spiceScale = (event.spiceScale && SPICE_LEVELS[event.spiceScale as keyof typeof SPICE_LEVELS])
        ? event.spiceScale
        : "GERMAN"

    return (
        <Document title={`Order Master - ${event.title}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.mainTitle}>{event.pdfHeaderTitle || "New Party Order"}</Text>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.subtitle}>{event.pdfReportTitle || "MASTER ORDER SUMMARY"}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        {event.restaurantName && (
                            <Text style={styles.restaurantInfo}>
                                {event.pdfRestaurantLabel || "Restaurant"}: {event.restaurantName}
                            </Text>
                        )}
                        {event.pdfAddress && (
                            <Text style={styles.address}>Address: {event.pdfAddress}</Text>
                        )}
                        <Text style={[styles.subtitle, { marginTop: 10, letterSpacing: 1 }]}>Generated</Text>
                        <Text style={{ fontSize: 9, color: "#64748b", fontWeight: "bold" }}>{dateStr}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{event.pdfSectionTitle || "DETAILED ORDERS"}</Text>
                    </View>

                    {orders.map((order: any, idx: number) => {
                        return (
                            <View key={idx} style={styles.guestCard} wrap={false}>
                                <View style={styles.guestHeader}>
                                    <Text style={styles.guestName}>{idx + 1}. {order.guestName}</Text>
                                    <Text style={styles.subtitle}>{order.items.length} items</Text>
                                </View>

                                {order.items.map((item: any, iIdx: number) => {
                                    const rawSpiceLabel = item.spiceLevel > 0
                                        ? SPICE_LEVELS[spiceScale as keyof typeof SPICE_LEVELS][item.spiceLevel] || "Unknown"
                                        : null

                                    const spiceLabel = rawSpiceLabel ? `${spiceScale} ${rawSpiceLabel}` : null

                                    return (
                                        <View key={iIdx} style={{ marginBottom: 12 }}>
                                            <View style={styles.itemRow}>
                                                <Text style={styles.qty}>{item.qty}x</Text>
                                                <Text style={styles.itemCode}>{item.codeSnapshot}</Text>
                                                <Text style={styles.itemName}>
                                                    {item.nameSnapshot} {item.optionLabel ? `• ${item.optionLabel}` : ""}
                                                </Text>
                                            </View>

                                            <View style={styles.detailsContainer}>
                                                {item.note && (
                                                    <Text style={styles.itemNote}>Note: "{item.note}"</Text>
                                                )}
                                                {spiceLabel && (
                                                    <Text style={styles.spiceLabel}>Spice: {spiceLabel}</Text>
                                                )}
                                            </View>
                                        </View>
                                    )
                                })}

                                {order.notes && (
                                    <View style={styles.globalNoteBox}>
                                        <Text style={styles.globalNoteLabel}>Global Guest Note</Text>
                                        <Text style={styles.globalNoteText}>"{order.notes}"</Text>
                                    </View>
                                )}
                            </View>
                        )
                    })}
                </View>

                <Text style={styles.footer} fixed>
                    Generated for {event.title} • PartyOrderApp Express
                </Text>
            </Page>
        </Document>
    )
}
