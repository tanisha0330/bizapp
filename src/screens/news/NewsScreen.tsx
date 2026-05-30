import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Linking,
    RefreshControl,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, FontSize, Radius, Shadow, useColors } from '../../utils/theme';
import { useFlatListScrollToTopOnFocus } from '../../utils/useScrollToTopOnFocus';
import { api, API_BASE } from '../../services/api';

interface NewsArticle {
    title: string;
    description: string;
    url: string;
    image?: string;
    source: string;
    publishedAt: string;
    category: string;
}

const CATEGORIES = [
    { id: 'all', label: 'All', icon: 'flash-outline' },
    { id: 'marketing', label: 'Marketing', icon: 'megaphone-outline' },
    { id: 'ai', label: 'AI & Tech', icon: 'hardware-chip-outline' },
    { id: 'business', label: 'Business', icon: 'trending-up-outline' },
];

const NewsCard = ({ article, C }: { article: NewsArticle; C: any }) => {
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return days === 1 ? 'Yesterday' : `${days}d ago`;
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}
            onPress={() => { api.trackEvent('news_opened'); Linking.openURL(article.url); }}
            activeOpacity={0.7}
        >
            {article.image ? (
                <Image source={{ uri: article.image }} style={styles.cardImage} />
            ) : null}
            <View style={styles.cardContent}>
                <View style={styles.cardMeta}>
                    <Text style={[styles.cardSource, { color: C.brand }]}>{article.source}</Text>
                    <Text style={[styles.cardTime, { color: C.textTertiary }]}>{timeAgo(article.publishedAt)}</Text>
                </View>
                <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={3}>{article.title}</Text>
                {article.description ? (
                    <Text style={[styles.cardDesc, { color: C.textSecondary }]} numberOfLines={2}>{article.description}</Text>
                ) : null}
                <View style={styles.cardFooter}>
                    <View style={[styles.categoryBadge, { backgroundColor: C.brandBg }]}>
                        <Text style={[styles.categoryText, { color: C.brand }]}>{article.category}</Text>
                    </View>
                    <Ionicons name="open-outline" size={14} color={C.textTertiary} />
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const NewsScreen = () => {
    const C = useColors();
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const newsListRef = useFlatListScrollToTopOnFocus();

    const fetchNews = useCallback(async () => {
        try {
            // Fetch from backend (cached, 30 min TTL)
            const res = await fetch(`${API_BASE}/news`);
            const data = await res.json() as any;
            if (data.articles) {
                setArticles(data.articles);
            }
        } catch (e) {
            console.error('News fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchNews(); }, [fetchNews]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNews();
    };

    const filteredArticles = selectedCategory === 'all'
        ? articles
        : articles.filter(a => a.category.toLowerCase().includes(selectedCategory));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: C.surface }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: C.borderLight }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: C.text }]}>Latest News</Text>
                    <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>Stay updated with trends</Text>
                </View>
                <TouchableOpacity onPress={onRefresh} style={[styles.refreshBtn, { backgroundColor: C.surfaceSecondary }]}>
                    <Ionicons name="refresh-outline" size={20} color={C.text} />
                </TouchableOpacity>
            </View>

            {/* Category Tabs */}
            <View style={styles.categoryRow}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={CATEGORIES}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setSelectedCategory(item.id)}
                            style={[
                                styles.categoryChip,
                                { backgroundColor: C.surfaceSecondary },
                                selectedCategory === item.id && { backgroundColor: C.brand },
                            ]}
                        >
                            <Ionicons
                                name={item.icon as any}
                                size={14}
                                color={selectedCategory === item.id ? '#FFF' : C.textSecondary}
                            />
                            <Text style={[
                                styles.categoryChipText,
                                { color: C.textSecondary },
                                selectedCategory === item.id && { color: '#FFF' },
                            ]}>{item.label}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Articles */}
            {loading ? (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={C.brand} />
                    <Text style={[styles.loadingText, { color: C.textTertiary }]}>Fetching latest news...</Text>
                </View>
            ) : (
                <FlatList
                    ref={newsListRef}
                    data={filteredArticles}
                    keyExtractor={(item, i) => `${item.url}-${i}`}
                    renderItem={({ item }) => <NewsCard article={item} C={C} />}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    style={{ backgroundColor: C.background }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="newspaper-outline" size={48} color={C.textTertiary} />
                            <Text style={[styles.emptyTitle, { color: C.text }]}>No articles found</Text>
                            <Text style={[styles.emptySubtitle, { color: C.textTertiary }]}>Pull down to refresh</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 22, paddingTop: 4, paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 18, letterSpacing: -0.3 },
    headerSubtitle: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
    refreshBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    categoryRow: { paddingVertical: 12 },
    categoryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    },
    categoryChipText: { fontFamily: Fonts.semiBold, fontSize: 12 },
    card: {
        borderRadius: Radius.lg, marginBottom: 14, borderWidth: 1,
        overflow: 'hidden', ...Shadow.sm,
    },
    cardImage: { width: '100%', height: 160, resizeMode: 'cover' },
    cardImagePlaceholder: {
        width: '100%', height: 100, alignItems: 'center', justifyContent: 'center',
    },
    cardContent: { padding: 14 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardSource: { fontFamily: Fonts.semiBold, fontSize: 11 },
    cardTime: { fontFamily: Fonts.regular, fontSize: 11 },
    cardTitle: { fontFamily: Fonts.bold, fontSize: 15, lineHeight: 21, marginBottom: 4 },
    cardDesc: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, marginBottom: 8 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    categoryText: { fontFamily: Fonts.semiBold, fontSize: 10 },
    loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontFamily: Fonts.regular, fontSize: 14, marginTop: 12 },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.lg, marginTop: 16, marginBottom: 6 },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.sm },
});
