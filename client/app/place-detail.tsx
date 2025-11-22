import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Share,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams();

  // 🟢 Отримуємо place з карти (прийшов як JSON-рядок з MapScreen)
  const place = params.place ? JSON.parse(params.place as string) : null;

  const [isFavorite, setIsFavorite] = useState(false);

  if (!place) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Місце не знайдено</Text>
      </SafeAreaView>
    );
  }

  const handleCall = () => {
    if (place.phone) Linking.openURL(`tel:${place.phone}`);
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      place.address
    )}`;
    Linking.openURL(url);
  };

  const handleShare = () => {
    // Тут можна додати реальний Share API
    console.log("Share:", place.name);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ------- HEADER ------- */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Share size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Heart
              size={22}
              color={isFavorite ? "#FF3B30" : "#fff"}
              fill={isFavorite ? "#FF3B30" : "transparent"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ------- MAIN PHOTO ------- */}
        {!!place.image && (
          <Image source={{ uri: place.image }} style={styles.mainImage} />
        )}

        {/* ------- INFO BLOCK ------- */}
        <View style={styles.infoBlock}>
          <Text style={styles.placeName}>{place.name}</Text>

          <Text style={styles.category}>{place.category}</Text>

          <View style={styles.ratingRow}>
            <Star size={18} fill="#FF9500" color="#FF9500" />
            <Text style={styles.ratingText}>
              {place.rating ? place.rating.toFixed(1) : "—"}
            </Text>
          </View>

          {/* ОПИС від AI */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Опис</Text>
            <Text style={styles.description}>
              {place.aiDescription || "Опис відсутній"}
            </Text>
          </View>

          {/* CONTACTS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Контакти</Text>

            <View style={styles.contactItem}>
              <MapPin size={18} color="#8E8E93" />
              <Text style={styles.contactText}>{place.address}</Text>
            </View>

            {place.phone && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={handleCall}
              >
                <Phone size={18} color="#007AFF" />
                <Text style={[styles.contactText, { color: "#007AFF" }]}>
                  {place.phone}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.contactItem}>
              <Clock size={18} color={place.openNow ? "#34C759" : "#FF3B30"} />
              <Text
                style={[
                  styles.contactText,
                  { color: place.openNow ? "#34C759" : "#FF3B30" },
                ]}
              >
                {place.openNow ? "Відкрито" : "Зачинено"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ------- BOTTOM BUTTONS ------- */}
      <View style={styles.bottomActions}>
        {place.phone && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Phone size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Подзвонити</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleNavigate}
          activeOpacity={0.8}
        >
          <Navigation size={20} color="#fff" />
          <Text style={[styles.actionButtonText, { color: "#fff" }]}>
            Маршрут
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 10, // ⬅️ тут виправили undefined
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },
  headerActions: { flexDirection: "row", gap: 10 },

  mainImage: {
    width: width,
    height: height * 0.35,
  },

  infoBlock: {
    backgroundColor: "#fff",
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: height * 0.5,
  },

  placeName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1D1D1F",
  },

  category: {
    fontSize: 16,
    color: "#007AFF",
    marginTop: 4,
    marginBottom: 10,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
  },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#444",
    lineHeight: 22,
  },

  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  contactText: {
    marginLeft: 10,
    fontSize: 16,
  },

  bottomActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
});
