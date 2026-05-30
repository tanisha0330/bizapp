import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Linking, ScrollView, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Lead } from '../../store/useLeadStore';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow, Gradients, useColors } from '../../utils/theme';

export const STATUS_COLORS: Record<Lead['status'], { color: string; bg: string }> = {
    New: { color: Colors.success, bg: Colors.successBg },
    Contacted: { color: Colors.warning, bg: Colors.warningBg },
    Qualified: { color: Colors.info, bg: Colors.infoBg },
    Converted: { color: Colors.brand, bg: Colors.brandBg },
    Lost: { color: Colors.textTertiary, bg: Colors.surfaceSecondary },
};

export const ALL_STATUSES: Lead['status'][] = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];

// ─── Lead Card (compact, tappable) ────────────────────────────────────────────
export const LeadCard = ({ lead, onPress }: { lead: Lead; onPress: () => void }) => {
    const C = useColors();
    const statusConfig = STATUS_COLORS[lead.status];
    return (
        <TouchableOpacity
            style={[s.leadCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={s.leadHeader}>
                <View style={[s.avatarContainer, { backgroundColor: statusConfig.bg }]}>
                    <Text style={s.avatarEmoji}>{lead.avatar}</Text>
                    {lead.status === 'New' && <View style={s.newBadge} />}
                </View>
                <View style={s.leadInfo}>
                    <Text style={[s.leadName, { color: C.text }]} numberOfLines={1}>{lead.name}</Text>
                    <Text style={[s.adSource, { color: C.textSecondary }]} numberOfLines={1}>via {lead.adSource}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.leadTime, { color: C.textTertiary }]}>
                        {new Date(lead.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                    <View style={[s.statusBadge, { backgroundColor: statusConfig.bg, marginTop: 4 }]}>
                        <View style={[s.statusDot, { backgroundColor: statusConfig.color }]} />
                        <Text style={[s.statusText, { color: statusConfig.color }]}>{lead.status}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ─── Lead Detail Modal ─────────────────────────────────────────────────────────
export const LeadDetailModal = ({
    lead, visible, onClose, onUpdateStatus, onAddNote, onDelete,
}: {
    lead: Lead | null;
    visible: boolean;
    onClose: () => void;
    onUpdateStatus: (id: string, status: Lead['status']) => void;
    onAddNote: (id: string, note: string) => void;
    onDelete: (id: string) => void;
}) => {
    const C = useColors();
    const [noteText, setNoteText] = useState('');
    const [pendingStatus, setPendingStatus] = useState<Lead['status'] | null>(null);

    useEffect(() => { setPendingStatus(null); }, [lead?.id]);

    if (!lead) return null;

    const currentStatus = pendingStatus ?? lead.status;
    const statusConfig = STATUS_COLORS[currentStatus];
    const hasChange = pendingStatus !== null && pendingStatus !== lead.status;

    const handleCall = () => Linking.openURL(`tel:${lead.phone.replace(/\s/g, '')}`);
    const handleWhatsApp = () => Linking.openURL(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`);
    const handleEmail = () => lead.email && Linking.openURL(`mailto:${lead.email}`);

    const handleAddNote = () => {
        if (!noteText.trim()) return;
        onAddNote(lead.id, noteText.trim());
        setNoteText('');
    };

    const handleSaveStatus = () => {
        if (pendingStatus && pendingStatus !== lead.status) {
            onUpdateStatus(lead.id, pendingStatus);
            setPendingStatus(null);
        }
    };

    const handleClose = () => { setPendingStatus(null); onClose(); };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={s.modalOverlay}>
                <View style={[s.modalContent, { maxHeight: '85%', backgroundColor: C.surface }]}>
                    <View style={[s.modalHeader, { borderBottomColor: C.borderLight }]}>
                        <Text style={[s.modalTitle, { color: C.text }]}>Lead Details</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close" size={24} color={C.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
                        {/* Profile */}
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <View style={[s.detailAvatar, { backgroundColor: statusConfig.bg }]}>
                                <Text style={{ fontSize: 28, fontFamily: Fonts.bold, color: statusConfig.color }}>{lead.avatar}</Text>
                            </View>
                            <Text style={[s.detailName, { color: C.text }]}>{lead.name}</Text>
                            <Text style={[s.detailSource, { color: C.textSecondary }]}>via {lead.adSource}</Text>
                            <Text style={[s.detailDate, { color: C.textTertiary }]}>
                                {new Date(lead.timestamp).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                            </Text>
                        </View>

                        {/* Status Picker */}
                        <View style={s.statusPickerRow}>
                            {ALL_STATUSES.map(st => {
                                const sc = STATUS_COLORS[st];
                                const isActive = currentStatus === st;
                                return (
                                    <TouchableOpacity
                                        key={st}
                                        style={[s.statusPickerBtn, { backgroundColor: isActive ? sc.bg : C.surfaceSecondary, borderWidth: isActive ? 1.5 : 0, borderColor: sc.color }]}
                                        onPress={() => setPendingStatus(st)}
                                    >
                                        <View style={[s.statusDot, { backgroundColor: sc.color }]} />
                                        <Text style={[s.statusPickerText, { color: isActive ? sc.color : Colors.textSecondary }]}>{st}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {hasChange && (
                            <TouchableOpacity onPress={handleSaveStatus} style={[s.saveStatusBtn, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color }]}>
                                <Ionicons name="checkmark-circle" size={16} color={statusConfig.color} />
                                <Text style={[s.saveStatusText, { color: statusConfig.color }]}>Save as {pendingStatus}</Text>
                            </TouchableOpacity>
                        )}

                        {/* Contact Info */}
                        <Text style={[s.detailSectionTitle, { color: C.text }]}>Contact Information</Text>
                        <View style={[s.detailCard, { backgroundColor: C.surfaceSecondary }]}>
                            {lead.phone ? (
                                <View style={s.detailRow}>
                                    <Ionicons name="call-outline" size={18} color={C.textSecondary} />
                                    <Text style={[s.detailRowText, { color: C.text }]}>{lead.phone}</Text>
                                </View>
                            ) : null}
                            {lead.email ? (
                                <View style={s.detailRow}>
                                    <Ionicons name="mail-outline" size={18} color={C.textSecondary} />
                                    <Text style={[s.detailRowText, { color: C.text }]}>{lead.email}</Text>
                                </View>
                            ) : null}
                            {lead.city ? (
                                <View style={s.detailRow}>
                                    <Ionicons name="location-outline" size={18} color={C.textSecondary} />
                                    <Text style={[s.detailRowText, { color: C.text }]}>{lead.city}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Custom form fields */}
                        {lead.customFields && Object.keys(lead.customFields).length > 0 && (
                            <>
                                <Text style={[s.detailSectionTitle, { color: C.text }]}>Form Answers</Text>
                                <View style={[s.detailCard, { backgroundColor: C.surfaceSecondary }]}>
                                    {Object.entries(lead.customFields).map(([key, value]) => (
                                        <View key={key} style={s.detailRow}>
                                            <Ionicons name="help-circle-outline" size={18} color={C.textSecondary} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: C.textTertiary, marginBottom: 1 }}>
                                                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                </Text>
                                                <Text style={[s.detailRowText, { color: C.text }]}>{value}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Quick Actions */}
                        <Text style={[s.detailSectionTitle, { color: C.text }]}>Quick Actions</Text>
                        <View style={s.detailActions}>
                            <TouchableOpacity style={s.detailActionBtn} onPress={handleCall}>
                                <View style={[s.detailActionIcon, { backgroundColor: '#E8F8ED' }]}>
                                    <Ionicons name="call" size={22} color="#34C759" />
                                </View>
                                <Text style={s.detailActionLabel}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.detailActionBtn} onPress={handleWhatsApp}>
                                <View style={[s.detailActionIcon, { backgroundColor: '#E8F8ED' }]}>
                                    <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                                </View>
                                <Text style={s.detailActionLabel}>WhatsApp</Text>
                            </TouchableOpacity>
                            {lead.email ? (
                                <TouchableOpacity style={s.detailActionBtn} onPress={handleEmail}>
                                    <View style={[s.detailActionIcon, { backgroundColor: '#EEF4FF' }]}>
                                        <Ionicons name="mail" size={22} color="#1A7CFF" />
                                    </View>
                                    <Text style={s.detailActionLabel}>Email</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Notes */}
                        <Text style={[s.detailSectionTitle, { color: C.text }]}>Notes</Text>
                        <View style={[s.detailCard, { backgroundColor: C.surfaceSecondary }]}>
                            {lead.notes ? (
                                <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: C.text, marginBottom: 10, lineHeight: 18 }}>{lead.notes}</Text>
                            ) : (
                                <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: C.textTertiary, marginBottom: 10 }}>No notes yet</Text>
                            )}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    style={[s.noteInput, { backgroundColor: C.surface, borderColor: C.borderLight, color: C.text }]}
                                    placeholder="Add a note..."
                                    placeholderTextColor="#A1A1A6"
                                    value={noteText}
                                    onChangeText={setNoteText}
                                    multiline
                                />
                                <TouchableOpacity onPress={handleAddNote} style={s.noteAddBtn}>
                                    <Ionicons name="send" size={18} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Delete */}
                        <TouchableOpacity
                            style={s.detailDeleteBtn}
                            onPress={() => { onDelete(lead.id); handleClose(); }}
                        >
                            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: '#FF3B30', marginLeft: 6 }}>Delete Lead</Text>
                        </TouchableOpacity>

                        <View style={{ height: 30 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ─── Shared styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    // Lead Card
    leadCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
        marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight, ...Shadow.sm,
    },
    leadHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarEmoji: { fontSize: 18, fontFamily: Fonts.bold },
    newBadge: {
        position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderRadius: 5,
        backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.surface,
    },
    leadInfo: { flex: 1, marginRight: 8 },
    leadName: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.text, marginBottom: 1 },
    adSource: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textSecondary },
    leadTime: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: Fonts.medium, fontSize: 10 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1 },
    modalTitle: { fontFamily: Fonts.bold, fontSize: FontSize.lg, color: Colors.text },

    // Detail
    detailAvatar: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    detailName: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.text, textAlign: 'center' },
    detailSource: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
    detailDate: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
    statusPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, justifyContent: 'center' },
    statusPickerBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 5 },
    statusPickerText: { fontFamily: Fonts.semiBold, fontSize: 12 },
    saveStatusBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 16 },
    saveStatusText: { fontFamily: Fonts.bold, fontSize: 14 },
    detailSectionTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.text, marginBottom: 8, marginTop: 4 },
    detailCard: { backgroundColor: Colors.surfaceSecondary, borderRadius: 12, padding: 14, marginBottom: 16 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    detailRowText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.text, flex: 1 },
    detailActions: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    detailActionBtn: { alignItems: 'center', flex: 1 },
    detailActionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    detailActionLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textSecondary },
    noteInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontFamily: Fonts.regular, fontSize: 13, color: Colors.text, borderWidth: 1, minHeight: 40 },
    noteAddBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.brand, justifyContent: 'center', alignItems: 'center' },
    detailDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', marginTop: 4 },
});
