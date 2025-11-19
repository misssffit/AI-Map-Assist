import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Mic, MapPin, Clock, Star } from 'lucide-react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const exampleQueries = [
  'Тихе кафе з Wi-Fi біля центру',
  'Ресторан з живою музикою',
  'Парк для ранкової пробіжки',
  'Аптека поруч зі мною',
];

const recentSearches = [
  { id: 1, query: 'Кафе Lviv Croissants', icon: 'coffee' },
  { id: 2, query: 'Парк Стрийський', icon: 'tree' },
  { id: 3, query: 'ТРЦ King Cross', icon: 'shopping' },
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      // Simulate search delay
      setTimeout(() => {
        setIsSearching(false);
        router.push({
          pathname: '/map',
          params: { query: searchQuery }
        });
      }, 1000);
    }
  };

  const handleVoiceSearch = () => {
    // Voice search implementation would go here
    console.log('Voice search activated');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Map Assistant</Text>
        <Text style={styles.subtitle}>Знайди все, що потрібно поруч</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Опиши що шукаєш природною мовою..."
            placeholderTextColor="#C7C7CC"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handleVoiceSearch}
            activeOpacity={0.7}
          >
            <Mic size={18} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, isSearching && styles.searchButtonLoading]}
          onPress={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.searchButtonText}>
            {isSearching ? 'Шукаю...' : 'Знайти місця'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Example Queries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Приклади запитів</Text>
          {exampleQueries.map((query, index) => (
            <TouchableOpacity
              key={index}
              style={styles.exampleItem}
              onPress={() => setSearchQuery(query)}
              activeOpacity={0.6}
            >
              <MapPin size={16} color="#5AC8FA" />
              <Text style={styles.exampleText}>{query}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Searches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Останні пошуки</Text>
          {recentSearches.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentItem}
              onPress={() => setSearchQuery(item.query)}
              activeOpacity={0.6}
            >
              <Clock size={16} color="#8E8E93" />
              <Text style={styles.recentText}>{item.query}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Tips */}
        <View style={styles.aiTipsContainer}>
          <View style={styles.aiTipsHeader}>
            <Star size={18} color="#FF9500" />
            <Text style={styles.aiTipsTitle}>AI поради</Text>
          </View>
          <Text style={styles.aiTipsText}>
            Описуй свої потреби детально: "кафе з терасою для роботи" або 
            "ресторан для романтичної вечері". Чим більше деталей, тим краще результат!
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#86868B',
    fontWeight: '400',
  },
  searchSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    minHeight: 56,
  },
  searchIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
    lineHeight: 22,
    maxHeight: 88,
  },
  voiceButton: {
    marginLeft: 12,
    padding: 4,
    marginTop: -2,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  searchButtonLoading: {
    backgroundColor: '#C7C7CC',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 15,
    color: '#1D1D1F',
    marginLeft: 12,
    flex: 1,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  recentText: {
    fontSize: 15,
    color: '#1D1D1F',
    marginLeft: 12,
    flex: 1,
  },
  aiTipsContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  aiTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 8,
  },
  aiTipsText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
});