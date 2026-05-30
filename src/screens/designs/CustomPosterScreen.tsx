import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ViewShot from 'react-native-view-shot';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useDesignStore } from '../../store/useDesignStore';
import { Colors, Fonts, FontSize, Radius, Spacing, useColors } from '../../utils/theme';
import { captureAndSaveDesign, showExportError } from '../../utils/designExport';

type PosterText = {
    id: string;
    value: string;
    color: string;
    fontSize: number;
    y: number;
    align: 'left' | 'center' | 'right';
    bold: boolean;
    visible: boolean;
};

type EditorTab = 'image' | 'text' | 'style' | 'export';

const TEXT_COLORS = ['#FFFFFF', '#111827', '#1A7CFF', '#FFAA00', '#00D68F', '#FF4757'];
const BG_COLORS = ['#111827', '#1A7CFF', '#00B894', '#FF8C00', '#E4405F', '#FFFFFF'];

const newText = (value: string, y: number, fontSize = 28): PosterText => ({
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    value,
    color: '#FFFFFF',
    fontSize,
    y,
    align: 'center',
    bold: true,
    visible: true,
});

export const CustomPosterScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const C = useColors();
    const { width } = useWindowDimensions();
    const viewShotRef = useRef<ViewShot>(null);
    const addDesign = useDesignStore(s => s.addDesign);

    const canvasSize = Math.min(width - 32, 420);
    const [activeTab, setActiveTab] = useState<EditorTab>('image');
    const [saving, setSaving] = useState(false);
    const editImageUri = route.params?.imageUri as string | undefined;
    const editName = route.params?.designName as string | undefined;
    const [posterName, setPosterName] = useState(editName ? `${editName} Edit` : 'Custom Poster');
    const [imageUri, setImageUri] = useState<string | null>(editImageUri || null);
    const [backgroundColor, setBackgroundColor] = useState('#111827');
    const [overlayOpacity, setOverlayOpacity] = useState(25);
    const [showBadge, setShowBadge] = useState(true);
    const [badgeText, setBadgeText] = useState('Call Now');
    const [badgeColor, setBadgeColor] = useState('#1A7CFF');
    const [texts, setTexts] = useState<PosterText[]>([
        newText('Your Big Offer', 12, 34),
        newText('Add details, price, date or location', 48, 19),
    ]);
    const [selectedTextId, setSelectedTextId] = useState(texts[0].id);

    const selectedText = useMemo(
        () => texts.find(item => item.id === selectedTextId) || texts[0],
        [texts, selectedTextId]
    );

    const updateText = (id: string, patch: Partial<PosterText>) => {
        setTexts(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow photo access to upload your poster image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.95,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const capturePoster = async (saveToPhone: boolean) => {
        const designId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const name = posterName.trim() || 'Custom Poster';
        const now = new Date().toISOString();

        const { imageUri, phoneSaved } = await captureAndSaveDesign({
            viewRef: viewShotRef,
            addDesign,
            saveToPhone,
            design: {
                id: designId,
                name,
                templateId: 'custom-poster',
                templateName: 'Create Your Own Poster',
                category: 'Custom',
                categoryIcon: '🎨',
                createdAt: now,
                updatedAt: now,
            },
        });

        return { uri: imageUri, name, phoneSaved };
    };

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const saved = await capturePoster(true);
            Alert.alert(
                'Saved!',
                saved.phoneSaved
                    ? 'Poster saved to your phone and My Designs.'
                    : 'Poster saved to My Designs. Phone gallery permission was not granted.'
            );
        } catch {
            showExportError('Could not save');
        } finally {
            setSaving(false);
        }
    };

    const handleRunAd = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const saved = await capturePoster(false);
            navigation.navigate('CreateAd', { designUri: saved.uri, designName: saved.name });
        } catch {
            showExportError('Could not prepare ad');
        } finally {
            setSaving(false);
        }
    };

    const tabs: { key: EditorTab; label: string; icon: string }[] = [
        { key: 'image', label: 'Image', icon: 'image-outline' },
        { key: 'text', label: 'Text', icon: 'text' },
        { key: 'style', label: 'Style', icon: 'color-palette-outline' },
        { key: 'export', label: 'Save', icon: 'download-outline' },
    ];

    return (
        <ScreenWrapper bg="bg-white" style={{ backgroundColor: C.background }}>
            <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: C.surfaceSecondary }]}>
                    <Ionicons name="chevron-back" size={24} color={C.text} />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: C.text }]}>Create Your Own Poster</Text>
                    <Text style={[styles.subtitle, { color: C.textSecondary }]}>Upload, add text, save or run an ad</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
                    <View collapsable={false} style={[styles.canvas, { width: canvasSize, height: canvasSize, backgroundColor }]}>
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        ) : (
                            <LinearGradient
                                colors={[backgroundColor, '#0F172A']}
                                style={StyleSheet.absoluteFillObject}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                        )}
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `rgba(0,0,0,${overlayOpacity / 100})` }]} />

                        {texts.filter(item => item.visible).map(item => (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setSelectedTextId(item.id);
                                    setActiveTab('text');
                                }}
                                style={[
                                    styles.textLayer,
                                    {
                                        top: `${item.y}%`,
                                        borderColor: selectedTextId === item.id ? 'rgba(255,255,255,0.65)' : 'transparent',
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: item.color,
                                        fontSize: item.fontSize,
                                        fontFamily: item.bold ? Fonts.extraBold : Fonts.semiBold,
                                        textAlign: item.align,
                                    }}
                                    numberOfLines={3}
                                >
                                    {item.value}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        {showBadge && (
                            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                                <Text style={styles.badgeText}>{badgeText}</Text>
                            </View>
                        )}
                    </View>
                </ViewShot>

                <View style={[styles.nameBox, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
                    <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Poster name</Text>
                    <TextInput
                        value={posterName}
                        onChangeText={setPosterName}
                        placeholder="Custom Poster"
                        placeholderTextColor={C.textTertiary}
                        style={[styles.nameInput, { color: C.text }]}
                    />
                </View>

                <View style={[styles.tabBar, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, activeTab === tab.key && { backgroundColor: C.brandBg }]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? C.brand : C.textTertiary} />
                            <Text style={[styles.tabText, { color: activeTab === tab.key ? C.brand : C.textSecondary }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[styles.panel, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
                    {activeTab === 'image' && (
                        <View>
                            <Text style={[styles.panelTitle, { color: C.text }]}>Poster Image</Text>
                            <TouchableOpacity style={[styles.uploadButton, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]} onPress={pickImage}>
                                <Ionicons name="cloud-upload-outline" size={24} color={C.brand} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.uploadTitle, { color: C.text }]}>{imageUri ? 'Change image' : 'Upload image'}</Text>
                                    <Text style={[styles.helperText, { color: C.textSecondary }]}>Square photos work best for ads.</Text>
                                </View>
                            </TouchableOpacity>
                            {imageUri && (
                                <TouchableOpacity style={styles.clearImageButton} onPress={() => setImageUri(null)}>
                                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                                    <Text style={[styles.clearImageText, { color: C.danger }]}>Remove image</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {activeTab === 'text' && selectedText && (
                        <View>
                            <View style={styles.panelHeader}>
                                <Text style={[styles.panelTitle, { color: C.text }]}>Text Layers</Text>
                                <TouchableOpacity
                                    style={[styles.smallAction, { backgroundColor: C.brand }]}
                                    onPress={() => {
                                        const item = newText('New text', 28, 24);
                                        setTexts(prev => [...prev, item]);
                                        setSelectedTextId(item.id);
                                    }}
                                >
                                    <Ionicons name="add" size={17} color="#FFF" />
                                    <Text style={styles.smallActionText}>Add</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layerList}>
                                {texts.map((item, index) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.layerChip,
                                            { borderColor: selectedTextId === item.id ? C.brand : C.border, backgroundColor: selectedTextId === item.id ? C.brandBg : C.surfaceSecondary },
                                        ]}
                                        onPress={() => setSelectedTextId(item.id)}
                                    >
                                        <Text style={[styles.layerChipText, { color: selectedTextId === item.id ? C.brand : C.textSecondary }]}>Text {index + 1}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TextInput
                                value={selectedText.value}
                                onChangeText={value => updateText(selectedText.id, { value })}
                                multiline
                                placeholder="Write your poster text"
                                placeholderTextColor={C.textTertiary}
                                style={[styles.textInput, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
                            />

                            <View style={styles.controlRow}>
                                <TouchableOpacity style={styles.controlButton} onPress={() => updateText(selectedText.id, { fontSize: Math.max(12, selectedText.fontSize - 2) })}>
                                    <Text style={styles.controlText}>A-</Text>
                                </TouchableOpacity>
                                <Text style={[styles.valueText, { color: C.textSecondary }]}>{selectedText.fontSize}px</Text>
                                <TouchableOpacity style={styles.controlButton} onPress={() => updateText(selectedText.id, { fontSize: Math.min(54, selectedText.fontSize + 2) })}>
                                    <Text style={styles.controlText}>A+</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.controlButton} onPress={() => updateText(selectedText.id, { bold: !selectedText.bold })}>
                                    <Ionicons name={selectedText.bold ? 'text' : 'text-outline'} size={18} color="#1A7CFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.controlButton} onPress={() => updateText(selectedText.id, { visible: !selectedText.visible })}>
                                    <Ionicons name={selectedText.visible ? 'eye' : 'eye-off'} size={18} color="#1A7CFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.positionGrid}>
                                {[
                                    { label: 'Top', y: 10 },
                                    { label: 'Middle', y: 42 },
                                    { label: 'Bottom', y: 72 },
                                ].map(item => (
                                    <TouchableOpacity key={item.label} style={[styles.positionButton, { borderColor: C.border }]} onPress={() => updateText(selectedText.id, { y: item.y })}>
                                        <Text style={[styles.positionText, { color: C.text }]}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.positionGrid}>
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <TouchableOpacity key={align} style={[styles.positionButton, { borderColor: C.border }]} onPress={() => updateText(selectedText.id, { align })}>
                                        <Text style={[styles.positionText, { color: C.text }]}>{align}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <ColorDots colors={TEXT_COLORS} selected={selectedText.color} onSelect={color => updateText(selectedText.id, { color })} />

                            {texts.length > 1 && (
                                <TouchableOpacity
                                    style={styles.deleteTextButton}
                                    onPress={() => {
                                        setTexts(prev => prev.filter(item => item.id !== selectedText.id));
                                        setSelectedTextId(texts.find(item => item.id !== selectedText.id)?.id || texts[0].id);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                                    <Text style={[styles.clearImageText, { color: C.danger }]}>Delete selected text</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {activeTab === 'style' && (
                        <View>
                            <Text style={[styles.panelTitle, { color: C.text }]}>Style</Text>
                            <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Background color</Text>
                            <ColorDots colors={BG_COLORS} selected={backgroundColor} onSelect={setBackgroundColor} />

                            <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Dark overlay</Text>
                            <View style={styles.controlRow}>
                                <TouchableOpacity style={styles.controlButton} onPress={() => setOverlayOpacity(Math.max(0, overlayOpacity - 5))}>
                                    <Ionicons name="remove" size={18} color="#1A7CFF" />
                                </TouchableOpacity>
                                <Text style={[styles.valueText, { color: C.textSecondary }]}>{overlayOpacity}%</Text>
                                <TouchableOpacity style={styles.controlButton} onPress={() => setOverlayOpacity(Math.min(70, overlayOpacity + 5))}>
                                    <Ionicons name="add" size={18} color="#1A7CFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.switchRow}>
                                <View>
                                    <Text style={[styles.uploadTitle, { color: C.text }]}>CTA badge</Text>
                                    <Text style={[styles.helperText, { color: C.textSecondary }]}>Use it for phone, offer, or action text.</Text>
                                </View>
                                <TouchableOpacity style={[styles.toggle, { backgroundColor: showBadge ? C.brand : C.surfaceSecondary }]} onPress={() => setShowBadge(!showBadge)}>
                                    <View style={[styles.toggleDot, { alignSelf: showBadge ? 'flex-end' : 'flex-start' }]} />
                                </TouchableOpacity>
                            </View>

                            {showBadge && (
                                <>
                                    <TextInput
                                        value={badgeText}
                                        onChangeText={setBadgeText}
                                        placeholder="Call Now"
                                        placeholderTextColor={C.textTertiary}
                                        style={[styles.nameInput, styles.badgeInput, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
                                    />
                                    <ColorDots colors={TEXT_COLORS} selected={badgeColor} onSelect={setBadgeColor} />
                                </>
                            )}
                        </View>
                    )}

                    {activeTab === 'export' && (
                        <View>
                            <Text style={[styles.panelTitle, { color: C.text }]}>Ready to use</Text>
                            <Text style={[styles.helperText, { color: C.textSecondary }]}>Save your poster to the phone or use it directly as an ad creative.</Text>
                            <View style={styles.exportActions}>
                                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: C.brand }]} onPress={handleSave} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#FFF" /> : <Ionicons name="download-outline" size={20} color="#FFF" />}
                                    <Text style={styles.primaryButtonText}>Save to Phone</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: C.success }]} onPress={handleRunAd} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#FFF" /> : <Ionicons name="rocket-outline" size={20} color="#FFF" />}
                                    <Text style={styles.primaryButtonText}>Run Ad</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const ColorDots = ({ colors, selected, onSelect }: { colors: string[]; selected: string; onSelect: (color: string) => void }) => (
    <View style={styles.colorRow}>
        {colors.map(color => (
            <TouchableOpacity
                key={color}
                style={[
                    styles.colorDot,
                    { backgroundColor: color, borderColor: selected === color ? '#1A7CFF' : 'rgba(0,0,0,0.12)' },
                ]}
                onPress={() => onSelect(color)}
            />
        ))}
    </View>
);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.md,
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    content: {
        alignItems: 'center',
        padding: 16,
        paddingBottom: 120,
    },
    canvas: {
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: Colors.text,
    },
    textLayer: {
        position: 'absolute',
        left: 18,
        right: 18,
        padding: 6,
        borderWidth: 1,
        borderRadius: 8,
    },
    badge: {
        position: 'absolute',
        left: 18,
        bottom: 18,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    badgeText: {
        color: '#FFF',
        fontFamily: Fonts.bold,
        fontSize: 15,
    },
    nameBox: {
        width: '100%',
        marginTop: 16,
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
    },
    inputLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.sm,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    nameInput: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.base,
        paddingVertical: 0,
    },
    tabBar: {
        width: '100%',
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 8,
        padding: 4,
        marginTop: 14,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: 6,
    },
    tabText: {
        fontFamily: Fonts.semiBold,
        fontSize: 11,
        marginTop: 3,
    },
    panel: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        marginTop: 14,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    panelTitle: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.md,
        marginBottom: 10,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
    },
    uploadTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.base,
    },
    helperText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.sm,
        lineHeight: 18,
    },
    clearImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        marginTop: 14,
    },
    clearImageText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.sm,
    },
    smallAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    smallActionText: {
        color: '#FFF',
        fontFamily: Fonts.bold,
        fontSize: FontSize.sm,
    },
    layerList: {
        gap: 8,
        paddingBottom: 12,
    },
    layerChip: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    layerChipText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.sm,
    },
    textInput: {
        minHeight: 84,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.base,
        textAlignVertical: 'top',
    },
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    controlButton: {
        minWidth: 44,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#E7F3FF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    controlText: {
        color: '#1A7CFF',
        fontFamily: Fonts.bold,
        fontSize: FontSize.base,
    },
    valueText: {
        flex: 1,
        textAlign: 'center',
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.sm,
    },
    positionGrid: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    positionButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    positionText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.sm,
        textTransform: 'capitalize',
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 12,
    },
    colorDot: {
        width: 34,
        height: 34,
        borderRadius: 8,
        borderWidth: 3,
    },
    deleteTextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        marginTop: 16,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 16,
    },
    toggle: {
        width: 52,
        height: 30,
        borderRadius: 8,
        padding: 4,
        justifyContent: 'center',
    },
    toggleDot: {
        width: 22,
        height: 22,
        borderRadius: 7,
        backgroundColor: '#FFF',
    },
    badgeInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 12,
    },
    exportActions: {
        gap: 12,
        marginTop: 16,
    },
    primaryButton: {
        height: 50,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFF',
        fontFamily: Fonts.bold,
        fontSize: FontSize.base,
    },
});
