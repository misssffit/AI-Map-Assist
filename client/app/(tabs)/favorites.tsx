import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Star, MapPin, Clock } from 'lucide-react-native';

const favoritePlaces = [
  {
    id: 1,
    name: 'Кафе Lviv Croissants',
    rating: 4.8,
    distance: '0.2 км',
    category: 'Кафе',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
    savedDate: '2 дні тому',
  },
  {
    id: 2,
    name: 'Парк Стрийський',
    rating: 4.9,
    distance: '1.2 км',
    category: 'Парк',
    image: 'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=400',
    savedDate: '1 тиждень тому',
  },
  {
    id: 3,
    name: 'Ресторан Bernardo',
    rating: 4.6,
    distance: '0.5 км',
    category: 'Ресторан',
    image: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=400',
    savedDate: '2 тижні тому',
  },
];

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState(favoritePlaces);

  const removeFavorite = (placeId) => {
    setFavorites(prev => prev.filter(place => place.id !== placeId));
  };

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        <View style={styles.header}>
          <Text style={styles.title}>Обрані місця</Text>
        </View>

        <View style={styles.emptyContainer}>
          <Heart size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>Немає обраних місць</Text>
          <Text style={styles.emptySubtitle}>
            Додавайте місця до обраних під час пошуку, щоб швидко знаходити їх тут
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Обрані місця</Text>
        <Text style={styles.subtitle}>{favorites.length} збережених місць</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {favorites.map((place) => (
          <View key={place.id} style={styles.favoriteCard}>
            <Image source={{ uri: place.image }} style={styles.placeImage} />
            
            <View style={styles.placeInfo}>
              <View style={styles.placeHeader}>
                <Text style={styles.placeName}>{place.name}</Text>
                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={() => removeFavorite(place.id)}
                  activeOpacity={0.7}
                >
                  <Heart size={20} color="#FF3B30" fill="#FF3B30" />
                </TouchableOpacity>
              </View>

              <Text style={styles.placeCategory}>{place.category}</Text>

              <View style={styles.placeDetails}>
                <View style={styles.detailItem}>
                  <Star size={14} color="#FF9500" fill="#FF9500" />
                  <Text style={styles.detailText}>{place.rating}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <MapPin size={14} color="#8E8E93" />
                  <Text style={styles.detailText}>{place.distance}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Clock size={14} color="#8E8E93" />
                  <Text style={styles.detailText}>{place.savedDate}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>💡 Корисна порада</Text>
          <Text style={styles.tipText}>
            Використовуйте обрані місця для швидкого доступу до улюблених кафе, 
            ресторанів та інших локацій, які ви часто відвідуєте.
          </Text>
        </View>
      </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  placeImage: {
    width: 100,
    height: 100,
  },
  placeInfo: {
    flex: 1,
    padding: 16,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
    marginRight: 12,
  },
  heartButton: {
    padding: 4,
  },
  placeCategory: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 12,
  },
  placeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  tipContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
});