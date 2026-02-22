/**
 * Traveler DNA Onboarding Screen
 * Multi-step questionnaire that builds the user's traveler profile.
 * Persists to AsyncStorage + syncs to backend.
 */

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, SafeAreaView, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface TravelerDNA {
    pace: 'slow' | 'moderate' | 'fast';
    budget_tier: 'backpacker' | 'mid_range' | 'business' | 'luxury';
    interests: string[];
    age_bracket: 'teen' | 'adult' | 'senior' | 'family';
    avoid_crowds: boolean;
    preferred_start_time: string;
}

const INTERESTS = [
    { id: 'history', emoji: '🏛️', label: 'History' },
    { id: 'foodie', emoji: '🍜', label: 'Foodie' },
    { id: 'adventure', emoji: '🧗', label: 'Adventure' },
    { id: 'art', emoji: '🎨', label: 'Art & Culture' },
    { id: 'wellness', emoji: '🧘', label: 'Wellness' },
    { id: 'nightlife', emoji: '🎵', label: 'Nightlife' },
    { id: 'nature', emoji: '🌿', label: 'Nature' },
    { id: 'spirituality', emoji: '🕉️', label: 'Spirituality' },
    { id: 'shopping', emoji: '🛍️', label: 'Shopping' },
    { id: 'photography', emoji: '📸', label: 'Photography' },
    { id: 'architecture', emoji: '🏰', label: 'Architecture' },
    { id: 'wildlife', emoji: '🐆', label: 'Wildlife' },
];

const STEPS = [
    { key: 'welcome', title: 'Your Travel DNA', subtitle: 'Help us plan your perfect trip' },
    { key: 'pace', title: 'How do you travel?', subtitle: 'We\'ll match your energy' },
    { key: 'budget', title: 'Your budget range?', subtitle: 'So we pick the right places' },
    { key: 'interests', title: 'What do you love?', subtitle: 'Pick all that apply' },
    { key: 'crowd', title: 'Crowd preferences?', subtitle: 'We\'ll tailor accordingly' },
    { key: 'done', title: 'You\'re all set! 🎉', subtitle: 'Your DNA is saved' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function TravelerDNAScreen() {
    const [step, setStep] = useState(0);
    const [dna, setDna] = useState<TravelerDNA>({
        pace: 'moderate',
        budget_tier: 'mid_range',
        interests: [],
        age_bracket: 'adult',
        avoid_crowds: false,
        preferred_start_time: '09:00',
    });

    const progress = (step / (STEPS.length - 1)) * 100;

    const toggleInterest = (id: string) => {
        setDna(prev => ({
            ...prev,
            interests: prev.interests.includes(id)
                ? prev.interests.filter(i => i !== id)
                : [...prev.interests, id],
        }));
    };

    const handleNext = async () => {
        if (step < STEPS.length - 2) {
            setStep(s => s + 1);
        } else {
            // Save DNA
            await AsyncStorage.setItem('traveler_dna', JSON.stringify(dna));
            setStep(STEPS.length - 1);
            setTimeout(() => router.replace('/(tabs)'), 1600);
        }
    };

    const current = STEPS[step];

    return (
        <SafeAreaView style={styles.container}>
            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` as any }]} />
            </View>

            {/* Step counter */}
            <Text style={styles.stepCount}>{step + 1} / {STEPS.length}</Text>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>{current.title}</Text>
                <Text style={styles.subtitle}>{current.subtitle}</Text>

                {/* ── STEP: PACE ─────────────────────────────────────────────────── */}
                {current.key === 'pace' && (
                    <View style={styles.optionsGrid}>
                        {([
                            { value: 'slow', emoji: '🌿', label: 'Slow', desc: '2-3 stops/day\nDeep experiences' },
                            { value: 'moderate', emoji: '⚡', label: 'Moderate', desc: '4-5 stops/day\nBalanced rhythm' },
                            { value: 'fast', emoji: '🚀', label: 'Fast', desc: '6-7 stops/day\nSee everything' },
                        ] as const).map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[styles.optionCard, dna.pace === opt.value && styles.optionCardSelected]}
                                onPress={() => setDna(d => ({ ...d, pace: opt.value }))}
                            >
                                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                                <Text style={[styles.optionLabel, dna.pace === opt.value && styles.optionLabelSelected]}>
                                    {opt.label}
                                </Text>
                                <Text style={styles.optionDesc}>{opt.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── STEP: BUDGET ───────────────────────────────────────────────── */}
                {current.key === 'budget' && (
                    <View style={styles.budgetOptions}>
                        {([
                            { value: 'backpacker', emoji: '🎒', label: 'Backpacker', range: '₹1,500–3,000/day' },
                            { value: 'mid_range', emoji: '🧳', label: 'Mid-Range', range: '₹4,000–8,000/day' },
                            { value: 'business', emoji: '💼', label: 'Business', range: '₹10,000–20,000/day' },
                            { value: 'luxury', emoji: '🍾', label: 'Luxury', range: '₹25,000+/day' },
                        ] as const).map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[styles.budgetCard, dna.budget_tier === opt.value && styles.budgetCardSelected]}
                                onPress={() => setDna(d => ({ ...d, budget_tier: opt.value }))}
                            >
                                <Text style={styles.budgetEmoji}>{opt.emoji}</Text>
                                <View>
                                    <Text style={[styles.budgetLabel, dna.budget_tier === opt.value && styles.selectedText]}>
                                        {opt.label}
                                    </Text>
                                    <Text style={styles.budgetRange}>{opt.range}</Text>
                                </View>
                                {dna.budget_tier === opt.value && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── STEP: INTERESTS ────────────────────────────────────────────── */}
                {current.key === 'interests' && (
                    <View style={styles.interestsGrid}>
                        {INTERESTS.map(interest => (
                            <TouchableOpacity
                                key={interest.id}
                                style={[
                                    styles.interestPill,
                                    dna.interests.includes(interest.id) && styles.interestPillSelected,
                                ]}
                                onPress={() => toggleInterest(interest.id)}
                            >
                                <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                                <Text style={[
                                    styles.interestLabel,
                                    dna.interests.includes(interest.id) && styles.selectedText,
                                ]}>
                                    {interest.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── STEP: CROWD ────────────────────────────────────────────────── */}
                {current.key === 'crowd' && (
                    <View style={styles.optionsGrid}>
                        {([
                            { value: false, emoji: '🎡', label: 'I love the buzz!', desc: 'Rooftop bars,\npopular cafes' },
                            { value: true, emoji: '🌄', label: 'Hidden gems only', desc: 'Off-peak hours,\nlocals\' spots' },
                        ] as const).map(opt => (
                            <TouchableOpacity
                                key={String(opt.value)}
                                style={[styles.optionCard, dna.avoid_crowds === opt.value && styles.optionCardSelected]}
                                onPress={() => setDna(d => ({ ...d, avoid_crowds: opt.value }))}
                            >
                                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                                <Text style={[styles.optionLabel, dna.avoid_crowds === opt.value && styles.optionLabelSelected]}>
                                    {opt.label}
                                </Text>
                                <Text style={styles.optionDesc}>{opt.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── STEP: DONE ─────────────────────────────────────────────────── */}
                {current.key === 'done' && (
                    <View style={styles.doneContainer}>
                        <Text style={styles.doneEmoji}>🧬</Text>
                        <Text style={styles.doneSummary}>
                            {dna.pace.toUpperCase()} pace · {dna.budget_tier.replace('_', ' ')} ·{'\n'}
                            {dna.interests.length} interests saved
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* CTA */}
            {current.key !== 'done' && (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                    <Text style={styles.nextBtnText}>
                        {step === STEPS.length - 2 ? '🚀 Save My DNA' : 'Continue →'}
                    </Text>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
    bg: '#090E1A', surface: '#111827', surface2: '#1A2235',
    saffron: '#FF6B1A', muted: '#8896B0', text: '#F5F0E8', border: 'rgba(255,255,255,0.08)',
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    progressContainer: { height: 3, backgroundColor: C.surface2 },
    progressBar: { height: 3, backgroundColor: C.saffron, borderRadius: 2 },
    stepCount: { textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: '600', paddingHorizontal: 24, paddingTop: 12 },
    content: { padding: 24, paddingBottom: 120 },
    title: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8, marginTop: 8 },
    subtitle: { fontSize: 15, color: C.muted, marginBottom: 32 },

    // Options (pace / crowd)
    optionsGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    optionCard: { flex: 1, minWidth: 100, backgroundColor: C.surface, borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: C.border },
    optionCardSelected: { borderColor: C.saffron, backgroundColor: 'rgba(255,107,26,0.12)' },
    optionEmoji: { fontSize: 28, marginBottom: 8 },
    optionLabel: { color: C.muted, fontWeight: '700', fontSize: 14, marginBottom: 6 },
    optionLabelSelected: { color: C.saffron },
    optionDesc: { color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 },

    // Budget
    budgetOptions: { gap: 12 },
    budgetCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.surface, borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: C.border },
    budgetCardSelected: { borderColor: C.saffron, backgroundColor: 'rgba(255,107,26,0.08)' },
    budgetEmoji: { fontSize: 26 },
    budgetLabel: { color: C.muted, fontWeight: '700', fontSize: 15 },
    budgetRange: { color: C.muted, fontSize: 12, marginTop: 2 },
    checkmark: { marginLeft: 'auto', color: C.saffron, fontSize: 18, fontWeight: '900' },

    // Interests
    interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    interestPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
    interestPillSelected: { borderColor: C.saffron, backgroundColor: 'rgba(255,107,26,0.12)' },
    interestEmoji: { fontSize: 16 },
    interestLabel: { color: C.muted, fontWeight: '600', fontSize: 13 },
    selectedText: { color: C.saffron },

    // Done
    doneContainer: { alignItems: 'center', marginTop: 40 },
    doneEmoji: { fontSize: 80, marginBottom: 24 },
    doneSummary: { color: C.text, fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 28 },

    // CTA
    nextBtn: { position: 'absolute', bottom: 40, left: 24, right: 24, backgroundColor: C.saffron, borderRadius: 50, padding: 18, alignItems: 'center' },
    nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
