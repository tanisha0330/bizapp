import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Dimensions,
    Animated,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';

const { width, height } = Dimensions.get('window');

interface LeadItem {
    id: string;
    name: string;
    phone: string;
    status: 'New Lead' | 'Interested' | 'In-Progress';
    avatar: string;
}

const mockLeads: LeadItem[] = [
    { id: '1', name: 'Ankit Sharma', phone: '+91 94200 94200', status: 'New Lead', avatar: '👨‍💼' },
    { id: '2', name: 'Jay Patel', phone: '+91 99900 99900', status: 'Interested', avatar: '👨' },
    { id: '3', name: 'Pooja Trivedi', phone: '+91 87800 87800', status: 'In-Progress', avatar: '👩' },
];

const SLIDES = [
    {
        id: '1',
        title: 'AI Powered Ad Publishing',
        description: 'Easily publish highly targeted digital ads that reach the right people and grow your business',
        type: 'ads' as const,
    },
    {
        id: '2',
        title: 'Free Social Media Posts',
        description: 'Get unlimited free festival and business posts with AI generated captions and hashtags',
        type: 'social' as const,
    },
    {
        id: '3',
        title: 'In-App Free CRM',
        description: 'Track all your leads and connect with them in seconds for faster conversions',
        type: 'crm' as const,
    },
];

// Phone Mockup for Ads Screen
const AdsMockup = () => (
    <View className="flex-1 items-center justify-center pt-8">
        {/* Person with phone */}
        <View className="items-center relative">
            {/* Social Icons floating around */}
            <View className="absolute -top-4 -left-8">
                <View className="w-12 h-12 bg-[#1877F2] rounded-full items-center justify-center shadow-lg">
                    <Ionicons name="logo-facebook" size={24} color="white" />
                </View>
            </View>
            <View className="absolute -top-8 right-0">
                <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-lg">
                    <Text style={{ fontSize: 18 }}>G</Text>
                </View>
            </View>
            <View className="absolute top-16 -right-10">
                <View className="w-11 h-11 bg-[#0A66C2] rounded-full items-center justify-center shadow-lg">
                    <Ionicons name="logo-linkedin" size={20} color="white" />
                </View>
            </View>
            <View className="absolute top-4 -left-14">
                <View className="w-10 h-10 bg-[#FF0000] rounded-full items-center justify-center shadow-lg">
                    <Ionicons name="logo-youtube" size={18} color="white" />
                </View>
            </View>
            <View className="absolute bottom-24 -right-12">
                <View className="w-10 h-10 bg-[#1DA1F2] rounded-full items-center justify-center shadow-lg">
                    <Ionicons name="logo-twitter" size={18} color="white" />
                </View>
            </View>
            <View className="absolute bottom-16 -left-12">
                <View className="w-10 h-10 bg-[#25D366] rounded-full items-center justify-center shadow-lg">
                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                </View>
            </View>
            <View className="absolute bottom-0 -right-8">
                <LinearGradient
                    colors={['#833AB4', '#FD1D1D', '#F77737']}
                    className="w-11 h-11 rounded-full items-center justify-center"
                >
                    <Ionicons name="logo-instagram" size={22} color="white" />
                </LinearGradient>
            </View>

            {/* Center Person Avatar */}
            <View
                className="w-44 h-44 rounded-full overflow-hidden"
                style={{
                    backgroundColor: '#E8F4FD',
                }}
            >
                <View className="flex-1 items-center justify-center">
                    <Text style={{ fontSize: 80 }}>👨‍💻</Text>
                </View>
            </View>

            {/* Digital Partner Card */}
            <View
                className="bg-white rounded-2xl px-4 py-3 mt-4 flex-row items-center"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 8,
                }}
            >
                <Text className="text-gray-800 text-[14px] font-medium mr-2">Your Digital Growth Partner</Text>
                <Text style={{ fontSize: 16 }}>🤖</Text>
            </View>
        </View>
    </View>
);

// Phone Mockup for Social Media Posts
const SocialMockup = () => (
    <View className="flex-1 p-4">
        <View
            className="bg-white rounded-[28px] flex-1 p-4 mx-4"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
            }}
        >
            {/* Editor's Choice */}
            <View className="mb-4">
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-gray-800 font-semibold text-[14px]">Editor's Choice</Text>
                    <Text className="text-primary-500 text-[12px]">See All</Text>
                </View>
                <View className="flex-row gap-2">
                    <View className="w-16 h-16 bg-yellow-100 rounded-xl" />
                    <View className="w-16 h-16 bg-blue-100 rounded-xl" />
                    <View className="w-16 h-16 bg-red-100 rounded-xl" />
                </View>
            </View>

            {/* Quotes */}
            <View className="mb-4">
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-gray-800 font-semibold text-[14px]">Quotes</Text>
                        <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                            <Text className="text-gray-500 text-[10px]">Today</Text>
                        </View>
                    </View>
                    <Text className="text-primary-500 text-[12px]">See All</Text>
                </View>
                <View className="flex-row gap-2">
                    <View className="w-14 h-14 bg-amber-50 rounded-lg items-center justify-center">
                        <Text className="text-[8px] text-center text-gray-600">ENJOY{'\n'}THE{'\n'}LITTLE{'\n'}THINGS</Text>
                    </View>
                    <View className="w-14 h-14 bg-stone-100 rounded-lg items-center justify-center">
                        <Text className="text-[7px] text-center text-gray-600">enjoy every{'\n'}moment</Text>
                    </View>
                    <View className="w-14 h-14 bg-emerald-50 rounded-lg items-center justify-center">
                        <Text className="text-[7px] text-center text-gray-600">Be the most{'\n'}extreme</Text>
                    </View>
                </View>
            </View>

            {/* Job Posting */}
            <View>
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-gray-800 font-semibold text-[14px]">Job Posting</Text>
                    <Text className="text-primary-500 text-[12px]">See All</Text>
                </View>
                <View className="flex-row gap-2">
                    <View className="w-14 h-14 bg-yellow-50 rounded-lg" />
                    <View className="w-14 h-14 bg-amber-900 rounded-lg" />
                    <View className="w-14 h-14 bg-orange-100 rounded-lg" />
                </View>
            </View>
        </View>
    </View>
);

// Phone Mockup for CRM
const CRMMockup = () => (
    <View className="flex-1 p-4">
        <View
            className="bg-white rounded-[28px] flex-1 mx-4 overflow-hidden"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
            }}
        >
            {/* Header */}
            <LinearGradient
                colors={['#1A7CFF', '#0066E6']}
                className="px-4 py-4"
            >
                <Text className="text-white text-[18px] font-bold text-center">Leads</Text>
            </LinearGradient>

            {/* Tabs */}
            <View className="flex-row gap-2 px-4 py-3">
                <View className="bg-primary-500 px-3 py-1.5 rounded-full">
                    <Text className="text-white text-[11px] font-medium">All</Text>
                </View>
                <View className="border border-gray-200 px-3 py-1.5 rounded-full">
                    <Text className="text-gray-600 text-[11px]">Interested</Text>
                </View>
                <View className="border border-gray-200 px-3 py-1.5 rounded-full">
                    <Text className="text-gray-600 text-[11px]">In-Progress</Text>
                </View>
            </View>

            {/* Lead Cards */}
            <View className="px-3 flex-1">
                {mockLeads.slice(0, 3).map((lead, index) => (
                    <View
                        key={lead.id}
                        className={`bg-white rounded-2xl p-3 mb-2 flex-row items-center ${index === 1 ? 'scale-105' : ''
                            }`}
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 8,
                            elevation: 3,
                            transform: index === 1 ? [{ scale: 1.02 }] : [],
                        }}
                    >
                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                            <Text style={{ fontSize: 18 }}>{lead.avatar}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 font-semibold text-[12px]">{lead.name}</Text>
                            <Text className="text-gray-500 text-[10px]">{lead.phone}</Text>
                            <View
                                className={`self-start px-2 py-0.5 rounded-full mt-1 ${lead.status === 'New Lead' ? 'bg-blue-100' :
                                        lead.status === 'Interested' ? 'bg-green-100' : 'bg-orange-100'
                                    }`}
                            >
                                <Text
                                    className={`text-[8px] font-medium ${lead.status === 'New Lead' ? 'text-blue-600' :
                                            lead.status === 'Interested' ? 'text-green-600' : 'text-orange-600'
                                        }`}
                                >
                                    {lead.status}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row gap-1.5">
                            <View className="w-7 h-7 bg-green-50 rounded-full items-center justify-center">
                                <Ionicons name="logo-whatsapp" size={14} color="#22C55E" />
                            </View>
                            <View className="w-7 h-7 bg-blue-50 rounded-full items-center justify-center">
                                <Ionicons name="call" size={12} color="#3B82F6" />
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    </View>
);

const getMockupContent = (type: 'ads' | 'social' | 'crm') => {
    switch (type) {
        case 'ads':
            return <AdsMockup />;
        case 'social':
            return <SocialMockup />;
        case 'crm':
            return <CRMMockup />;
    }
};

export const OnboardingScreen = () => {
    const setOnboardingSeen = useAuthStore((state) => state.setOnboardingSeen);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const insets = useSafeAreaInsets();

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            setOnboardingSeen();
        }
    };

    const handleSkip = () => {
        setOnboardingSeen();
    };

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
        return (
            <View style={{ width }} className="flex-1">
                {/* Top section with gradient background */}
                <LinearGradient
                    colors={['#1A7CFF', '#00B4FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1.1 }}
                >
                    {getMockupContent(item.type)}
                </LinearGradient>

                {/* Bottom section with text */}
                <View style={{ flex: 0.75, backgroundColor: '#FFF', paddingHorizontal: 32, paddingTop: 28 }}>
                    <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 }}>
                        {item.title}
                    </Text>
                    <Text style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 23 }}>
                        {item.description}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white">
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                keyExtractor={(item) => item.id}
            />

            {/* Bottom navigation */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingBottom: Math.max(insets.bottom, 20) + 10, paddingTop: 16, paddingHorizontal: 24 }}>
                <View className="flex-row items-center justify-between">
                    {/* Pagination dots */}
                    <View className="flex-row gap-2">
                        {SLIDES.map((_, i) => {
                            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [8, 24, 8],
                                extrapolate: 'clamp',
                            });
                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.3, 1, 0.3],
                                extrapolate: 'clamp',
                            });
                            return (
                                <Animated.View
                                    key={i}
                                    style={{
                                        width: dotWidth,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: '#1A7CFF',
                                        opacity,
                                    }}
                                />
                            );
                        })}
                    </View>

                    {/* Next button */}
                    <TouchableOpacity
                        onPress={handleNext}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#1A7CFF', '#0066E6']}
                            className="w-14 h-14 rounded-2xl items-center justify-center"
                            style={{
                                shadowColor: '#1A7CFF',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.4,
                                shadowRadius: 12,
                                elevation: 8,
                            }}
                        >
                            <Ionicons name="arrow-forward" size={24} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};
