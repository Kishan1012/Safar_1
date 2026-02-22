import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export default function HomeScreen() {
    const { data: collections } = useQuery({
        queryKey: ['collections'],
        queryFn: () => api.get('/collections').then(r => r.data.data),
    });

    const { data: spots } = useQuery({
        queryKey: ['spots'],
        queryFn: () => api.get('/spots?limit=5').then(r => r.data.data),
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Good morning 👋</Text>
                        <Text style={styles.title}>Where to next?</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/import')} style={styles.importBtn}>
                        <Text style={styles.importBtnText}>+ Import</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <StatCard label="Spots Saved" value={spots?.length ?? 0} icon="📍" />
                    <StatCard label="Collections" value={collections?.length ?? 0} icon="📚" />
                    <StatCard label="Trips Planned" value={3} icon="✈️" />
                </View>

                {/* Recent Collections */}
                <Section title="Your Collections" onSeeAll={() => router.push('/collections')}>
                    {collections?.slice(0, 3).map((c: CollectionItem) => (
                        <TouchableOpacity
                            key={c.id}
                            style={styles.collectionCard}
                            onPress={() => router.push(`/collections/${c.id}`)}
                        >
                            <View style={styles.collectionEmoji}>
                                <Text style={{ fontSize: 28 }}>🗂️</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.collectionName}>{c.name}</Text>
                                <Text style={styles.collectionMeta}>
                                    {c.destination ?? 'No destination'} · {c.spot_count ?? 0} spots
                                </Text>
                            </View>
                            <Text style={{ color: '#8888aa' }}>›</Text>
                        </TouchableOpacity>
                    ))}
                </Section>

                {/* Recent Spots */}
                <Section title="Recently Saved" onSeeAll={() => router.push('/map')}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {spots?.map((s: SpotItem) => (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.spotCard}
                                onPress={() => router.push(`/spot/${s.id}`)}
                            >
                                <View style={styles.spotImage}>
                                    <Text style={{ fontSize: 32 }}>📍</Text>
                                </View>
                                <Text style={styles.spotName} numberOfLines={1}>{s.name}</Text>
                                <Text style={styles.spotCategory}>{s.category}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Section>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function Section({
    title, children, onSeeAll
}: {
    title: string; children: React.ReactNode; onSeeAll?: () => void;
}) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {onSeeAll && (
                    <TouchableOpacity onPress={onSeeAll}>
                        <Text style={styles.seeAll}>See all</Text>
                    </TouchableOpacity>
                )}
            </View>
            {children}
        </View>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CollectionItem { id: string; name: string; destination?: string; spot_count?: number; }
interface SpotItem { id: string; name: string; category: string; }

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0f' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 16 },
    greeting: { color: '#8888aa', fontSize: 14, fontWeight: '500' },
    title: { color: '#f0f0f8', fontSize: 28, fontWeight: '800', marginTop: 4 },
    importBtn: { backgroundColor: '#7c5cfc', borderRadius: 50, paddingHorizontal: 20, paddingVertical: 10 },
    importBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 8 },
    statCard: { flex: 1, backgroundColor: '#13131a', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    statIcon: { fontSize: 22, marginBottom: 6 },
    statValue: { color: '#f0f0f8', fontSize: 22, fontWeight: '800' },
    statLabel: { color: '#8888aa', fontSize: 11, marginTop: 2, textAlign: 'center' },
    section: { marginTop: 32, paddingHorizontal: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { color: '#f0f0f8', fontSize: 18, fontWeight: '700' },
    seeAll: { color: '#7c5cfc', fontWeight: '600', fontSize: 14 },
    collectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131a', borderRadius: 14, padding: 16, marginBottom: 10, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    collectionEmoji: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(124,92,252,0.15)', alignItems: 'center', justifyContent: 'center' },
    collectionName: { color: '#f0f0f8', fontWeight: '700', fontSize: 15 },
    collectionMeta: { color: '#8888aa', fontSize: 12, marginTop: 3 },
    spotCard: { width: 140, marginRight: 14, backgroundColor: '#13131a', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    spotImage: { height: 100, backgroundColor: 'rgba(124,92,252,0.1)', alignItems: 'center', justifyContent: 'center' },
    spotName: { color: '#f0f0f8', fontWeight: '600', fontSize: 13, padding: 10, paddingBottom: 4 },
    spotCategory: { color: '#7c5cfc', fontSize: 11, fontWeight: '600', paddingHorizontal: 10, paddingBottom: 10, textTransform: 'capitalize' },
});
