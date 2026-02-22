'use client';

/**
 * CityAutocomplete — Google Places Edition
 * ──────────────────────────────────────────
 * Uses the Google Maps Places AutocompleteService so we fully own the
 * dropdown rendering (dark cinematic theme, zero Google branding imposed).
 *
 * Fallback: When NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is missing / placeholder,
 * it automatically falls back to the built-in 38-city static list so the UI
 * still works during development.
 *
 * Flow:
 *  1. Script loads once (singleton guard via window._gmapsLoaded).
 *  2. getPlacePredictions() is called after a 300ms debounce on each keypress.
 *  3. On selection, getDetails() fetches structured address components so we
 *     can extract a clean "City, Country" string for the n8n webhook.
 *  4. On keyboard navigation (↑ ↓ Enter Esc) — same as before.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Static fallback cities (used when no API key is present) ─────────────────
const FALLBACK_CITIES = [
    { label: 'Lucknow, Uttar Pradesh, India', emoji: '🕌' },
    { label: 'Varanasi, Uttar Pradesh, India', emoji: '🪔' },
    { label: 'Jaipur, Rajasthan, India', emoji: '🏰' },
    { label: 'Delhi, India', emoji: '🕍' },
    { label: 'Agra, Uttar Pradesh, India', emoji: '🏯' },
    { label: 'Jodhpur, Rajasthan, India', emoji: '🔵' },
    { label: 'Udaipur, Rajasthan, India', emoji: '💑' },
    { label: 'Goa, India', emoji: '🏖️' },
    { label: 'Kochi, Kerala, India', emoji: '🚤' },
    { label: 'Bangalore, Karnataka, India', emoji: '💻' },
    { label: 'Hyderabad, Telangana, India', emoji: '💎' },
    { label: 'Mumbai, Maharashtra, India', emoji: '🌆' },
    { label: 'Kolkata, West Bengal, India', emoji: '🏛️' },
    { label: 'Chennai, Tamil Nadu, India', emoji: '🌊' },
    { label: 'Shimla, Himachal Pradesh, India', emoji: '❄️' },
    { label: 'Manali, Himachal Pradesh, India', emoji: '🎿' },
    { label: 'Leh, Ladakh, India', emoji: '🏔️' },
    { label: 'Rishikesh, Uttarakhand, India', emoji: '🕉️' },
    { label: 'Amritsar, Punjab, India', emoji: '🛕' },
    { label: 'Hampi, Karnataka, India', emoji: '🗿' },
    { label: 'Darjeeling, West Bengal, India', emoji: '🍵' },
    { label: 'Cincinnati, Ohio, USA', emoji: '🇺🇸' },
    { label: 'New York, New York, USA', emoji: '🗽' },
    { label: 'London, England, UK', emoji: '🎡' },
    { label: 'Dubai, UAE', emoji: '🏙️' },
    { label: 'Bangkok, Thailand', emoji: '🐘' },
    { label: 'Bali, Indonesia', emoji: '🌺' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Suggestion {
    placeId: string;
    mainText: string;
    secondaryText: string;
    fullText: string;
    emoji?: string;       // only set for fallback suggestions
    isFallback?: boolean;
}

interface Props {
    value: string;
    onChange: (city: string) => void;
    placeholder?: string;
}

// ─── Declare global types for Google Maps ─────────────────────────────────────
declare global {
    interface Window {
        _gmapsCallbacks: Array<() => void>;
        _gmapsLoaded: boolean;
        _gmapsLoading: boolean;
        initGoogleMaps: () => void;
        google: typeof google;
    }
}

// ─── Singleton Google Maps script loader ──────────────────────────────────────
function loadGoogleMapsScript(apiKey: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window._gmapsLoaded) return Promise.resolve();

    return new Promise((resolve) => {
        if (!window._gmapsCallbacks) window._gmapsCallbacks = [];
        window._gmapsCallbacks.push(resolve);

        if (window._gmapsLoading) return;
        window._gmapsLoading = true;

        window.initGoogleMaps = () => {
            window._gmapsLoaded = true;
            window._gmapsCallbacks.forEach(cb => cb());
            window._gmapsCallbacks = [];
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps&loading=async`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    });
}

// ─── Extract a clean "City, Country" label from place details ─────────────────
function extractCityLabel(
    result: google.maps.places.PlaceResult
): string {
    const get = (type: string) =>
        result.address_components?.find(c => c.types.includes(type))?.long_name ?? '';

    const locality = get('locality');
    const adminArea1 = get('administrative_area_level_1');
    const adminArea2 = get('administrative_area_level_2');
    const country = get('country');
    const sublocality = get('sublocality_level_1');

    // Build the most meaningful label: prefer locality → admin2 → admin1
    const city = locality || adminArea2 || adminArea1 || sublocality || result.name || '';

    if (country && city && country !== city) return `${city}, ${country}`;
    if (city) return city;
    return result.formatted_address ?? '';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CityAutocomplete({
    value,
    onChange,
    placeholder = 'Search any city, village, or landmark…',
}: Props) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
    const hasGoogleKey = Boolean(apiKey && !apiKey.includes('your-google'));

    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [gmapsReady, setGmapsReady] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const svcRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const detailsSvcRef = useRef<google.maps.places.PlacesService | null>(null);
    const attrDivRef = useRef<HTMLDivElement | null>(null);

    // ── Load Google Maps script once ─────────────────────────────────────────
    useEffect(() => {
        if (!hasGoogleKey) return; // stay in fallback mode
        loadGoogleMapsScript(apiKey).then(() => {
            svcRef.current = new google.maps.places.AutocompleteService();
            // PlacesService requires a DOM element for attribution
            if (!attrDivRef.current) {
                attrDivRef.current = document.createElement('div');
                document.body.appendChild(attrDivRef.current);
            }
            detailsSvcRef.current = new google.maps.places.PlacesService(attrDivRef.current);
            setGmapsReady(true);
        });
        return () => {
            if (attrDivRef.current) attrDivRef.current.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasGoogleKey]);

    // Sync external value into local query
    useEffect(() => { setQuery(value); }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlighted >= 0 && listRef.current) {
            (listRef.current.children[highlighted] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlighted]);

    // ── Autocomplete fetch ────────────────────────────────────────────────────
    const fetchSuggestions = useCallback((q: string) => {
        const trimmed = q.trim();

        // Fallback mode: filter static list
        if (!hasGoogleKey || !gmapsReady || !svcRef.current) {
            if (trimmed.length === 0) {
                setSuggestions(FALLBACK_CITIES.slice(0, 8).map(c => ({
                    placeId: c.label,
                    mainText: c.label.split(',')[0],
                    secondaryText: c.label.split(',').slice(1).join(',').trim(),
                    fullText: c.label,
                    emoji: c.emoji,
                    isFallback: true,
                })));
            } else {
                const q = trimmed.toLowerCase();
                setSuggestions(
                    FALLBACK_CITIES
                        .filter(c => c.label.toLowerCase().includes(q))
                        .slice(0, 10)
                        .map(c => ({
                            placeId: c.label,
                            mainText: c.label.split(',')[0],
                            secondaryText: c.label.split(',').slice(1).join(',').trim(),
                            fullText: c.label,
                            emoji: c.emoji,
                            isFallback: true,
                        }))
                );
            }
            return;
        }

        if (trimmed.length === 0) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        svcRef.current.getPlacePredictions(
            {
                input: trimmed,
                types: ['(cities)'],
            },
            (predictions, status) => {
                setLoading(false);
                if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                    setSuggestions([]);
                    return;
                }
                setSuggestions(
                    predictions.slice(0, 8).map(p => ({
                        placeId: p.place_id ?? '',
                        mainText: p.structured_formatting.main_text,
                        secondaryText: p.structured_formatting.secondary_text,
                        fullText: p.description,
                    }))
                );
            }
        );
    }, [hasGoogleKey, gmapsReady]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        onChange(q);          // live update so partial input is tracked
        setOpen(true);
        setHighlighted(-1);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
    };

    // ── Resolve place details on selection ────────────────────────────────────
    const selectSuggestion = useCallback((s: Suggestion) => {
        if (s.isFallback || !detailsSvcRef.current) {
            // Fallback: just use the prepared full text
            setQuery(s.fullText);
            onChange(s.fullText);
            setOpen(false);
            setHighlighted(-1);
            return;
        }

        // Real Google Places — get detailed address components
        detailsSvcRef.current.getDetails(
            { placeId: s.placeId, fields: ['address_components', 'formatted_address', 'name'] },
            (result, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && result) {
                    const label = extractCityLabel(result);
                    setQuery(label);
                    onChange(label);
                } else {
                    // Fallback to the prediction description
                    setQuery(s.fullText);
                    onChange(s.fullText);
                }
                setOpen(false);
                setHighlighted(-1);
            }
        );
    }, [onChange]);

    const handleFocus = () => {
        setOpen(true);
        if (suggestions.length === 0) fetchSuggestions(query);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) { if (e.key === 'ArrowDown') setOpen(true); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted(h => Math.max(h - 1, 0));
        } else if (e.key === 'Enter' && highlighted >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[highlighted]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const clearInput = () => {
        setQuery('');
        onChange('');
        setSuggestions([]);
        inputRef.current?.focus();
    };

    return (
        <div className="city-ac-wrap" ref={wrapRef}>
            <div className={`city-ac-input-wrap${open ? ' city-ac-input-wrap--open' : ''}`}>
                <span className="city-ac-icon">
                    {loading ? <span className="city-ac-spinner" /> : '📍'}
                </span>
                <input
                    ref={inputRef}
                    className="city-ac-input"
                    type="text"
                    value={query}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={handleInput}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    aria-label="Destination city search"
                    aria-expanded={open}
                    aria-autocomplete="list"
                />
                {query.length > 0 && (
                    <button className="city-ac-clear" onClick={clearInput} aria-label="Clear">×</button>
                )}
                {/* Google branding requirement when API is live */}
                {hasGoogleKey && (
                    <img
                        src="https://developers.google.com/maps/documentation/images/powered_by_google_on_white.png"
                        alt="Powered by Google"
                        className="city-ac-google-badge"
                    />
                )}
            </div>

            {/* Dropdown */}
            {open && suggestions.length > 0 && (
                <ul className="city-ac-dropdown" ref={listRef} role="listbox">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.placeId + i}
                            className={`city-ac-option${i === highlighted ? ' city-ac-option--highlighted' : ''}`}
                            role="option"
                            aria-selected={i === highlighted}
                            onMouseEnter={() => setHighlighted(i)}
                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                        >
                            <span className="city-ac-opt-emoji">
                                {s.emoji ?? (s.isFallback ? '📍' : '📍')}
                            </span>
                            <span className="city-ac-opt-name">{s.mainText}</span>
                            <span className="city-ac-opt-state">{s.secondaryText}</span>
                        </li>
                    ))}

                    {/* "Powered by Google" attribution inside dropdown when real API */}
                    {hasGoogleKey && gmapsReady && (
                        <li className="city-ac-google-attr" aria-hidden="true">
                            <img
                                src="https://developers.google.com/maps/documentation/images/powered_by_google_on_white.png"
                                alt="Powered by Google"
                            />
                        </li>
                    )}
                </ul>
            )}

            {/* No results state */}
            {open && suggestions.length === 0 && query.trim().length > 2 && !loading && (
                <div className="city-ac-empty">
                    No places found for &ldquo;{query}&rdquo;
                </div>
            )}
        </div>
    );
}
