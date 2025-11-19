import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  MapPin,
  Star,
  Navigation,
  Phone,
  Clock,
  ExternalLink,
} from 'lucide-react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
const { width, height } = Dimensions.get('window');
import { analyzeQuery, rankPlacesByRelevance } from "../../assets/lib/ai";
const BACKEND_URL = "https://ai-map-assist-1.onrender.com";

type Place = {
  id: number;
  name: string;
  rating: number;
  distance: string;
  address: string;
  category: string;
  openNow: boolean;
  image: string;
  description: string;
  phone: string;
  workingHours: string;
  latitude: number;
  longitude: number;
};

/*const mockPlaces: Place[] = [
  {
    id: 1,
    name: 'Кафе Lviv Croissants',
    rating: 4.8,
    distance: '0.2 км',
    address: 'вул. Городоцька, 42',
    category: 'Кафе',
    openNow: true,
    image:
      'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Затишне кафе з найкращими круасанами у місті',
    phone: '+380 67 123 45 67',
    workingHours: '07:00 – 22:00',
    latitude: 49.8411,
    longitude: 24.0315,
  },
  {
    id: 2,
    name: 'Ресторан Bernardo',
    rating: 4.6,
    distance: '0.5 км',
    address: 'пл. Ринок, 14',
    category: 'Ресторан',
    openNow: true,
    image:
      'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Елегантний ресторан європейської кухні',
    phone: '+380 67 234 56 78',
    workingHours: '12:00 – 24:00',
    latitude: 49.8418,
    longitude: 24.0305,
  },
  {
    id: 3,
    name: 'Парк Стрийський',
    rating: 4.9,
    distance: '1.2 км',
    address: 'вул. Паркова, 1',
    category: 'Парк',
    openNow: true,
    image:
      'https://images.pexels.com/photos/1309763/pexels-photo-1309763.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Великий зелений парк для прогулянок',
    phone: '',
    workingHours: 'Цілодобово',
    latitude: 49.8236,
    longitude: 24.0236,
  },
];*/

export default function MapScreen() {
  const params = useLocalSearchParams();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const searchQuery = params.query as string;
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const [aiCategory, setAiCategory] = useState<string | null>(null);
  const [aiKeywords, setAiKeywords] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Пошук…");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (!userLocation || !searchQuery.trim()) return;

    (async () => {
      try {
        setLoading(true);
        setLoadingText("Аналізуємо запит користувача за допомогою ШІ…");
        // 1) Отримуємо інтерпретацію запиту від ШІ
        const { category, keywords } = await analyzeQuery(searchQuery);
        
        const categoryWords: Record<string, string[]> = {
          "catering.cafe": ["кафе", "кав'ярня", "coffee shop"],
          "catering.cafe.coffee_shop": ["кав'ярня", "coffee shop"],
          "catering.restaurant": ["ресторан"],
          "catering.restaurant.pizza": ["піцерія", "pizza restaurant"],
          "catering.bar": ["бар", "pub"],
          "catering.pub": ["паб", "бар"],
          "catering.fast_food": ["фастфуд", "fast food"],
          "park": ["парк"],
          "entertainment.cinema": ["кінотеатр", "cinema"],
        };
        

        setAiCategory(category);
        setAiKeywords(keywords);

        const geoCategory = categoryWords[category.toLowerCase()] || 'catering.cafe';

        setLoadingText("Отримуємо місця з Geoapify…");

        // 2) Викликаємо Geoapify по опису
      const res = await fetch(`${BACKEND_URL}/maps/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userLocation.lat,
          lon: userLocation.lon,
          category: geoCategory,
        }),
      });

        const data = await res.json();
        console.log('Raw Geoapify response:', data);
        // 3) Перетворюємо дані на наш формат
        if (!data.features || !Array.isArray(data.features)) {
          setPlaces([]);
          setLoading(false);
          return;
        }

        setLoadingText("Аналізуємо результати ШІ…");

        const parsed = data.features.map((item: any) => ({
          id: item.properties.place_id,
          name: item.properties.name || 'Unknown name',
          address: item.properties.formatted || '',
          category: item.properties.categories?.[0] || 'Unknown',
          openNow: item.properties.open_now ?? false,
          rating: item.properties.rating || 4.3,
          distance: '—',
          description: item.properties.datasource?.raw?.description || '',
          image: item.properties.datasource?.raw?.photo || '',
          workingHours: item.properties.datasource?.raw?.opening_hours || '',
          latitude: item.geometry.coordinates[1],
          longitude: item.geometry.coordinates[0],
        }));

        const enriched = await Promise.all(parsed.map(async (p) => {
          const categoryHints = categoryWords[p.category] || [];
          const googlePhoto = await fetch(`${BACKEND_URL}/maps/photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: p.name,
              lat: p.latitude,
              lon: p.longitude,
              categoryHints
            })
          }).then(r => r.json());

          return {
            ...p,
            image: googlePhoto || "",
          };
}));

        let rankedPlaces = enriched;
        if (keywords.length > 0) {
          rankedPlaces = await rankPlacesByRelevance(enriched, keywords);
        }

        console.log('Ranked places:', rankedPlaces);
        setPlaces(rankedPlaces);
      } catch (err) {
        console.log('AI/Geoapify Error:', err);
      }finally {
      setLoading(false);
      setLoadingText("Пошук…");}
    })();
  }, [searchQuery, userLocation]);

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    router.push({
      pathname: '/place-detail',
      params: { placeId: place.id },
    });
  };
  const centerOnUser = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Дозвіл на доступ до геолокації відхилено');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Результати пошуку</Text>
        {searchQuery && <Text style={styles.searchQuery}>"{searchQuery}"</Text>}
        {/* 🔵 Show AI understanding */}
        {aiCategory && (
          <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>
            Категорія: {aiCategory} | Ключові слова: {aiKeywords.join(', ')}
          </Text>
        )}
      </View>

      {/* MAP (Geoapify tiles + user location) */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          showsUserLocation
          showsCompass
          initialRegion={{
            latitude: 49.8397, // Львів як старт
            longitude: 24.0297,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Geoapify tile layer */}
          <UrlTile
             urlTemplate={`${BACKEND_URL}/maps/tiles/osm-carto/{z}/{x}/{y}.png`}
             maximumZ={20}
             zIndex={0}
          />

          {/* Маркери із твоїх places (тимчасово координати за id) */}
          {(!places || places.length === 0) && (
            <Text
              style={{
                fontSize: 16,
                color: 'red',
                position: 'absolute',
                top: 20,
              }}
            >
              Немає результатів для відображення
            </Text>
          )}

          {places?.map((place, i) => {
            console.log('Рендер маркера:', place);
            return (
              <Marker
                key={i}
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={place.name}
              />
            );
          })}
        </MapView>

        {/* Кнопка центрування на поточній локації */}
        <TouchableOpacity
          style={styles.locationButton}
          activeOpacity={0.8}
          onPress={centerOnUser}
        >
          <Navigation size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Results List */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Знайдені місця</Text>

        <ScrollView
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {places.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.placeCard}
              onPress={() => handlePlaceSelect(place)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: place.image }} style={styles.placeImage} />

              <View style={styles.placeInfo}>
                <View style={styles.placeHeader}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Star size={14} color="#FF9500" fill="#FF9500" />
                    <Text style={styles.rating}>{place.rating}</Text>
                  </View>
                </View>

                <Text style={styles.placeCategory}>{place.category}</Text>
                <Text style={styles.placeDescription}>{place.description}</Text>

                <View style={styles.placeDetails}>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color="#8E8E93" />
                    <Text style={styles.detailText}>{place.distance}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Clock
                      size={14}
                      color={place.openNow ? '#34C759' : '#FF3B30'}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: place.openNow ? '#34C759' : '#FF3B30' },
                      ]}
                    >
                      {place.openNow ? 'Відкрито' : 'Зачинено'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.directionsButton}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={16} color="#007AFF" />
                  <Text style={styles.directionsText}>
                    Відкрити в Google Maps
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <Text style={styles.loadingSpinner}>🔄</Text>
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  searchQuery: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  mapContainer: {
    height: height * 0.35,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 12,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  resultsContainer: {
    flex: 1,
    paddingTop: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  placeImage: {
    width: '100%',
    height: 120,
  },
  placeInfo: {
    padding: 16,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 4,
  },
  placeCategory: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 6,
  },
  placeDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  placeDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    fontWeight: '500',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  directionsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },

  loadingOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255,255,255,0.85)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 100,
},

loadingBox: {
  backgroundColor: "#fff",
  padding: 20,
  borderRadius: 16,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 10,
  alignItems: "center",
  width: "80%",
},

loadingSpinner: {
  fontSize: 32,
  marginBottom: 10,
},

loadingText: {
  fontSize: 16,
  color: "#333",
  textAlign: "center",
},
});
