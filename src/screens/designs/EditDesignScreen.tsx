import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { useColors } from '../../utils/theme';
import { useBottomSafe } from '../../utils/useBottomSafe';

interface EditableField {
    id: string;
    value: string;
    visible: boolean;
}

type TabType = 'Text' | 'Image' | 'Theme';

export const EditDesignScreen = () => {
    const C = useColors();
    const bottomSafe = useBottomSafe();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const [activeTab, setActiveTab] = useState<TabType>('Text');
    const [loading, setLoading] = useState(false);

    const [fields, setFields] = useState<EditableField[]>([
        { id: '1', value: 'Customized & Flexible Web Application', visible: true },
        { id: '2', value: 'With E-Commerce Software', visible: true },
        { id: '3', value: '+91 88790 49091', visible: true },
        { id: '4', value: 'CONTACT US', visible: true },
    ]);

    const [businessName, setBusinessName] = useState('FREELANCER');

    const handleBack = () => {
        navigation.goBack();
    };

    const toggleFieldVisibility = (id: string) => {
        setFields(prev => prev.map(field =>
            field.id === id ? { ...field, visible: !field.visible } : field
        ));
    };

    const updateFieldValue = (id: string, value: string) => {
        setFields(prev => prev.map(field =>
            field.id === id ? { ...field, value } : field
        ));
    };

    const handleSaveAndPost = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            navigation.goBack();
        }, 1500);
    };

    const tabs: TabType[] = ['Text', 'Image', 'Theme'];

    return (
        <ScreenWrapper bg="bg-white" style={{ backgroundColor: C.background }}>
            {/* Header */}
            <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-gray-100" style={{ backgroundColor: C.surface, borderBottomColor: C.borderLight }}>
                <TouchableOpacity
                    onPress={handleBack}
                    className="mr-4"
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={28} color={C.text} />
                </TouchableOpacity>
                <Text className="text-[18px] font-semibold text-gray-900" style={{ color: C.text }}>Edit Design</Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Design Preview */}
                <View className="px-5 pt-5">
                    <View
                        className="rounded-2xl overflow-hidden"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.15,
                            shadowRadius: 20,
                            elevation: 10,
                        }}
                    >
                        {/* Background Image Simulation */}
                        <View className="h-56 bg-gray-200">
                            {/* Wood desk background simulation */}
                            <LinearGradient
                                colors={['#8B7355', '#6B5344', '#5D4837']}
                                className="flex-1 p-4"
                            >
                                {/* Laptop mockup */}
                                <View className="bg-gray-300 w-32 h-20 rounded-lg mt-2 ml-2" />
                            </LinearGradient>
                        </View>

                        {/* Phone Number Badge */}
                        <View className="absolute top-4 right-4">
                            <View className="bg-primary-500 flex-row items-center px-3 py-2 rounded-lg">
                                <Ionicons name="call" size={14} color="white" />
                                <Text className="text-white text-[14px] font-medium ml-2">
                                    {fields[2].visible ? fields[2].value : ''}
                                </Text>
                            </View>
                        </View>

                        {/* Content Overlay */}
                        <View className="bg-white px-5 py-5" style={{ backgroundColor: C.surface }}>
                            <Text className="text-primary-500 text-[24px] font-bold leading-7">
                                {fields[0].visible ? fields[0].value : ''}
                            </Text>
                            <Text className="text-gray-600 text-[14px] mt-2">
                                {fields[1].visible ? fields[1].value : ''}
                            </Text>

                            {/* Bottom Row */}
                            <View className="flex-row items-center justify-between mt-4">
                                {fields[3].visible && (
                                    <View className="bg-primary-500 px-5 py-2.5 rounded-lg">
                                        <Text className="text-white text-[13px] font-semibold">
                                            {fields[3].value}
                                        </Text>
                                    </View>
                                )}
                                <Text className="text-gray-900 text-[16px] font-bold tracking-wider">
                                    {businessName}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View className="flex-row mt-6 px-5 border-b border-gray-100" style={{ borderBottomColor: C.borderLight }}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            className={`flex-1 py-3 items-center ${activeTab === tab ? 'border-b-2 border-primary-500' : ''
                                }`}
                        >
                            <Text className={`text-[16px] font-medium ${activeTab === tab ? 'text-primary-500' : 'text-gray-500'
                                }`}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab Content */}
                <View className="px-5 pt-4">
                    {activeTab === 'Text' && (
                        <View>
                            {fields.map((field) => (
                                <View
                                    key={field.id}
                                    className="flex-row items-center py-4 border-b border-gray-100"
                                    style={{ borderBottomColor: C.borderLight }}
                                >
                                    {/* Edit Button */}
                                    <TouchableOpacity className="mr-3">
                                        <Ionicons name="pencil" size={20} color="#1A7CFF" />
                                    </TouchableOpacity>

                                    {/* Visibility Toggle */}
                                    <TouchableOpacity
                                        onPress={() => toggleFieldVisibility(field.id)}
                                        className="mr-4"
                                    >
                                        <Ionicons
                                            name={field.visible ? 'eye' : 'eye-off'}
                                            size={20}
                                            color={field.visible ? '#6E6E73' : '#D1D1D6'}
                                        />
                                    </TouchableOpacity>

                                    {/* Field Value */}
                                    <TextInput
                                        className={`flex-1 text-[15px] ${field.visible ? 'text-gray-900' : 'text-gray-400'
                                            }`}
                                        style={{ color: field.visible ? C.text : C.textSecondary }}
                                        value={field.value}
                                        onChangeText={(text) => updateFieldValue(field.id, text)}
                                        multiline
                                        placeholderTextColor={C.textSecondary}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {activeTab === 'Image' && (
                        <View className="items-center py-10">
                            <View className="w-20 h-20 bg-gray-100 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: C.surfaceSecondary }}>
                                <Ionicons name="image-outline" size={40} color={C.textSecondary} />
                            </View>
                            <Text className="text-gray-600 text-[16px] mb-2" style={{ color: C.text }}>Add Background Image</Text>
                            <Text className="text-gray-400 text-[14px] text-center" style={{ color: C.textSecondary }}>
                                Tap to upload or choose from gallery
                            </Text>
                            <TouchableOpacity className="mt-4 bg-primary-50 px-6 py-3 rounded-xl">
                                <Text className="text-primary-500 font-semibold">Choose Image</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeTab === 'Theme' && (
                        <View className="py-4">
                            <Text className="text-gray-700 font-medium mb-4" style={{ color: C.text }}>Select Theme Color</Text>
                            <View className="flex-row flex-wrap gap-3">
                                {['#1A7CFF', '#E53E3E', '#38A169', '#805AD5', '#DD6B20', '#2D3748', '#D69E2E', '#ED64A6'].map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        className="w-12 h-12 rounded-xl border-2 border-white"
                                        style={{
                                            backgroundColor: color,
                                            shadowColor: color,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 4,
                                        }}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-4 border-t border-gray-100" style={{ backgroundColor: C.surface, borderTopColor: C.borderLight, paddingBottom: bottomSafe }}>
                <Button
                    title="SAVE & POST"
                    onPress={handleSaveAndPost}
                    loading={loading}
                />
            </View>
        </ScreenWrapper>
    );
};
