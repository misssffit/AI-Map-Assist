import { Tabs } from 'expo-router';
import { Search, Map, Heart } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          height: 85,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Пошук',
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Карта',
          tabBarIcon: ({ size, color }) => (
            <Map size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Обране',
          tabBarIcon: ({ size, color }) => (
            <Heart size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}