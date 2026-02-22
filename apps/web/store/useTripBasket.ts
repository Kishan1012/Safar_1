import { create } from 'zustand';

export interface BasketItem {
    id: string;
    title: string;
    type: string;
    priceINR: number;
}

interface TripBasketState {
    items: BasketItem[];
    toggleItem: (item: BasketItem) => void;
    setItems: (items: BasketItem[]) => void;
    addItem: (item: BasketItem) => void;
    getTotal: () => number;
}

export const useTripBasket = create<TripBasketState>((set, get) => ({
    items: [],
    toggleItem: (newItem) => set((state) => {
        const exists = state.items.find(i => i.id === newItem.id);
        if (exists) {
            return { items: state.items.filter(i => i.id !== newItem.id) };
        }

        // Single selection logic for Flight and Hotel
        let newItems = [...state.items];
        if (newItem.type === 'Flight' || newItem.type === 'Hotel') {
            newItems = newItems.filter(i => i.type !== newItem.type);
        }

        return { items: [...newItems, newItem] };
    }),
    setItems: (items) => set({ items }),
    addItem: (newItem) => set((state) => {
        const exists = state.items.find(i => i.id === newItem.id);
        if (!exists) {
            let newItems = [...state.items];
            if (newItem.type === 'Flight' || newItem.type === 'Hotel') {
                newItems = newItems.filter(i => i.type !== newItem.type);
            }
            return { items: [...newItems, newItem] };
        }
        return state;
    }),
    getTotal: () => get().items.reduce((sum, item) => sum + item.priceINR, 0),
}));
