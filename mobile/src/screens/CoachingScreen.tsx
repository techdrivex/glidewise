import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { CoachingTip } from '../context/AppContext';

export default function CoachingScreen() {
  const { state, dispatch } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Tips', icon: '📚' },
    { id: 'acceleration', name: 'Acceleration', icon: '🚀' },
    { id: 'braking', name: 'Braking', icon: '🛑' },
    { id: 'shifting', name: 'Shifting', icon: '⚙️' },
    { id: 'regeneration', name: 'Regeneration', icon: '🔋' },
    { id: 'general', name: 'General', icon: '💡' },
  ];

  const filteredTips = selectedCategory === 'all' 
    ? state.coachingTips 
    : state.coachingTips.filter(tip => tip.type === selectedCategory);

  const getTipIcon = (type: string): string => {
    switch (type) {
      case 'acceleration': return '🚀';
      case 'braking': return '🛑';
      case 'shifting': return '⚙️';
      case 'regeneration': return '🔋';
      default: return '💡';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9C27B0';
    }
  };

  const getPriorityText = (priority: string): string => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const markTipAsRead = (tipId: string) => {
    dispatch({ type: 'MARK_TIP_READ', payload: tipId });
  };

  const renderTipItem = ({ item }: { item: CoachingTip }) => (
    <View style={[
      styles.tipItem,
      item.isRead && styles.tipItemRead
    ]}>
      <View style={styles.tipHeader}>
        <View style={styles.tipIconContainer}>
          <Text style={styles.tipIcon}>{getTipIcon(item.type)}</Text>
        </View>
        
        <View style={styles.tipInfo}>
          <Text style={styles.tipType}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
          <Text style={styles.tipTime}>
            {item.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        
        <View style={[
          styles.priorityBadge,
          { backgroundColor: getPriorityColor(item.priority) }
        ]}>
          <Text style={styles.priorityText}>
            {getPriorityText(item.priority)}
          </Text>
        </View>
      </View>
      
      <Text style={[
        styles.tipMessage,
        item.isRead && styles.tipMessageRead
      ]}>
        {item.message}
      </Text>
      
      {!item.isRead && (
        <TouchableOpacity
          style={styles.markReadButton}
          onPress={() => markTipAsRead(item.id)}
        >
          <Text style={styles.markReadText}>Mark as Read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const getProgressStats = () => {
    const totalTips = state.coachingTips.length;
    const readTips = state.coachingTips.filter(tip => tip.isRead).length;
    const unreadTips = totalTips - readTips;
    const readPercentage = totalTips > 0 ? Math.round((readTips / totalTips) * 100) : 0;

    return {
      totalTips,
      readTips,
      unreadTips,
      readPercentage,
    };
  };

  const getCategoryStats = () => {
    const stats = categories.map(category => {
      if (category.id === 'all') return null;
      
      const count = state.coachingTips.filter(tip => tip.type === category.id).length;
      const readCount = state.coachingTips.filter(tip => tip.type === category.id && tip.isRead).length;
      
      return {
        ...category,
        count,
        readCount,
        readPercentage: count > 0 ? Math.round((readCount / count) * 100) : 0,
      };
    }).filter(Boolean);

    return stats;
  };

  const progressStats = getProgressStats();
  const categoryStats = getCategoryStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Coaching</Text>
          <Text style={styles.subtitle}>Personalized driving tips & progress</Text>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Learning Progress</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${progressStats.readPercentage}%` }
              ]} 
            />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>{progressStats.readTips}</Text>
              <Text style={styles.progressStatLabel}>Read</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>{progressStats.unreadTips}</Text>
              <Text style={styles.progressStatLabel}>Unread</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>{progressStats.readPercentage}%</Text>
              <Text style={styles.progressStatLabel}>Complete</Text>
            </View>
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.categoriesCard}>
          <Text style={styles.categoriesTitle}>Filter by Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category Progress */}
        <View style={styles.categoryProgressCard}>
          <Text style={styles.categoryProgressTitle}>Category Progress</Text>
          {categoryStats.map((category) => (
            <View key={category.id} style={styles.categoryProgressItem}>
              <View style={styles.categoryProgressHeader}>
                <Text style={styles.categoryProgressIcon}>{category.icon}</Text>
                <Text style={styles.categoryProgressName}>{category.name}</Text>
                <Text style={styles.categoryProgressCount}>
                  {category.readCount}/{category.count}
                </Text>
              </View>
              <View style={styles.categoryProgressBar}>
                <View 
                  style={[
                    styles.categoryProgressFill,
                    { width: `${category.readPercentage}%` }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>

        {/* Tips List */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Text style={styles.tipsTitle}>
              {selectedCategory === 'all' ? 'All Tips' : `${categories.find(c => c.id === selectedCategory)?.name} Tips`}
            </Text>
            <Text style={styles.tipsCount}>
              {filteredTips.length} tip{filteredTips.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          {filteredTips.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tips in this category</Text>
              <Text style={styles.emptyStateSubtext}>
                Keep driving to receive personalized coaching tips
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTips}
              renderItem={renderTipItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Learning Resources */}
        <View style={styles.resourcesCard}>
          <Text style={styles.resourcesTitle}>Learning Resources</Text>
          
          <TouchableOpacity style={styles.resourceItem}>
            <Text style={styles.resourceIcon}>📖</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Eco-Driving Guide</Text>
              <Text style={styles.resourceDescription}>
                Learn the fundamentals of fuel-efficient driving
              </Text>
            </View>
            <Text style={styles.resourceArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem}>
            <Text style={styles.resourceIcon}>🎥</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Video Tutorials</Text>
              <Text style={styles.resourceDescription}>
                Watch expert drivers demonstrate eco-driving techniques
              </Text>
            </View>
            <Text style={styles.resourceArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem}>
            <Text style={styles.resourceIcon}>🏆</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Achievement Badges</Text>
              <Text style={styles.resourceDescription}>
                Track your progress and earn driving badges
              </Text>
            </View>
            <Text style={styles.resourceArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#2C3E50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#BDC3C7',
    marginTop: 5,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingRight: 16,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minWidth: 80,
  },
  categoryButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#4CAF50',
  },
  categoryProgressCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryProgressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  categoryProgressItem: {
    marginBottom: 16,
  },
  categoryProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryProgressIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryProgressName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    flex: 1,
  },
  categoryProgressCount: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  categoryProgressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  categoryProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tipsCount: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  tipItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  tipItemRead: {
    opacity: 0.7,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipIcon: {
    fontSize: 20,
  },
  tipInfo: {
    flex: 1,
  },
  tipType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  tipTime: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tipMessage: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 12,
  },
  tipMessageRead: {
    color: '#7F8C8D',
  },
  markReadButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3498DB',
    borderRadius: 6,
  },
  markReadText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#BDC3C7',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  resourcesCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resourcesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resourceIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  resourceArrow: {
    fontSize: 18,
    color: '#7F8C8D',
    marginLeft: 8,
  },
});
