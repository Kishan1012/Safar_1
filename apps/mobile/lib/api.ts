import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async config => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync('auth_token');
            // Navigation handled by the auth guard in _layout
        }
        return Promise.reject(error);
    }
);
