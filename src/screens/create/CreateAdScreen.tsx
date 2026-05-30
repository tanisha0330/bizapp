import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, StyleSheet, ActivityIndicator, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdStore, Ad } from '../../store/useAdStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useFacebookStore } from '../../store/useFacebookStore';
import { api } from '../../services/api';
import { generateAdCopy } from '../../services/aiCopywriter';
import { Colors, Fonts, FontSize, Radius, Gradients, useColors } from '../../utils/theme';
import { searchCities } from '../../data/indianCities';
import { NotifyEvents } from '../../services/notifications';
import { analytics } from '../../services/mixpanel';

const STEPS = ['Goal', 'Platform', 'Creative', 'Targeting', 'Budget', 'Review'];

const GOALS = [
    { id: 'leads', label: 'Get Leads', icon: 'people-outline', desc: 'Collect contact info from potential customers' },
    { id: 'calls', label: 'Get Calls', icon: 'call-outline', desc: 'Drive phone calls to your business' },
    { id: 'traffic', label: 'Website Visits', icon: 'globe-outline', desc: 'Send people to your website' },
    { id: 'messages', label: 'Get Messages', icon: 'chatbubble-outline', desc: 'Start WhatsApp or Messenger conversations' },
    { id: 'brand', label: 'Brand Awareness', icon: 'eye-outline', desc: 'Reach more people and build recognition' },
];

const PLATFORMS = [
    { id: 'Meta', label: 'Meta (Facebook & Instagram)', icon: 'logo-facebook', color: '#1877F2', desc: 'Facebook, Instagram, Messenger' },
    { id: 'Google', label: 'Google Ads', icon: 'globe-outline', color: '#DB4437', desc: 'Search, YouTube, Display (Coming Soon)' },
];

const AGE_BRACKETS = [
    { label: '13-17', min: 13, max: 17 },
    { label: '18-24', min: 18, max: 24 },
    { label: '25-34', min: 25, max: 34 },
    { label: '35-44', min: 35, max: 44 },
    { label: '45-54', min: 45, max: 54 },
    { label: '55-64', min: 55, max: 64 },
    { label: '65+', min: 65, max: 65 },
    { label: '18-65 (All Adults)', min: 18, max: 65 },
];

const AI_SUGGESTIONS: Record<string, { interests: string; ageMin: number; ageMax: number; budgetTip: string }> = {
    'Restaurant': { interests: 'Food, Restaurants, Cooking, Zomato, Swiggy', ageMin: 18, ageMax: 45, budgetTip: '300-500/day works best for restaurants' },
    'Retail': { interests: 'Shopping, Online Shopping, Fashion, Deals', ageMin: 18, ageMax: 55, budgetTip: '500-1000/day for maximum reach' },
    'Health': { interests: 'Health, Fitness, Wellness, Yoga, Gym', ageMin: 25, ageMax: 55, budgetTip: '300-700/day for health services' },
    'Education': { interests: 'Education, Coaching, Exams, Career, University', ageMin: 16, ageMax: 35, budgetTip: '200-500/day for coaching centers' },
    'Real Estate': { interests: 'Real Estate, Property, Home Buying, Investment', ageMin: 28, ageMax: 55, budgetTip: '1000-3000/day for real estate leads' },
    'Salon': { interests: 'Beauty, Salon, Spa, Hair Care, Makeup', ageMin: 18, ageMax: 45, budgetTip: '200-400/day for beauty services' },
    'default': { interests: 'Shopping, Business, Local Services', ageMin: 18, ageMax: 65, budgetTip: '300-500/day is a good starting point' },
};

const INTEREST_SUGGESTIONS = [
    'Shopping', 'Food', 'Fitness', 'Travel', 'Fashion', 'Technology', 'Business',
    'Education', 'Real Estate', 'Beauty', 'Health', 'Sports', 'Music', 'Movies',
    'Gaming', 'Photography', 'Cooking', 'Yoga', 'Finance', 'Cars',
];

export const CreateAdScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { addAd, updateAd: updateAdStore } = useAdStore();
    const user = useAuthStore(s => s.user);
    const isFbConnected = useFacebookStore(s => s.isConnected);
    const C = useColors();

    // Support editing a draft ad passed via navigation params
    const draftAd: Ad | undefined = route.params?.draftAd;

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [aiApplied, setAiApplied] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [locationQuery, setLocationQuery] = useState(draftAd?.location || '');
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [showAgeDropdown, setShowAgeDropdown] = useState(false);

    const [selectedPageId, setSelectedPageId] = useState<string>('');
    const [formData, setFormData] = useState<Partial<Ad>>({
        goal: draftAd?.goal || '',
        platform: draftAd?.platform || 'Meta',
        title: draftAd?.title || '',
        primaryText: draftAd?.primaryText || '',
        cta: draftAd?.cta || 'Learn More',
        imageUri: draftAd?.imageUri || route.params?.designUri || '',
        location: draftAd?.location || '',
        interest: draftAd?.interest || '',
        ageMin: draftAd?.ageMin || 18,
        ageMax: draftAd?.ageMax || 65,
        dailyBudget: draftAd?.dailyBudget || 500,
        durationDays: draftAd?.durationDays || 7,
    });

    const updateForm = (key: keyof Ad, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const citySuggestions = useMemo(() => searchCities(locationQuery), [locationQuery]);

    const getAISuggestions = () => {
        const category = user?.businessCategory || 'default';
        return AI_SUGGESTIONS[category] || AI_SUGGESTIONS['default'];
    };

    const applyAISuggestions = () => {
        const suggestions = getAISuggestions();
        setFormData(prev => ({
            ...prev,
            interest: suggestions.interests,
            ageMin: suggestions.ageMin,
            ageMax: suggestions.ageMax,
        }));
        setAiApplied(true);
    };

    const toggleInterest = (interest: string) => {
        const current = formData.interest || '';
        const list = current.split(',').map(s => s.trim()).filter(Boolean);
        if (list.includes(interest)) {
            updateForm('interest', list.filter(i => i !== interest).join(', '));
        } else {
            updateForm('interest', [...list, interest].join(', '));
        }
    };

    const selectedInterests = (formData.interest || '').split(',').map(s => s.trim()).filter(Boolean);

    const handleNext = () => {
        if (currentStep === 0 && !formData.goal) { Alert.alert('Select Goal', 'Please select an advertising goal.'); return; }
        if (currentStep === 2 && !formData.title?.trim()) { Alert.alert('Add Title', 'Please enter an ad title.'); return; }
        if (currentStep === 3 && !formData.location?.trim()) { Alert.alert('Add Location', 'Please enter a target location.'); return; }
        if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
        else handlePublish();
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
        else navigation.goBack();
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
        if (!result.canceled) updateForm('imageUri', result.assets[0].uri);
    };

    const saveAdLocally = (status: Ad['status'], backendCampaignId?: string, backendError?: string): Ad => {
        const adData: Ad = {
            id: draftAd?.id || Math.random().toString(36).substring(2, 11),
            createdAt: draftAd?.createdAt || new Date().toISOString(),
            status,
            title: formData.title || '', goal: formData.goal || '', platform: (formData.platform || 'Meta') as 'Meta' | 'Google',
            primaryText: formData.primaryText || '', cta: formData.cta || '', imageUri: formData.imageUri || '',
            location: formData.location || '', interest: formData.interest || '', ageMin: formData.ageMin || 18,
            ageMax: formData.ageMax || 65, dailyBudget: formData.dailyBudget || 500, durationDays: formData.durationDays || 7,
            backendCampaignId: backendCampaignId || draftAd?.backendCampaignId, backendError,
        };
        if (draftAd) {
            updateAdStore(draftAd.id, adData);
        } else {
            addAd(adData);
        }
        return adData;
    };

    const handlePublish = async () => {
        let { isConnected, pages, selectedPages } = useFacebookStore.getState();

        // If local store says not connected, check backend as fallback
        if (!isConnected || pages.length === 0) {
            try {
                const status = await api.getMetaStatus();
                if (status.connected) {
                    const pagesData = await api.getMetaPages();
                    if (pagesData.pages && pagesData.pages.length > 0) {
                        // Sync into local store for future use
                        const fbStore = useFacebookStore.getState();
                        fbStore.setConnection(
                            status.profile as any || { id: '', name: '' },
                            pagesData.pages,
                        );
                        // Re-read updated state
                        ({ isConnected, pages, selectedPages } = useFacebookStore.getState());
                    }
                }
            } catch {}
        }

        // If still not connected after backend check, save as draft
        if (!isConnected || pages.length === 0) {
            saveAdLocally('Draft');
            analytics.track('Ad Draft Saved');
            NotifyEvents.adDraftSaved(formData.title || 'Untitled Ad');
            Alert.alert(
                'Saved as Draft',
                'Connect your Facebook account from the Home screen to publish ads live on Meta.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            return;
        }

        setLoading(true);
        try {
            // 1. Get ad account from backend
            const { adAccounts } = await api.getMetaAdAccounts();
            if (!adAccounts || adAccounts.length === 0) {
                throw new Error('No ad accounts found. Please check your Meta Business account has an ad account.');
            }
            const adAccountId = adAccounts[0].id;

            // 2. Upload creative image if we have one
            let creativeId: string | undefined;
            if (formData.imageUri) {
                const ext = formData.imageUri.split('.').pop() || 'jpg';
                const uploadResult = await api.uploadCreative({
                    uri: formData.imageUri,
                    name: `ad-creative-${Date.now()}.${ext}`,
                    type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
                });
                creativeId = uploadResult.id;
            }

            // 3. Get page ID (use user's selection from review step, or fallback)
            const pageId = selectedPageId || (selectedPages.length > 0 ? selectedPages[0] : pages[0]?.id);

            // 4. Map goal to Meta objective
            const objectiveMap: Record<string, string> = {
                'Get Leads': 'OUTCOME_LEADS',
                'Get Calls': 'OUTCOME_LEADS',
                'Website Visits': 'OUTCOME_TRAFFIC',
                'Get Messages': 'OUTCOME_ENGAGEMENT',
                'Brand Awareness': 'OUTCOME_AWARENESS',
            };

            // 5. Map CTA to Meta format
            const ctaMap: Record<string, string> = {
                'Call Now': 'CALL_NOW',
                'Learn More': 'LEARN_MORE',
                'WhatsApp': 'WHATSAPP_MESSAGE',
                'Book Now': 'BOOK_TRAVEL',
                'Shop Now': 'SHOP_NOW',
                'Sign Up': 'SIGN_UP',
            };

            // 6. Create campaign on backend
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + (formData.durationDays || 7) * 86400000).toISOString().split('T')[0];

            const locations = (formData.location || '').split(',').map(l => l.trim()).filter(Boolean);
            const interests = (formData.interest || '').split(',').map(i => i.trim()).filter(Boolean);

            const campaignResult = await api.createCampaign({
                adAccountId,
                title: formData.title || 'Untitled Ad',
                objective: objectiveMap[formData.goal || ''] || 'OUTCOME_AWARENESS',
                dailyBudget: (formData.dailyBudget || 500) * 100, // Meta expects cents/paise
                startDate,
                endDate,
                targeting: {
                    locations,
                    interests,
                    ageMin: formData.ageMin || 18,
                    ageMax: formData.ageMax || 65,
                },
                creativeId,
                primaryText: formData.primaryText || '',
                headline: formData.title || '',
                cta: ctaMap[formData.cta || 'Learn More'] || 'LEARN_MORE',
                pageId,
            });

            // 7. Launch the campaign immediately
            try {
                await api.launchCampaign(campaignResult.id);
                saveAdLocally('Launching', campaignResult.id);
                analytics.track('Ad Published', { title: formData.title });
                NotifyEvents.adPublished(formData.title || 'Untitled Ad');
                Alert.alert(
                    'Campaign Launching!',
                    'Your ad is being submitted to Meta for review. It usually takes a few hours to go live.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } catch (launchErr: any) {
                // Campaign created but launch failed — save as draft
                saveAdLocally('Draft', campaignResult.id, launchErr?.message);
                Alert.alert(
                    'Saved as Draft',
                    `Campaign created but launch failed: ${launchErr?.message || 'Unknown error'}. You can retry from Ads screen.`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (err: any) {
            // Total failure — save locally
            saveAdLocally('Draft', undefined, err?.message);
            Alert.alert(
                'Saved as Draft',
                `Could not publish to Meta: ${err?.message || 'Unknown error'}. Your ad is saved locally.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAIGenerate = async () => {
        setAiGenerating(true);
        try {
            const result = await generateAdCopy({ businessName: user?.businessName || 'My Business', businessCategory: user?.businessCategory, goal: formData.goal || 'Get Leads', description: formData.primaryText || undefined });
            setFormData(prev => ({ ...prev, title: result.title, primaryText: result.primaryText, cta: result.cta || prev.cta }));
        } catch { Alert.alert('AI Error', 'Could not generate copy.'); }
        finally { setAiGenerating(false); }
    };

    const renderGoalStep = () => (
        <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: C.text }]}>What is your goal?</Text>
            <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>Choose what you want to achieve</Text>
            <View style={{ gap: 12 }}>
                {GOALS.map(g => (
                    <TouchableOpacity key={g.id} onPress={() => updateForm('goal', g.label)} style={[styles.optionCard, { backgroundColor: C.surfaceSecondary, borderColor: C.borderLight }, formData.goal === g.label && styles.optionCardActive]}>
                        <View style={[styles.optionIcon, formData.goal === g.label && styles.optionIconActive]}>
                            <Ionicons name={g.icon as any} size={24} color={formData.goal === g.label ? Colors.brand : Colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.optionLabel, { color: C.text }, formData.goal === g.label && { color: Colors.brand }]}>{g.label}</Text>
                            <Text style={[styles.optionDesc, { color: C.textSecondary }]}>{g.desc}</Text>
                        </View>
                        {formData.goal === g.label && <Ionicons name="checkmark-circle" size={24} color={Colors.brand} />}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderPlatformStep = () => (
        <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: C.text }]}>Choose Platform</Text>
            <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>Where should your ad appear?</Text>
            <View style={{ gap: 12 }}>
                {PLATFORMS.map(p => (
                    <TouchableOpacity key={p.id} onPress={() => updateForm('platform', p.id)} style={[styles.optionCard, { backgroundColor: C.surfaceSecondary, borderColor: C.borderLight }, formData.platform === p.id && styles.optionCardActive]}>
                        <View style={[styles.platformIconBox, { backgroundColor: p.color + '15' }]}>
                            <Ionicons name={p.icon as any} size={28} color={p.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.optionLabel, { color: C.text }, formData.platform === p.id && { color: Colors.brand }]}>{p.label}</Text>
                            <Text style={[styles.optionDesc, { color: C.textSecondary }]}>{p.desc}</Text>
                        </View>
                        {formData.platform === p.id && <Ionicons name="checkmark-circle" size={24} color={Colors.brand} />}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderCreativeStep = () => (
        <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.stepTitle, { color: C.text }]}>Ad Creative</Text>

            <TouchableOpacity onPress={handleAIGenerate} disabled={aiGenerating} style={{ marginBottom: 16 }}>
                <LinearGradient colors={Gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.aiBtn}>
                    {aiGenerating ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="sparkles" size={18} color="#FFF" />}
                    <Text style={styles.aiBtnText}>{aiGenerating ? 'Generating...' : 'AI Generate Copy'}</Text>
                </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Ad Title *</Text>
            <TextInput style={[styles.textInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={formData.title} onChangeText={t => updateForm('title', t)} placeholder="e.g. Summer Sale 50% Off" placeholderTextColor={Colors.textTertiary} />

            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Primary Text</Text>
            <TextInput style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top', backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={formData.primaryText} onChangeText={t => updateForm('primaryText', t)} multiline placeholder="Describe your offer..." placeholderTextColor={Colors.textTertiary} />

            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Ad Image</Text>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                {formData.imageUri ? (
                    <Image source={{ uri: formData.imageUri }} style={styles.imagePreview} resizeMode="cover" />
                ) : (
                    <View style={styles.imagePickerEmpty}>
                        <Ionicons name="image-outline" size={36} color={Colors.textTertiary} />
                        <Text style={styles.imagePickerText}>Tap to upload image</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Call to Action</Text>
            <View style={styles.chipRow}>
                {['Call Now', 'Learn More', 'WhatsApp', 'Book Now', 'Shop Now', 'Sign Up'].map(c => (
                    <TouchableOpacity key={c} onPress={() => updateForm('cta', c)} style={[styles.chip, formData.cta === c && styles.chipActive]}>
                        <Text style={[styles.chipText, formData.cta === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );

    const renderTargetingStep = () => {
        const suggestions = getAISuggestions();
        return (
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.stepTitle, { color: C.text }]}>Targeting</Text>

                <TouchableOpacity onPress={applyAISuggestions} style={{ marginBottom: 16, borderRadius: Radius.md, overflow: 'hidden' }}>
                    <LinearGradient colors={['#6C3AED', '#8B5CF6']} style={styles.aiBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Ionicons name="sparkles" size={20} color="#FFF" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.aiBannerTitle}>AI Smart Targeting</Text>
                            <Text style={styles.aiBannerDesc}>
                                {aiApplied ? 'Applied! Based on your business.' : `Auto-fill for ${user?.businessCategory || 'your business'}`}
                            </Text>
                        </View>
                        <Ionicons name={aiApplied ? 'checkmark-circle' : 'arrow-forward'} size={20} color={aiApplied ? '#A7F3D0' : '#FFF'} />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Location with autocomplete */}
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Location *</Text>
                <View style={{ zIndex: 10 }}>
                    <TextInput
                        style={[styles.textInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]}
                        value={locationQuery || formData.location || ''}
                        onChangeText={t => { setLocationQuery(t); setShowLocationSuggestions(true); if (!t.trim()) updateForm('location', ''); }}
                        placeholder="Type city name e.g. Mumbai"
                        placeholderTextColor={Colors.textTertiary}
                    />
                    {showLocationSuggestions && citySuggestions.length > 0 && (
                        <View style={styles.suggestionsBox}>
                            {citySuggestions.map(city => (
                                <TouchableOpacity key={city} style={styles.suggestionItem} onPress={() => { updateForm('location', city); setLocationQuery(city); setShowLocationSuggestions(false); }}>
                                    <Ionicons name="location-outline" size={16} color={Colors.brand} />
                                    <Text style={styles.suggestionText}>{city}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Interests */}
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Interests</Text>
                <TextInput style={[styles.textInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={formData.interest} onChangeText={t => updateForm('interest', t)} placeholder="e.g. Shopping, Fitness, Food" placeholderTextColor={Colors.textTertiary} />
                <View style={[styles.chipRow, { marginTop: 8 }]}>
                    {INTEREST_SUGGESTIONS.slice(0, 12).map(interest => (
                        <TouchableOpacity key={interest} onPress={() => toggleInterest(interest)} style={[styles.chip, selectedInterests.includes(interest) && styles.chipActive]}>
                            <Text style={[styles.chipText, selectedInterests.includes(interest) && styles.chipTextActive]}>{interest}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Age Bracket Dropdown */}
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Age Range: {formData.ageMin} - {formData.ageMax}</Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowAgeDropdown(!showAgeDropdown)}>
                    <Text style={styles.dropdownBtnText}>
                        {formData.ageMin === 65 ? '65+' : `${formData.ageMin} - ${formData.ageMax}`}
                    </Text>
                    <Ionicons name={showAgeDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showAgeDropdown && (
                    <View style={styles.dropdownList}>
                        {AGE_BRACKETS.map(bracket => (
                            <TouchableOpacity
                                key={bracket.label}
                                style={[styles.dropdownItem, formData.ageMin === bracket.min && formData.ageMax === bracket.max && styles.dropdownItemActive]}
                                onPress={() => { updateForm('ageMin', bracket.min); updateForm('ageMax', bracket.max); setShowAgeDropdown(false); }}
                            >
                                <Text style={[styles.dropdownItemText, formData.ageMin === bracket.min && formData.ageMax === bracket.max && styles.dropdownItemTextActive]}>
                                    {bracket.label}
                                </Text>
                                {formData.ageMin === bracket.min && formData.ageMax === bracket.max && (
                                    <Ionicons name="checkmark" size={18} color={Colors.brand} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.tipBox}>
                    <Ionicons name="bulb-outline" size={16} color="#FF9500" />
                    <Text style={styles.tipText}>{suggestions.budgetTip}</Text>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        );
    };

    const renderBudgetStep = () => (
        <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.stepTitle, { color: C.text }]}>Budget & Duration</Text>

            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Daily Budget (INR)</Text>
            <TextInput style={[styles.textInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} keyboardType="numeric" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} value={formData.dailyBudget?.toString()} onChangeText={t => updateForm('dailyBudget', parseInt(t) || 0)} placeholder="500" placeholderTextColor={Colors.textTertiary} />

            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Duration (Days)</Text>
            <TextInput style={[styles.textInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} keyboardType="numeric" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} value={formData.durationDays?.toString()} onChangeText={t => updateForm('durationDays', parseInt(t) || 1)} placeholder="7" placeholderTextColor={Colors.textTertiary} />

            <View style={[styles.totalBox, { backgroundColor: C.surfaceSecondary }]}>
                <Text style={[styles.totalLabel, { color: C.textSecondary }]}>Total Ad Spend</Text>
                <Text style={styles.totalValue}>INR {((formData.dailyBudget || 0) * (formData.durationDays || 0)).toLocaleString()}</Text>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 20, color: C.textSecondary }]}>Quick Presets</Text>
            <View style={styles.chipRow}>
                {[
                    { budget: 200, days: 3, label: '200 x 3d' },
                    { budget: 500, days: 7, label: '500 x 7d' },
                    { budget: 1000, days: 7, label: '1K x 7d' },
                    { budget: 500, days: 30, label: '500 x 30d' },
                ].map(p => (
                    <TouchableOpacity key={p.label} style={[styles.chip, formData.dailyBudget === p.budget && formData.durationDays === p.days && styles.chipActive]}
                        onPress={() => { updateForm('dailyBudget', p.budget); updateForm('durationDays', p.days); Keyboard.dismiss(); }}>
                        <Text style={[styles.chipText, formData.dailyBudget === p.budget && formData.durationDays === p.days && styles.chipTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );

    const renderReviewStep = () => {
        const fbPages = useFacebookStore.getState().pages;
        // Auto-select first page if none selected yet
        if (!selectedPageId && fbPages.length > 0) {
            setSelectedPageId((fbPages[0] as any).page_id || fbPages[0].id);
        }

        return (
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.stepTitle, { color: C.text }]}>Review Your Ad</Text>
                {formData.imageUri ? <Image source={{ uri: formData.imageUri }} style={styles.reviewImage} resizeMode="cover" /> : null}

                {/* Page Selector */}
                {fbPages.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Run ad on Page</Text>
                        <View style={{ gap: 8 }}>
                            {fbPages.map((page: any) => {
                                const pName = page.page_name || page.name || 'Facebook Page';
                                const pCategory = page.page_category || page.category || '';
                                const pId = page.page_id || page.id;
                                return (
                                    <TouchableOpacity
                                        key={pId}
                                        onPress={() => setSelectedPageId(pId)}
                                        style={[styles.optionCard, { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: C.surfaceSecondary, borderColor: C.borderLight }, selectedPageId === pId && styles.optionCardActive]}
                                    >
                                        <Ionicons name="logo-facebook" size={20} color={selectedPageId === pId ? Colors.brand : Colors.textSecondary} />
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={[styles.optionLabel, { fontSize: 14, color: C.text }, selectedPageId === pId && { color: Colors.brand }]}>{pName}</Text>
                                            {pCategory ? <Text style={[styles.optionDesc, { color: C.textSecondary }]}>{pCategory}</Text> : null}
                                        </View>
                                        {selectedPageId === pId && <Ionicons name="checkmark-circle" size={20} color={Colors.brand} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                <View style={{ gap: 0 }}>
                    {[
                        { label: 'Title', value: formData.title },
                        { label: 'Primary Text', value: formData.primaryText },
                        { label: 'Goal', value: formData.goal },
                        { label: 'Platform', value: formData.platform },
                        { label: 'CTA', value: formData.cta },
                        { label: 'Location', value: formData.location },
                        { label: 'Interests', value: formData.interest },
                        { label: 'Age Range', value: `${formData.ageMin} - ${formData.ageMax}` },
                        { label: 'Budget', value: `INR ${formData.dailyBudget}/day x ${formData.durationDays} days` },
                        { label: 'Total', value: `INR ${((formData.dailyBudget || 0) * (formData.durationDays || 0)).toLocaleString()}` },
                    ].map(item => item.value ? (
                        <View key={item.label} style={[styles.reviewRow, { borderBottomColor: C.borderLight }]}>
                            <Text style={[styles.reviewLabel, { color: C.textSecondary }]}>{item.label}</Text>
                            <Text style={[styles.reviewValue, { color: C.text }]}>{item.value}</Text>
                        </View>
                    ) : null)}
                </View>
            </ScrollView>
        );
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0: return renderGoalStep();
            case 1: return renderPlatformStep();
            case 2: return renderCreativeStep();
            case 3: return renderTargetingStep();
            case 4: return renderBudgetStep();
            case 5: return renderReviewStep();
            default: return null;
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={[styles.headerBtn, { backgroundColor: C.surfaceSecondary }]}>
                        <Ionicons name={currentStep === 0 ? 'close' : 'arrow-back'} size={22} color={C.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: C.text }]}>{STEPS[currentStep]}</Text>
                    <Text style={styles.stepIndicator}>{currentStep + 1}/{STEPS.length}</Text>
                </View>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
                </View>
                <View style={{ flex: 1 }}>{renderStep()}</View>
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: C.surface, borderTopColor: C.borderLight }]}>
                    <TouchableOpacity onPress={handleNext} disabled={loading}>
                        <LinearGradient
                            colors={currentStep === STEPS.length - 1 ? (isFbConnected ? ['#34C759', '#2DA44E'] : Gradients.brand as any) : (Gradients.brand as any)}
                            style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : (
                                <>
                                    <Text style={styles.nextBtnText}>{currentStep === STEPS.length - 1 ? (isFbConnected ? 'Publish Ad' : 'Save Draft') : 'Continue'}</Text>
                                    <Ionicons name={currentStep === STEPS.length - 1 ? 'rocket-outline' : 'arrow-forward'} size={20} color="#FFF" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: Fonts.bold, fontSize: FontSize.lg, color: Colors.text },
    stepIndicator: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, color: Colors.textTertiary },
    progressBar: { height: 3, backgroundColor: Colors.surfaceTertiary },
    progressFill: { height: 3, backgroundColor: Colors.brand, borderRadius: 2 },
    stepContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    stepTitle: { fontFamily: Fonts.bold, fontSize: 22, color: Colors.text, marginBottom: 4 },
    stepSubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.sm, color: Colors.textTertiary, marginBottom: 20 },
    optionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.md, backgroundColor: Colors.surfaceSecondary, borderWidth: 2, borderColor: 'transparent' },
    optionCardActive: { borderColor: Colors.brand, backgroundColor: Colors.brandBg },
    optionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    optionIconActive: { backgroundColor: Colors.brandBg },
    optionLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.md, color: Colors.text },
    optionDesc: { fontFamily: Fonts.regular, fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
    platformIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    fieldLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 16, marginBottom: 6 },
    textInput: {
        fontFamily: Fonts.regular, fontSize: FontSize.md, color: Colors.text,
        backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border,
        borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14,
    },
    imagePicker: { height: 180, borderRadius: Radius.md, overflow: 'hidden', marginBottom: 16, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
    imagePreview: { width: '100%', height: '100%' },
    imagePickerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    imagePickerText: { fontFamily: Fonts.regular, fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border },
    chipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    chipText: { fontFamily: Fonts.semiBold, fontSize: FontSize.xs, color: Colors.textSecondary },
    chipTextActive: { color: '#FFF' },
    aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: Radius.md },
    aiBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.sm, color: '#FFF' },
    aiBanner: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    aiBannerTitle: { fontFamily: Fonts.bold, fontSize: FontSize.sm, color: '#FFF' },
    aiBannerDesc: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    // Location suggestions
    suggestionsBox: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, zIndex: 100, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    suggestionText: { fontFamily: Fonts.medium, fontSize: FontSize.sm, color: Colors.text },
    // Age dropdown
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14 },
    dropdownBtnText: { fontFamily: Fonts.medium, fontSize: FontSize.md, color: Colors.text },
    dropdownList: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, marginTop: 4, overflow: 'hidden' },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    dropdownItemActive: { backgroundColor: Colors.brandBg },
    dropdownItemText: { fontFamily: Fonts.medium, fontSize: FontSize.sm, color: Colors.text },
    dropdownItemTextActive: { color: Colors.brand, fontFamily: Fonts.semiBold },
    tipBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.warningBg, padding: 12, borderRadius: Radius.sm, marginTop: 16 },
    tipText: { fontFamily: Fonts.regular, fontSize: FontSize.xs, color: '#E65100', flex: 1 },
    totalBox: { backgroundColor: Colors.brandBg, padding: 20, borderRadius: Radius.md, alignItems: 'center', marginTop: 16 },
    totalLabel: { fontFamily: Fonts.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
    totalValue: { fontFamily: Fonts.bold, fontSize: 28, color: Colors.brand },
    reviewImage: { width: '100%', height: 200, borderRadius: Radius.md, marginBottom: 16 },
    reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    reviewLabel: { fontFamily: Fonts.medium, fontSize: FontSize.sm, color: Colors.textTertiary },
    reviewValue: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, color: Colors.text, maxWidth: '60%', textAlign: 'right' },
    bottomBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.surface },
    nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: Radius.md },
    nextBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.md, color: '#FFF' },
});
