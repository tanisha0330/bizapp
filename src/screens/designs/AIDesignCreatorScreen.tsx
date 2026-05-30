import React, { useState, useRef, useCallback } from 'react';
import LottieView from 'lottie-react-native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Dimensions,
    Keyboard,
    Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { generateAdDesign, analyzeReferenceImages, DesignContext, PosterBrief } from '../../services/geminiService';
import { useAuthStore } from '../../store/useAuthStore';
import { useDesignStore } from '../../store/useDesignStore';
import { usePosterChatStore, ChatMessage } from '../../store/usePosterChatStore';
import { PosterCompositor } from '../../components/PosterCompositor';
import { useColors } from '../../utils/theme';
import { NotifyEvents } from '../../services/notifications';
import { analytics } from '../../services/mixpanel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_MAX_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 280);

interface Message {
    id: string;
    type: 'user' | 'ai';
    text?: string;
    imageUri?: string;
    // For compositor: background + brief, before final capture
    backgroundUri?: string;
    brief?: PosterBrief;
    // Final composited image (after ViewShot capture)
    compositedUri?: string;
    timestamp: Date;
}

const QUICK_PROMPTS = [
    'Diwali sale poster with 50% off for all items',
    'Grand opening flyer with date and address',
    'Weekend special offer — Buy 1 Get 1 Free',
    'New product launch announcement poster',
    'Holi festival greeting with business branding',
    'Summer sale — up to 70% off all categories',
];

// ─── Poster Edit Modal ──────────────────────────────────
const PosterEditModal = ({ visible, brief, backgroundUri, onClose, onSave, C }: {
    visible: boolean; brief: PosterBrief; backgroundUri: string;
    onClose: () => void; onSave: (brief: PosterBrief) => void; C: any;
}) => {
    const [editBrief, setEditBrief] = React.useState<PosterBrief>(brief);

    React.useEffect(() => { setEditBrief(brief); }, [brief]);

    const updateField = (key: keyof PosterBrief, value: string) => {
        setEditBrief(prev => ({ ...prev, [key]: value }));
    };

    const fields: { key: keyof PosterBrief; label: string; icon: string }[] = [
        { key: 'headline', label: 'Headline', icon: 'text-outline' },
        { key: 'subtext', label: 'Subtext', icon: 'reorder-two-outline' },
        { key: 'offer', label: 'Offer (e.g. 50% OFF)', icon: 'pricetag-outline' },
        { key: 'cta', label: 'CTA Button (e.g. Shop Now)', icon: 'hand-left-outline' },
        { key: 'businessName', label: 'Business Name', icon: 'business-outline' },
        { key: 'contact', label: 'Phone / Contact', icon: 'call-outline' },
    ];

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.borderLight }}>
                        <Text style={{ fontFamily: 'Jakarta-Bold', fontSize: 18, color: C.text }}>Edit Poster Text</Text>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
                    </View>
                    <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {fields.map(f => (
                            <View key={f.key} style={{ marginBottom: 14 }}>
                                <Text style={{ fontFamily: 'Jakarta-SemiBold', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>{f.label}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: C.borderLight, paddingHorizontal: 12 }}>
                                    <Ionicons name={f.icon as any} size={16} color={C.textTertiary} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={{ flex: 1, fontFamily: 'Jakarta-Regular', fontSize: 14, color: C.text, paddingVertical: 12 }}
                                        value={editBrief[f.key]}
                                        onChangeText={v => updateField(f.key, v)}
                                        placeholder={f.label}
                                        placeholderTextColor={C.textTertiary}
                                    />
                                    {editBrief[f.key] ? (
                                        <TouchableOpacity onPress={() => updateField(f.key, '')}>
                                            <Ionicons name="close-circle" size={16} color={C.textTertiary} />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={() => onSave(editBrief)}
                            style={{ marginTop: 8, marginBottom: 30 }}
                        >
                            <LinearGradient colors={['#6C5CE7', '#5A4BD1']} style={{ paddingVertical: 16, borderRadius: 14, alignItems: 'center' }}>
                                <Text style={{ fontFamily: 'Jakarta-Bold', fontSize: 16, color: '#FFF' }}>Update Poster</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export const AIDesignCreatorScreen = ({ navigation }: any) => {
    const scrollRef = useRef<ScrollView>(null);
    const C = useColors();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { addDesign } = useDesignStore();

    const [businessName, setBusinessName] = useState(user?.businessName || user?.fullName || '');
    const [industry, setIndustry] = useState(user?.businessCategory || '');
    const [targetAudience, setTargetAudience] = useState('');
    const [brandColors, setBrandColors] = useState('');
    const [logoUri, setLogoUri] = useState<string | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);

    const firstName = user?.fullName?.split(' ')[0] || '';
    const { messages: storedMessages, addMessage, updateMessage, clearHistory } = usePosterChatStore();

    const welcomeMsg: Message = {
        id: 'welcome',
        type: 'ai',
        text: `Hey${firstName ? ` ${firstName}` : ''}! I create professional ad posters${user?.businessName ? ` for ${user.businessName}` : ''}.\n\nTo get the best result, tell me:\n1. Occasion (sale, festival, launch etc.)\n2. Offer details (50% off, Buy 1 Get 1 etc.)\n3. Target audience\n4. Color preference\n5. Any contact info to include\n\nOr pick a quick prompt below to get started!`,
        timestamp: new Date(),
    };

    // Convert stored messages (ISO strings) to Message format (Date objects)
    const messages: Message[] = [
        welcomeMsg,
        ...storedMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
    ];

    // Helper to convert Message to ChatMessage for storage
    const toStored = (m: Message): ChatMessage => ({
        id: m.id, type: m.type, text: m.text, imageUri: m.imageUri,
        backgroundUri: m.backgroundUri, brief: m.brief, compositedUri: m.compositedUri,
        timestamp: m.timestamp.toISOString(),
    });

    const [inputText, setInputText] = useState('');
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showContext, setShowContext] = useState(false);

    const pickLogo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setLogoUri(result.assets[0].uri);
        }
    };

    const pickReferenceImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets.length > 0) {
            const uris = result.assets.map(asset => asset.uri);
            setReferenceImages(prev => [...prev, ...uris]);
        }
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    const analyzeImages = async () => {
        if (referenceImages.length === 0) {
            Alert.alert('No images', 'Please add reference images first');
            return;
        }
        setIsGenerating(true);
        const result = await analyzeReferenceImages(referenceImages);
        setIsGenerating(false);

        if (result.success && result.text) {
            const aiMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                text: result.text,
                timestamp: new Date(),
            };
            addMessage(toStored(aiMessage));
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        } else {
            Alert.alert('Analysis failed', result.error || 'Could not analyze images');
        }
    };

    const handleSaveImage = async (imageUri: string) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant media library access to save images');
                return;
            }
            await MediaLibrary.saveToLibraryAsync(imageUri);

            const designId = `ai-design-${Date.now()}`;
            addDesign({
                id: designId,
                name: `AI Poster - ${businessName || 'Custom'}`,
                templateId: 'ai-generated',
                templateName: 'AI Generated',
                category: 'AI Posters',
                categoryIcon: '🤖',
                imageUri,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            Alert.alert('Saved!', 'Poster saved to gallery and My Designs.');
        } catch {
            Alert.alert('Error', 'Could not save image.');
        }
    };

    const handleShareImage = async (imageUri: string) => {
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(imageUri);
            }
        } catch {
            Alert.alert('Error', 'Could not share image.');
        }
    };

    // Called when PosterCompositor finishes capturing the composited image
    const handleCompositeCapture = useCallback((messageId: string, capturedUri: string) => {
        updateMessage(messageId, { compositedUri: capturedUri, imageUri: capturedUri });
    }, [updateMessage]);

    const sendMessage = async (overrideText?: string) => {
        const msgText = overrideText || inputText.trim();
        if (!msgText) return;

        Keyboard.dismiss();

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            text: msgText,
            timestamp: new Date(),
        };

        addMessage(toStored(userMessage));
        setInputText('');
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

        const context: DesignContext = {
            businessName: businessName || undefined,
            industry: industry || undefined,
            targetAudience: targetAudience || undefined,
            brandColors: brandColors ? brandColors.split(',').map(c => c.trim()) : undefined,
            logoUri: logoUri || undefined,
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        };

        const chatHistory = messages.slice(1).map((m: Message) => ({
            role: m.type === 'user' ? 'user' as const : 'ai' as const,
            text: m.text || '(image)',
        }));

        setIsGenerating(true);
        const result = await generateAdDesign({
            context,
            prompt: msgText,
            imageUris: referenceImages,
            chatHistory,
        });
        setIsGenerating(false);

        if (result.success) {
            const msgId = (Date.now() + 1).toString();
            const aiMessage: Message = {
                id: msgId,
                type: 'ai',
                text: result.text || undefined,
                // If we got a background + brief, store them for compositor
                backgroundUri: result.brief ? result.imageUri : undefined,
                brief: result.brief || undefined,
                // If no brief (text-only response), use imageUri directly
                imageUri: result.brief ? undefined : result.imageUri,
                timestamp: new Date(),
            };
            addMessage(toStored(aiMessage));
            if (aiMessage.backgroundUri || aiMessage.imageUri) {
                analytics.track('Poster Created');
                NotifyEvents.posterCreated();
            }
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
        } else {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                text: result.error || 'Something went wrong. Please try again.',
                timestamp: new Date(),
            };
            addMessage(toStored(errorMsg));
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
        }
    };

    const getDisplayImageUri = (message: Message): string | undefined => {
        return message.compositedUri || message.imageUri;
    };

    const renderMessage = (message: Message) => {
        const displayUri = getDisplayImageUri(message);
        const needsCompositing = !!message.backgroundUri && !!message.brief && !message.compositedUri;

        return (
            <View
                key={message.id}
                style={[
                    styles.messageBubble,
                    message.type === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: C.surface, borderColor: C.borderLight }],
                    (displayUri || needsCompositing) && styles.imageBubble,
                ]}
            >
                {message.type === 'ai' && (
                    <View style={styles.aiIcon}>
                        <Ionicons name="sparkles" size={14} color="#FFF" />
                    </View>
                )}

                {/* Show compositor while compositing, then show final image */}
                {needsCompositing && (
                    <View style={styles.posterContainer}>
                        <PosterCompositor
                            backgroundUri={message.backgroundUri!}
                            brief={message.brief!}
                            onCapture={(uri) => handleCompositeCapture(message.id, uri)}
                        />
                        <View style={styles.compositingIndicator}>
                            <ActivityIndicator size="small" color={C.brand} />
                            <Text style={[styles.compositingText, { color: C.textTertiary }]}>Finalizing poster...</Text>
                        </View>
                    </View>
                )}

                {displayUri && !needsCompositing && (
                    <View style={styles.posterContainer}>
                        <Image
                            source={{ uri: displayUri }}
                            style={styles.posterImage}
                            resizeMode="contain"
                        />
                        <View style={styles.posterActions}>
                            <TouchableOpacity
                                style={styles.posterActionBtn}
                                onPress={() => handleSaveImage(displayUri)}
                            >
                                <Ionicons name="download-outline" size={18} color={C.brand} />
                                <Text style={[styles.posterActionText, { color: C.brand }]}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.posterActionBtn}
                                onPress={() => handleShareImage(displayUri)}
                            >
                                <Ionicons name="share-outline" size={18} color={C.brand} />
                                <Text style={[styles.posterActionText, { color: C.brand }]}>Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.posterActionBtn}
                                onPress={() => {
                                    navigation.navigate('CreateAd', { designUri: displayUri, designName: 'AI Poster' });
                                }}
                            >
                                <Ionicons name="rocket-outline" size={18} color={C.success} />
                                <Text style={[styles.posterActionText, { color: C.success }]}>Run Ad</Text>
                            </TouchableOpacity>
                            {message.brief && message.backgroundUri && (
                                <TouchableOpacity
                                    style={styles.posterActionBtn}
                                    onPress={() => setEditingMessage(message)}
                                >
                                    <Ionicons name="create-outline" size={18} color="#FF9500" />
                                    <Text style={[styles.posterActionText, { color: '#FF9500' }]}>Edit</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {message.text && (
                    <Text style={[styles.messageText, { color: C.text }, message.type === 'user' && styles.userMessageText]}>
                        {message.text}
                    </Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: C.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Header */}
                <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.surfaceSecondary }]}>
                        <Ionicons name="chevron-back" size={22} color={C.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: C.text }]}>AI Poster Creator</Text>
                        <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>AI Poster Maker</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {storedMessages.length > 0 && (
                            <TouchableOpacity onPress={() => Alert.alert('Clear Chat', 'Delete all poster history?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Clear', style: 'destructive', onPress: clearHistory },
                            ])} style={styles.toggleBtn}>
                                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setShowContext(!showContext)} style={[styles.toggleBtn, { backgroundColor: C.brandBg }]}>
                            <Ionicons name={showContext ? 'chevron-up' : 'settings-outline'} size={20} color={C.brand} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Context Panel */}
                {showContext && (
                    <View style={[styles.contextPanel, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.contextContent}>
                                <TouchableOpacity style={[styles.uploadBox, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]} onPress={pickLogo}>
                                    {logoUri ? (
                                        <Image source={{ uri: logoUri }} style={styles.logoImage} />
                                    ) : (
                                        <>
                                            <Ionicons name="image-outline" size={28} color={C.textTertiary} />
                                            <Text style={[styles.uploadText, { color: C.textTertiary }]}>Logo</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.uploadBox, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]} onPress={pickReferenceImages}>
                                    <Ionicons name="images-outline" size={28} color={C.textTertiary} />
                                    <Text style={[styles.uploadText, { color: C.textTertiary }]}>Ref ({referenceImages.length})</Text>
                                </TouchableOpacity>

                                <TextInput
                                    style={[styles.contextInput, { backgroundColor: C.surfaceSecondary, borderColor: C.borderLight, color: C.text }]}
                                    placeholder="Business Name"
                                    value={businessName}
                                    onChangeText={setBusinessName}
                                    placeholderTextColor={C.textTertiary}
                                />
                                <TextInput
                                    style={[styles.contextInput, { backgroundColor: C.surfaceSecondary, borderColor: C.borderLight, color: C.text }]}
                                    placeholder="Industry"
                                    value={industry}
                                    onChangeText={setIndustry}
                                    placeholderTextColor={C.textTertiary}
                                />
                                <TextInput
                                    style={[styles.contextInput, { backgroundColor: C.surfaceSecondary, borderColor: C.borderLight, color: C.text }]}
                                    placeholder="Audience"
                                    value={targetAudience}
                                    onChangeText={setTargetAudience}
                                    placeholderTextColor={C.textTertiary}
                                />
                                <TextInput
                                    style={[styles.contextInput, { backgroundColor: C.surfaceSecondary, borderColor: C.borderLight, color: C.text }]}
                                    placeholder="Brand Colors"
                                    value={brandColors}
                                    onChangeText={setBrandColors}
                                    placeholderTextColor={C.textTertiary}
                                />

                                {referenceImages.length > 0 && (
                                    <TouchableOpacity style={styles.analyzeButton} onPress={analyzeImages}>
                                        <LinearGradient colors={['#1A7CFF', '#0066E6']} style={styles.analyzeGrad}>
                                            <Ionicons name="analytics-outline" size={18} color="#FFF" />
                                            <Text style={styles.analyzeButtonText}>Analyze</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        {referenceImages.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesPreview}>
                                {referenceImages.map((uri, index) => (
                                    <View key={index} style={styles.imagePreviewContainer}>
                                        <Image source={{ uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => removeReferenceImage(index)}
                                        >
                                            <Ionicons name="close-circle" size={22} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                )}

                {/* Messages */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={[styles.messagesContent, { paddingBottom: 20 }]}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map(renderMessage)}

                    {isGenerating && (
                        <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: C.surface, borderColor: C.borderLight, flexDirection: 'column', alignItems: 'center', paddingVertical: 20 }]}>
                            <LottieView
                                source={require('../../../assets/loading.json')}
                                autoPlay
                                loop
                                style={{ width: 60, height: 60 }}
                            />
                            <Text style={[styles.generatingText, { marginTop: 8, fontSize: 15, fontWeight: '700', color: C.textSecondary }]}>Creating your poster...</Text>
                            <Text style={{ color: C.textTertiary, fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
                                Image generation may take 15-30 seconds.{'\n'}Please keep the app open.{'\n'}Meanwhile, drink some water or smile! 😊
                            </Text>
                        </View>
                    )}

                    {messages.length <= 1 && !isGenerating && (
                        <View style={styles.quickPromptsSection}>
                            <Text style={[styles.quickPromptsTitle, { color: C.textTertiary }]}>Try these:</Text>
                            {QUICK_PROMPTS.map((prompt, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.quickPromptChip, { backgroundColor: C.surface, borderColor: C.borderLight }]}
                                    onPress={() => sendMessage(prompt)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="sparkles-outline" size={14} color={C.brand} />
                                    <Text style={[styles.quickPromptText, { color: C.text }]}>{prompt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                {/* Bottom input bar — padded above Android system nav */}
                <View style={[styles.inputContainer, { backgroundColor: C.surface, borderTopColor: C.borderLight, paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]}
                        placeholder="Describe your poster..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                        placeholderTextColor={C.textTertiary}
                        returnKeyType="send"
                        blurOnSubmit={false}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() || isGenerating) && styles.sendButtonDisabled]}
                        onPress={() => sendMessage()}
                        disabled={!inputText.trim() || isGenerating}
                    >
                        <LinearGradient
                            colors={inputText.trim() && !isGenerating ? ['#1A7CFF', '#0066E6'] : [C.surfaceSecondary, C.surfaceSecondary]}
                            style={styles.sendButtonGradient}
                        >
                            <Ionicons
                                name={isGenerating ? 'hourglass-outline' : 'send'}
                                size={18}
                                color={inputText.trim() && !isGenerating ? '#FFF' : C.textTertiary}
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Edit Poster Modal */}
            {editingMessage?.brief && (
                <PosterEditModal
                    visible={!!editingMessage}
                    brief={editingMessage.brief}
                    backgroundUri={editingMessage.backgroundUri || ''}
                    onClose={() => setEditingMessage(null)}
                    onSave={(updatedBrief: PosterBrief) => {
                        // Update message with new brief and re-composite
                        updateMessage(editingMessage.id, {
                            brief: updatedBrief,
                            compositedUri: undefined,
                            imageUri: undefined,
                        });
                        setEditingMessage(null);
                    }}
                    C={C}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F2',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1D1D1F', letterSpacing: -0.3 },
    headerSubtitle: { fontSize: 11, color: '#86868B', marginTop: 1 },
    toggleBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#EEF4FF', justifyContent: 'center', alignItems: 'center',
    },
    contextPanel: {
        backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F2', paddingVertical: 10,
    },
    contextContent: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
    uploadBox: {
        width: 80, height: 80, borderRadius: 14,
        borderWidth: 1.5, borderColor: '#E5E5E7', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA',
    },
    uploadText: { fontSize: 11, fontWeight: '500', color: '#86868B', marginTop: 2 },
    logoImage: { width: '100%', height: '100%', borderRadius: 12 },
    contextInput: {
        height: 80, minWidth: 120, paddingHorizontal: 14,
        borderRadius: 14, borderWidth: 1, borderColor: '#F0F0F2',
        backgroundColor: '#FAFAFA', fontSize: 14, color: '#1D1D1F',
    },
    analyzeButton: { height: 80, borderRadius: 14, overflow: 'hidden' },
    analyzeGrad: {
        height: '100%', paddingHorizontal: 20,
        justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6,
    },
    analyzeButtonText: { fontWeight: '600', fontSize: 13, color: '#FFF' },
    imagesPreview: { marginTop: 8, paddingHorizontal: 12 },
    imagePreviewContainer: { marginRight: 8, position: 'relative' },
    imagePreview: { width: 64, height: 64, borderRadius: 10 },
    removeImageButton: { position: 'absolute', top: -6, right: -6 },
    messagesContainer: { flex: 1 },
    messagesContent: { padding: 16, gap: 8 },
    messageBubble: { maxWidth: '88%', padding: 14, borderRadius: 18, marginBottom: 4 },
    imageBubble: { padding: 8, maxWidth: '94%' },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#1A7CFF', borderBottomRightRadius: 4 },
    aiBubble: {
        alignSelf: 'flex-start', backgroundColor: '#FFF',
        borderWidth: 1, borderColor: '#F0F0F2', borderBottomLeftRadius: 4,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
            android: { elevation: 1 },
        }),
    },
    loadingBubble: { flexDirection: 'row', alignItems: 'center' },
    aiIcon: {
        width: 22, height: 22, borderRadius: 11, backgroundColor: '#1A7CFF',
        justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    },
    posterContainer: { marginBottom: 4 },
    posterImage: {
        width: IMAGE_MAX_WIDTH, height: IMAGE_MAX_WIDTH,
        borderRadius: 14,
    },
    posterActions: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, paddingHorizontal: 4,
    },
    posterActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8,
    },
    posterActionText: { fontWeight: '600', fontSize: 13, color: '#1A7CFF' },
    messageText: { fontSize: 15, color: '#1D1D1F', lineHeight: 21 },
    userMessageText: { color: '#FFF' },
    generatingText: { fontWeight: '500', fontSize: 14, color: '#86868B', marginLeft: 10 },
    compositingIndicator: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 8, gap: 8,
    },
    compositingText: { fontSize: 13, color: '#86868B', fontWeight: '500' },
    quickPromptsSection: { marginTop: 8, gap: 8 },
    quickPromptsTitle: { fontSize: 13, fontWeight: '600', color: '#86868B', marginBottom: 4 },
    quickPromptChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 12,
        backgroundColor: '#FFF', borderRadius: 14,
        borderWidth: 1, borderColor: '#EEF4FF',
    },
    quickPromptText: { fontSize: 14, color: '#1D1D1F' },
    inputContainer: {
        flexDirection: 'row', padding: 12, backgroundColor: '#FFF',
        borderTopWidth: 1, borderTopColor: '#F0F0F2', gap: 8,
    },
    input: {
        flex: 1, minHeight: 42, maxHeight: 100,
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 21, borderWidth: 1, borderColor: '#F0F0F2',
        backgroundColor: '#FAFAFA', fontSize: 15, color: '#1D1D1F',
    },
    sendButton: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden' },
    sendButtonDisabled: { opacity: 0.5 },
    sendButtonGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
});
