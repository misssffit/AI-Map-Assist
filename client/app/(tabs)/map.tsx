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
  Clock,
  ExternalLink,
} from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
const { height } = Dimensions.get('window');

import { analyzeQuery, rankPlacesByRelevance } from '../../assets/lib/ai';

const BACKEND_URL = 'https://ai-map-assist-1.onrender.com';

type Place = {
  id: string;
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

export default function MapScreen() {
  const params = useLocalSearchParams();
  const searchQuery = (params.query as string) || '';

  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const [aiCategory, setAiCategory] = useState<string | null>(null); // опціонально
  const [aiKeywords, setAiKeywords] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Пошук…');

  // ─── 1. Отримуємо поточну локацію користувача ───────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    })();
  }, []);

  // ─── 2. Коли є локація + запит → виконуємо AI-аналіз і пошук ─────────
  useEffect(() => {
    if (!userLocation || !searchQuery.trim()) return;

    (async () => {
      try {
        setLoading(true);
        setLoadingText('Аналізуємо запит користувача за допомогою ШІ…');

        // 2.1. Аналізуємо запит через Gemini
        const aiResult = await analyzeQuery(searchQuery);
        const category = aiResult.category || null;
        const keywords: string[] = aiResult.keywords || [];

        setAiCategory(category);
        setAiKeywords(keywords);

        // 2.2. Шукаємо місця через Google Places (бекенд /places/search)
        setLoadingText('Шукаємо місця через Google Places…');

        const placesRes = await fetch(`${BACKEND_URL}/places/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: userLocation.lat,
            lon: userLocation.lon,
            keyword: searchQuery,
          }),
        });

        const rawPlaces = await placesRes.json();
        console.log('Raw Google Places response:', rawPlaces);

        if (!Array.isArray(rawPlaces) || rawPlaces.length === 0) {
          setPlaces([]);
          setLoading(false);
          return;
        }

        // 2.3. Перетворюємо Google Places → наш тип Place
        setLoadingText('Готуємо результати…');

        const parsed: Place[] = await Promise.all(
          rawPlaces.map(async (p: any) => {
            let imageUrl = '';

            // Фото через бекенд /places/photo (photo_reference → URL)
            if (p.photos && p.photos[0]?.photo_reference) {
              try {
                const photoRes = await fetch(`${BACKEND_URL}/places/photo`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    photoReference: p.photos[0].photo_reference,
                  }),
                });
                const photoData = await photoRes.json();
                if (photoData?.url) {
                  imageUrl = photoData.url;
                }
              } catch (e) {
                console.log('Фото не завантажилось:', e);
              }
            }

            return {
              id: p.place_id,
              name: p.name || 'Невідомий заклад',
              rating: typeof p.rating === 'number' ? p.rating : 4.3,
              distance: '—',
              address: p.vicinity || '',
              category: Array.isArray(p.types) && p.types.length > 0 ? p.types[0] : 'place',
              openNow: p.opening_hours?.open_now ?? false,
              image: imageUrl,
              description: '', // детальний опис краще генерувати на екрані деталізації
              phone: '',
              workingHours: '',
              latitude: p.geometry?.location?.lat ?? userLocation.lat,
              longitude: p.geometry?.location?.lng ?? userLocation.lon,
            };
          })
        );

        // 2.4. AI-ранжування результатів за ключовими словами
        let rankedPlaces = parsed;

        if (aiKeywords.length > 0) {
          setLoadingText('Ранжуємо результати за допомогою ШІ…');
          try {
            const ranked = await rankPlacesByRelevance(parsed, aiKeywords);
            if (Array.isArray(ranked) && ranked.length > 0) {
              rankedPlaces = ranked;
            } else {
              console.log('⚠️ rankPlacesByRelevance повернув некоректні дані:', ranked);
            }
          } catch (e) {
            console.log('⚠️ Помилка при ранжуванні:', e);
          }
        }

        console.log('Ranked places:', rankedPlaces);
        setPlaces(rankedPlaces);
      } catch (err) {
        console.log('AI/Google Places Error:', err);
        setPlaces([]);
      } finally {
        setLoading(false);
        setLoadingText('Пошук…');
      }
    })();
  }, [searchQuery, userLocation]);

  // ─── 3. Обробка натиску на заклад ────────────────────────────────────
  const handlePlaceSelect = async (place: Place) => {
    setLoading(true);
    setLoadingText("Завантажуємо деталі місця…");

    const fullPlace = await fetchPlaceDetails(place);

    setLoading(false);

    router.push({
      pathname: '/place-detail',
      params: { place: JSON.stringify(fullPlace) },
    });
  };

  const fetchPlaceDetails = async (place: Place) => {
  try {
    // 1. Google Details
    const detailsRes = await fetch(`${BACKEND_URL}/places/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: place.id })
    });

    const details = await detailsRes.json();

    // 2. AI-опис
    const aiRes = await fetch(`${BACKEND_URL}/ai/describePlace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: details.name,
        address: details.formatted_address,
        rating: details.rating,
        keywords: aiKeywords,
        placeDetails: details
      })
    });

    const aiData = await aiRes.json();

    // 3. Повертаємо готовий об’єкт
    return {
      ...place,
      description: aiData.description || "Опис недоступний",
      phone: details.formatted_phone_number || "",
      workingHours: details.opening_hours?.weekday_text || [],
      address: details.formatted_address || place.address,
      image: place.image,
    };

      } catch (e) {
        console.log("❌ Error loading details:", e);
        return {
          ...place,
          description: "Опис тимчасово недоступний",
        };
      }
    };

  // ─── 4. Центрування карти на користувачі ─────────────────────────────
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

  // ─── 5. UI ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Результати пошуку</Text>
        {searchQuery && <Text style={styles.searchQuery}>"{searchQuery}"</Text>}

        {(aiCategory || aiKeywords.length > 0) && (
          <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>
            {aiCategory ? `Категорія: ${aiCategory} | ` : ''}
            Ключові слова: {aiKeywords.join(', ')}
          </Text>
        )}
      </View>

      {/* MAP */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          showsUserLocation
          showsCompass
          initialRegion={{
            latitude: userLocation?.lat ?? 49.8397,
            longitude: userLocation?.lon ?? 24.0297,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {places.map((place, i) => (
            <Marker
              key={place.id || i.toString()}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              title={place.name}
            />
          ))}
        </MapView>

        {/* Кнопка центрування */}
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
              {!!place.image && (
                <Image source={{ uri: place.image }} style={styles.placeImage} />
              )}

              <View style={styles.placeInfo}>
                <View style={styles.placeHeader}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Star size={14} color="#FF9500" fill="#FF9500" />
                    <Text style={styles.rating}>{place.rating.toFixed(1)}</Text>
                  </View>
                </View>

                <Text style={styles.placeCategory}>{place.category}</Text>
                <Text style={styles.placeDescription}>{place.address}</Text>

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

                <TouchableOpacity style={styles.directionsButton} activeOpacity={0.8}>
                  <ExternalLink size={16} color="#007AFF" />
                  <Text style={styles.directionsText}>Відкрити в Google Maps</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {places.length === 0 && !loading && (
            <Text style={{ textAlign: 'center', color: '#8E8E93', marginTop: 16 }}>
              Немає результатів для відображення
            </Text>
          )}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  loadingSpinner: {
    fontSize: 32,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});
