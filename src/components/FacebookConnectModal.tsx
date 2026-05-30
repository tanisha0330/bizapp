import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Radius, Spacing, useColors } from '../utils/theme' // Adjust path if needed

interface FacebookConnectModalProps {
    visible: boolean;
    onClose: () => void;
    onConnect: () => void;
    loading: boolean;
}

export const FacebookConnectModal = ({ visible, onClose, onConnect, loading }: FacebookConnectModalProps) => {
    const C = useColors();

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: C.borderLight }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.modalTitle, { color: C.text }]}>Connect Facebook</Text>
                            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>Grant access to view ad performance</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={C.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false} bounces={false}>
                        <View style={styles.modalIconContainer}>
                            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.facebook, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="logo-facebook" size={32} color="white" />
                            </View>
                        </View>

                        <View style={styles.permissionBox}>
                            <Text style={styles.permissionTitle}>You are providing access to:</Text>
                            {[
                                { icon: 'document-text', title: 'Page Access', desc: 'Read data from your Facebook Pages' },
                                { icon: 'briefcase', title: 'Campaign Access', desc: 'Read ad campaigns and retrieve leads' },
                                { icon: 'analytics', title: 'Insights & Analytics', desc: 'View performance metrics and reports' },
                            ].map((perm, i) => (
                                <View key={i} style={styles.permissionItem}>
                                    <View style={styles.permissionIconBox}>
                                        <Ionicons name={perm.icon as any} size={18} color={Colors.brand} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.permissionItemTitle}>{perm.title}</Text>
                                        <Text style={styles.permissionItemDesc}>{perm.desc}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <Text style={styles.modalNote}>
                            By connecting, you allow Biz499 to fetch real-time analytics and retrieve lead data securely on your behalf.
                        </Text>

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={onConnect}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="logo-facebook" size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.modalButtonText}>Continue with Facebook</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    modalContent: { borderRadius: Radius['2xl'], width: '100%', maxWidth: 400, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1 },
    modalTitle: { fontFamily: Fonts.bold, fontSize: FontSize.xl },
    modalSubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.sm, marginTop: 2 },
    closeButton: { padding: 4 },
    modalScroll: { padding: 20, paddingBottom: 24 },
    modalIconContainer: { alignItems: 'center', marginBottom: 16 },
    permissionBox: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, padding: 16, marginBottom: 16 },
    permissionTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, marginBottom: 12 },
    permissionItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    permissionIconBox: { width: 36, height: 36, borderRadius: 20, backgroundColor: Colors.brandBg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    permissionItemTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.base, marginBottom: 2 },
    permissionItemDesc: { fontFamily: Fonts.regular, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
    modalNote: { fontFamily: Fonts.regular, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.xl, paddingHorizontal: 10 },
    modalButton: { backgroundColor: Colors.facebook, paddingVertical: 16, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    modalButtonText: { fontFamily: Fonts.semiBold, color: '#FFFFFF', fontSize: FontSize.md },
    cancelButton: { paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.md },
    cancelButtonText: { fontFamily: Fonts.medium, fontSize: FontSize.base, color: Colors.textTertiary },
});