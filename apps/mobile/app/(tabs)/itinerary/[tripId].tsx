/**
 * Collage-Style Itinerary View
 * Shows the AI-generated day-by-day itinerary in a
 * visually rich "travel magazine collage" layout.
 *
 * Features:
 * - Day selector strip
 * - Timeline view with map thumbnails
 * - Per-stop: travel mode + time, why-you'll-love-it, concierge tip
 * - Swipe-left to reject a stop → triggers re-optimization
 * - Budget bar at top (real-time remaining)
 * - Offline cache badge
 */

import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, Alert, Dimensions, FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

const { width: W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stop {
    id: string;
    name: string;
    category: string;
    emoji: string;
    scheduled_arrival: string;
    scheduled_departure: string;
    travel_mode: string;
    travel_time_mins: number;
    estimated_cost: number;
    why_youll_love_it: string;
    concierge_tip: string;
    lat: number;
    lng: number;
    neighborhood: string;
    ai_score: number;
}

interface Day {
    day_number: number;
    local_date: string;
    theme: string;
    neighborhood: string;
    estimated_day_cost: number;
    stops: Stop[];
}

// ─── Mock Data (in production: fetched from API + AsyncStorage) ───────────────
const MOCK_DAYS: Day[] = [
    {
        day_number: 1,
        local_date: '2026-03-10',
        theme: 'Royal Rajasthan',
        neighborhood: 'Old City — Pink Area',
        estimated_day_cost: 3200,
        stops: [
            {
                id: '1', name: 'Amber Fort', category: 'heritage', emoji: '🏰',
                scheduled_arrival: '09:00', scheduled_departure: '11:30',
                travel_mode: 'taxi', travel_time_mins: 0,
                estimated_cost: 550, why_youll_love_it: 'As a history lover, Amber\'s palaces tell 500 years of Rajput stories.',
                concierge_tip: '💡 Arrive before 9am to beat the crowds and catch golden morning light on the ramparts.',
                lat: 26.9855, lng: 75.8513, neighborhood: 'Amer', ai_score: 0.95,
            },
            {
                id: '2', name: 'Panna Meena Ka Kund', category: 'heritage', emoji: '🪜',
                scheduled_arrival: '11:45', scheduled_departure: '12:30',
                travel_mode: 'walking', travel_time_mins: 10,
                estimated_cost: 0, why_youll_love_it: 'A hidden geometric stepwell that most tourists miss — perfect for photography.',
                concierge_tip: '💡 Visit now — same neighborhood as Amber, saves 45 min of backtracking later.',
                lat: 26.9829, lng: 75.8503, neighborhood: 'Amer', ai_score: 0.88,
            },
            {
                id: '3', name: 'Laxmi Misthan Bhandar', category: 'restaurant', emoji: '🍛',
                scheduled_arrival: '13:00', scheduled_departure: '14:00',
                travel_mode: 'taxi', travel_time_mins: 30,
                estimated_cost: 380, why_youll_love_it: 'Legendary Jaipur thali — foodie heaven for ₹380.',
                concierge_tip: '💡 Order the dal baati churma. It\'s been on the menu since 1954.',
                lat: 26.9162, lng: 75.8185, neighborhood: 'Pink City', ai_score: 0.92,
            },
            {
                id: '4', name: 'Hawa Mahal', category: 'heritage', emoji: '🏯',
                scheduled_arrival: '14:30', scheduled_departure: '15:30',
                travel_mode: 'walking', travel_time_mins: 15,
                estimated_cost: 200, why_youll_love_it: 'The palace of winds — 953 windows designed so royal ladies could watch city life.',
                concierge_tip: '💡 View the facade from the chai stall across the street for the iconic shot.',
                lat: 26.9239, lng: 75.8267, neighborhood: 'Pink City', ai_score: 0.82,
            },
        ],
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const TRAVEL_MODE_ICONS: Record<string, string> = {
    walking: '🚶', taxi: '🚕', transit: '🚇', cycling: '🚲', driving: '🚗',
};

function BudgetBar({ spent, total }: { spent: number; total: number }) {
    const pct = Math.min((spent / total) * 100, 100);
    const remaining = total - spent;
    return (
        <View style={styles.budgetBar}>
            <View style={styles.budgetBarRow}>
                <Text style={styles.budgetBarLabel}>💰 Day Budget</Text>
                <Text style={styles.budgetBarRemaining}>₹{remaining.toLocaleString('en-IN')} left</Text>
            </View>
            <View style={styles.budgetBarTrack}>
                <View style={[styles.budgetBarFill, { width: `${pct}%` as any, backgroundColor: pct > 80 ? '#EF4444' : '#FF6B1A' }]} />
            </View>
            <Text style={styles.budgetBarTotal}>of ₹{total.toLocaleString('en-IN')} estimated</Text>
        </View>
    );
}

function StopCard({ stop, onReject }: { stop: Stop; onReject: (s: Stop) => void }) {
    return (
        <View style={styles.stopCard}>
            {/* Travel connector */}
            {stop.travel_time_mins > 0 && (
                <View style={styles.travelConnector}>
                    <View style={styles.travelLine} />
                    <View style={styles.travelBadge}>
                        <Text style={styles.travelBadgeText}>
                            {TRAVEL_MODE_ICONS[stop.travel_mode]} {stop.travel_time_mins} min
                        </Text>
                    </View>
                    <View style={styles.travelLine} />
                </View>
            )}

            {/* Main card */}
            <View style={styles.stopCardInner}>
                {/* Header */}
                <View style={styles.stopHeader}>
                    <View style={styles.stopEmojiWrap}>
                        <Text style={styles.stopEmoji}>{stop.emoji}</Text>
                    </View>
                    <View style={styles.stopInfo}>
                        <Text style={styles.stopName}>{stop.name}</Text>
                        <Text style={styles.stopTime}>{stop.scheduled_arrival} – {stop.scheduled_departure}</Text>
                    </View>
                    <View style={styles.stopRight}>
                        <Text style={styles.stopCost}>
                            {stop.estimated_cost === 0 ? 'Free' : `₹${stop.estimated_cost}`}
                        </Text>
                        <View style={[styles.aiScoreDot, { backgroundColor: stop.ai_score > 0.8 ? '#22C55E' : '#F59E0B' }]} />
                    </View>
                </View>

                {/* Why you'll love it */}
                <Text style={styles.whyText}>💜 {stop.why_youll_love_it}</Text>

                {/* Concierge tip */}
                <View style={styles.tipBox}>
                    <Text style={styles.tipText}>{stop.concierge_tip}</Text>
                </View>

                {/* Actions */}
                <View style={styles.stopActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { }}>
                        <Text style={styles.actionBtnText}>🗺️ Map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { }}>
                        <Text style={styles.actionBtnText}>📋 Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => onReject(stop)}>
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>✕ Not this</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ItineraryScreen() {
    const [selectedDay, setSelectedDay] = useState(0);
    const [days, setDays] = useState<Day[]>(MOCK_DAYS);
    const [isReoptimizing, setIsReoptimizing] = useState(false);
    const [isOfflineCached] = useState(true);

    const day = days[selectedDay] || days[0];
    const totalSpent = day.stops.reduce((s, p) => s + p.estimated_cost, 0);

    const handleReject = useCallback(async (stop: Stop) => {
        Alert.alert(
            `Skip "${stop.name}"?`,
            'Tell us why so we can find something better:',
            [
                { text: 'Too crowded', onPress: () => reoptimize(stop, 'too_crowded') },
                { text: 'Not interested', onPress: () => reoptimize(stop, 'not_interested') },
                { text: 'Too expensive', onPress: () => reoptimize(stop, 'too_expensive') },
                { text: 'Keep it', style: 'cancel' },
            ]
        );
    }, [day]);

    const reoptimize = async (stop: Stop, reason: string) => {
        setIsReoptimizing(true);
        try {
            // In production: POST /itinerary/{trip_id}/reject-stop
            // Simulated re-optimization delay
            await new Promise(r => setTimeout(r, 1500));

            // Remove the rejected stop and insert a placeholder
            setDays(prev => prev.map((d, i) =>
                i === selectedDay
                    ? { ...d, stops: d.stops.filter(s => s.id !== stop.id) }
                    : d
            ));
        } finally {
            setIsReoptimizing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Itinerary</Text>
                <View style={styles.headerRight}>
                    {isOfflineCached && (
                        <View style={styles.offlineBadge}>
                            <Text style={styles.offlineBadgeText}>📶 Offline</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Day selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                {days.map((d, i) => (
                    <TouchableOpacity
                        key={d.day_number}
                        style={[styles.dayChip, i === selectedDay && styles.dayChipActive]}
                        onPress={() => setSelectedDay(i)}
                    >
                        <Text style={[styles.dayChipNum, i === selectedDay && styles.dayChipNumActive]}>
                            Day {d.day_number}
                        </Text>
                        <Text style={styles.dayChipTheme} numberOfLines={1}>{d.theme}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Day overview */}
                <View style={styles.dayOverview}>
                    <Text style={styles.dayTheme}>{day.theme}</Text>
                    <Text style={styles.dayNeighborhood}>📍 {day.neighborhood} · {day.stops.length} stops</Text>
                </View>

                {/* Budget */}
                <BudgetBar spent={totalSpent} total={day.estimated_day_cost} />

                {/* Stops */}
                {isReoptimizing && (
                    <View style={styles.reoptimizingBanner}>
                        <Text style={styles.reoptimizingText}>🤖 AI is finding a better alternative...</Text>
                    </View>
                )}

                {day.stops.map(stop => (
                    <StopCard key={stop.id} stop={stop} onReject={handleReject} />
                ))}

                {/* Share CTA */}
                <TouchableOpacity style={styles.shareBtn}>
                    <Text style={styles.shareBtnText}>📤 Share Trip via WhatsApp</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
    bg: '#090E1A', surface: '#111827', surface2: '#1A2235', surface3: '#232F44',
    saffron: '#FF6B1A', teal: '#13A898', muted: '#8896B0', text: '#F5F0E8', border: 'rgba(255,255,255,0.08)',
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
    backBtn: { fontSize: 22, color: C.text, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    headerRight: { width: 70, alignItems: 'flex-end' },
    offlineBadge: { backgroundColor: 'rgba(19,168,152,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, borderWidth: 1, borderColor: C.teal },
    offlineBadgeText: { color: C.teal, fontSize: 10, fontWeight: '700' },

    daySelector: { paddingLeft: 20, maxHeight: 80, flexGrow: 0 },
    dayChip: { marginRight: 10, padding: 12, paddingHorizontal: 18, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, minWidth: 100 },
    dayChipActive: { borderColor: C.saffron, backgroundColor: 'rgba(255,107,26,0.12)' },
    dayChipNum: { color: C.muted, fontWeight: '800', fontSize: 12 },
    dayChipNumActive: { color: C.saffron },
    dayChipTheme: { color: C.muted, fontSize: 10, marginTop: 2, maxWidth: 90 },

    scroll: { flex: 1, paddingHorizontal: 20 },
    dayOverview: { paddingVertical: 16 },
    dayTheme: { fontSize: 22, fontWeight: '800', color: C.text },
    dayNeighborhood: { color: C.muted, fontSize: 13, marginTop: 4 },

    budgetBar: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
    budgetBarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    budgetBarLabel: { color: C.muted, fontWeight: '700', fontSize: 12 },
    budgetBarRemaining: { color: C.saffron, fontWeight: '800', fontSize: 13 },
    budgetBarTrack: { height: 6, backgroundColor: C.surface3, borderRadius: 3, overflow: 'hidden' },
    budgetBarFill: { height: 6, borderRadius: 3 },
    budgetBarTotal: { color: C.muted, fontSize: 11, marginTop: 6 },

    travelConnector: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, paddingHorizontal: 16 },
    travelLine: { flex: 1, height: 1, backgroundColor: C.border },
    travelBadge: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: C.surface3, borderRadius: 50, marginHorizontal: 8 },
    travelBadgeText: { color: C.muted, fontSize: 11, fontWeight: '600' },

    stopCard: { marginBottom: 4 },
    stopCardInner: { backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border },
    stopHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    stopEmojiWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,107,26,0.12)', alignItems: 'center', justifyContent: 'center' },
    stopEmoji: { fontSize: 22 },
    stopInfo: { flex: 1 },
    stopName: { color: C.text, fontWeight: '800', fontSize: 15, lineHeight: 20 },
    stopTime: { color: C.muted, fontSize: 12, marginTop: 3 },
    stopRight: { alignItems: 'flex-end', gap: 6 },
    stopCost: { color: C.saffron, fontWeight: '700', fontSize: 13 },
    aiScoreDot: { width: 8, height: 8, borderRadius: 4 },
    whyText: { color: '#C4B5FD', fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginBottom: 12 },
    tipBox: { backgroundColor: C.surface2, borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: C.teal },
    tipText: { color: C.muted, fontSize: 12, lineHeight: 18 },

    stopActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, backgroundColor: C.surface2, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    rejectBtn: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
    actionBtnText: { color: C.muted, fontWeight: '700', fontSize: 12 },

    reoptimizingBanner: { backgroundColor: 'rgba(255,107,26,0.12)', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.saffron, alignItems: 'center' },
    reoptimizingText: { color: C.saffron, fontWeight: '700', fontSize: 14 },

    shareBtn: { backgroundColor: '#25D366', borderRadius: 16, padding: 16, alignItems: 'center', marginVertical: 24 },
    shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
