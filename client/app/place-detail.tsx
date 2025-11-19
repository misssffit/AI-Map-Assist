import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  ArrowLeft, 
  Heart, 
  Star, 
  MapPin, 
  Phone, 
  Clock, 
  ExternalLink,
  Navigation,
  Share,
  Wifi,
  Car,
  CreditCard
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const placeDetails = {
  1: {
    id: 1,
    name: 'Кафе Lviv Croissants',
    rating: 4.8,
    reviewCount: 124,
    distance: '0.2 км',
    address: 'вул. Городоцька, 42, Львів',
    category: 'Кафе',
    openNow: true,
    images: [
      'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1833586/pexels-photo-1833586.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'Затишне кафе з найкращими круасанами у місті. Ідеальне місце для сніданку або роботи з ноутбуком. Свіжа випічка щодня, ароматна кава та дружня атмосфера.',
    phone: '+380 67 123 45 67',
    workingHours: {
      current: 'Відкрито до 22:00',
      schedule: [
        'Пн-Пт: 07:00 - 22:00',
        'Сб-Нд: 08:00 - 23:00'
      ]
    },
    features: ['WiFi', 'Картковий розрахунок', 'Паркування', 'Тераса'],
    priceLevel: '$$',
    averageCheck: '80-150 грн'
  }
};

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams();
  const placeId = parseInt(params.placeId as string);
  const place = placeDetails[placeId];
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!place) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Місце не знайдено</Text>
      </SafeAreaView>
    );
  }

  const handleCall = () => {
    if (place.phone) {
      Linking.openURL(`tel:${place.phone}`);
    }
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
    Linking.openURL(url);
  };

  const handleShare = () => {
    // Share implementation
    console.log('Share place:', place.name);
  };

  const getFeatureIcon = (feature) => {
    switch (feature.toLowerCase()) {
      case 'wifi':
        return <Wifi size={16} color="#34C759" />;
      case 'картковий розрахунок':
        return <CreditCard size={16} color="#34C759" />;
      case 'паркування':
        return <Car size={16} color="#34C759" />;
      default:
        return <MapPin size={16} color="#34C759" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share size={22} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.8}
          >
            <Heart 
              size={22} 
              color={isFavorite ? "#FF3B30" : "#FFFFFF"}
              fill={isFavorite ? "#FF3B30" : "transparent"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
          >
            {place.images.map((image, index) => (
              <Image key={index} source={{ uri: image }} style={styles.placeImage} />
            ))}
          </ScrollView>
          
          {/* Image Indicators */}
          <View style={styles.imageIndicators}>
            {place.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.activeIndicator
                ]}
              />
            ))}
          </View>
        </View>

        {/* Place Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleSection}>
            <Text style={styles.placeName}>{place.name}</Text>
            <Text style={styles.placeCategory}>{place.category}</Text>
            
            <View style={styles.ratingSection}>
              <View style={styles.ratingContainer}>
                <Star size={16} color="#FF9500" fill="#FF9500" />
                <Text style={styles.rating}>{place.rating}</Text>
                <Text style={styles.reviewCount}>({place.reviewCount} відгуків)</Text>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceLevel}>{place.priceLevel}</Text>
                <Text style={styles.averageCheck}>{place.averageCheck}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Опис</Text>
            <Text style={styles.description}>{place.description}</Text>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Особливості</Text>
            <View style={styles.featuresContainer}>
              {place.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  {getFeatureIcon(feature)}
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Контакти та розклад</Text>
            
            <View style={styles.contactItem}>
              <MapPin size={18} color="#8E8E93" />
              <Text style={styles.contactText}>{place.address}</Text>
            </View>
            
            {place.phone && (
              <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
                <Phone size={18} color="#007AFF" />
                <Text style={[styles.contactText, styles.phoneText]}>{place.phone}</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.contactItem}>
              <Clock size={18} color={place.openNow ? "#34C759" : "#FF3B30"} />
              <View style={styles.hoursContainer}>
                <Text style={[
                  styles.contactText,
                  { color: place.openNow ? "#34C759" : "#FF3B30" }
                ]}>
                  {place.workingHours.current}
                </Text>
                {place.workingHours.schedule.map((hours, index) => (
                  <Text key={index} style={styles.scheduleText}>{hours}</Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <Phone size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Зателефонувати</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={handleNavigate}
          activeOpacity={0.8}
        >
          <Navigation size={20} color="#FFFFFF" />
          <Text style={[styles.actionButtonText, styles.primaryActionText]}>Маршрут</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: StatusBar.currentHeight + 16,
    paddingBottom: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  placeImage: {
    width: width,
    height: height * 0.4,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeIndicator: {
    backgroundColor: '#FFFFFF',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 24,
    minHeight: height * 0.6,
  },
  titleSection: {
    marginBottom: 24,
  },
  placeName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 6,
  },
  placeCategory: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 12,
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 6,
  },
  reviewCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLevel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
  averageCheck: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#1D1D1F',
    marginLeft: 6,
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#1D1D1F',
    marginLeft: 12,
    flex: 1,
  },
  phoneText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  hoursContainer: {
    flex: 1,
    marginLeft: 12,
  },
  scheduleText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  primaryActionButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
});