import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#13131a',
                    borderTopColor: 'rgba(255,255,255,0.08)',
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 70,
                },
                tabBarActiveTintColor: '#7c5cfc',
                tabBarInactiveTintColor: '#8888aa',
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text>,
                }}
            />
            <Tabs.Screen
                name="collections"
                options={{
                    title: 'Collections',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📚</Text>,
                }}
            />
            <Tabs.Screen
                name="itineraries"
                options={{
                    title: 'Trips',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✈️</Text>,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
                }}
            />
        </Tabs>
    );
}
