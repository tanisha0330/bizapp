import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
    Image,
    Alert,
    Linking,
    Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/useAuthStore';
import { api, API_BASE } from '../../services/api';
import { Colors, Fonts, FontSize, Radius, Shadow, useColors } from '../../utils/theme';
import { NotifyEvents } from '../../services/notifications';
import { analytics } from '../../services/mixpanel';

// ─── Types & Constants ──────────────────────────────────────────

interface SiteData {
    businessName: string;
    tagline: string;
    about: string;
    services: string[];
    phone: string;
    email: string;
    address: string;
    whatsapp: string;
    heroButtonText: string;
    testimonials: { name: string; text: string }[];
    socialLinks: { facebook: string; instagram: string; youtube: string };
    logoUri: string;
    galleryImages: string[];
    contactFormEnabled: boolean;
    mapEmbedUrl: string;
}

const STEPS = ['Info', 'Design', 'Media', 'Preview'];

const THEMES = [
    { id: 'modern', name: 'Modern Blue', primary: '#2563EB', secondary: '#1E40AF', accent: '#3B82F6', bg: '#F8FAFC', text: '#0F172A', icon: 'diamond-outline' },
    { id: 'dark', name: 'Dark Premium', primary: '#1F2937', secondary: '#111827', accent: '#F59E0B', bg: '#030712', text: '#F9FAFB', icon: 'moon-outline' },
    { id: 'nature', name: 'Nature Green', primary: '#059669', secondary: '#047857', accent: '#10B981', bg: '#F0FDF4', text: '#064E3B', icon: 'leaf-outline' },
    { id: 'warm', name: 'Warm Sunset', primary: '#EA580C', secondary: '#C2410C', accent: '#FB923C', bg: '#FFF7ED', text: '#431407', icon: 'sunny-outline' },
    { id: 'royal', name: 'Royal Purple', primary: '#7C3AED', secondary: '#6D28D9', accent: '#A78BFA', bg: '#FAF5FF', text: '#2E1065', icon: 'sparkles-outline' },
    { id: 'rose', name: 'Elegant Rose', primary: '#E11D48', secondary: '#BE123C', accent: '#FB7185', bg: '#FFF1F2', text: '#4C0519', icon: 'heart-outline' },
];

const FONT_PAIRS = [
    { id: 'inter', name: 'Clean & Modern', heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    { id: 'playfair', name: 'Classic & Elegant', heading: "'Playfair Display', serif", body: "'Inter', sans-serif" },
    { id: 'poppins', name: 'Friendly & Round', heading: "'Poppins', sans-serif", body: "'Poppins', sans-serif" },
    { id: 'montserrat', name: 'Bold & Strong', heading: "'Montserrat', sans-serif", body: "'Open Sans', sans-serif" },
];

const SECTION_OPTIONS = [
    { id: 'hero', label: 'Hero Banner', icon: 'image-outline', required: true },
    { id: 'about', label: 'About Us', icon: 'information-circle-outline', required: false },
    { id: 'services', label: 'Services', icon: 'briefcase-outline', required: false },
    { id: 'gallery', label: 'Photo Gallery', icon: 'images-outline', required: false },
    { id: 'testimonials', label: 'Testimonials', icon: 'chatbubble-outline', required: false },
    { id: 'contactForm', label: 'Contact Form', icon: 'mail-outline', required: false },
    { id: 'contact', label: 'Contact Info', icon: 'call-outline', required: false },
    { id: 'cta', label: 'Call to Action', icon: 'megaphone-outline', required: false },
];

// ─── HTML Generator ──────────────────────────────────────────

function generateHTML(data: SiteData, theme: typeof THEMES[0], fontPair: typeof FONT_PAIRS[0], enabledSections: string[]): string {
    const isDark = theme.id === 'dark';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const borderColor = isDark ? '#374151' : '#E5E7EB';
    const subtextColor = isDark ? '#9CA3AF' : '#6B7280';
    const sectionBgAlt = isDark ? '#111827' : '#F9FAFB';

    const logoHtml = data.logoUri
        ? `<img src="${data.logoUri}" alt="Logo" style="width:40px;height:40px;border-radius:10px;object-fit:cover;">`
        : `<div style="width:40px;height:40px;border-radius:10px;background:${theme.primary};display:flex;align-items:center;justify-content:center;"><span style="color:white;font-weight:800;font-size:18px;font-family:${fontPair.heading};">${data.businessName.charAt(0).toUpperCase()}</span></div>`;

    const heroLogoHtml = data.logoUri
        ? `<img src="${data.logoUri}" alt="Logo" style="width:72px;height:72px;border-radius:20px;object-fit:cover;margin-bottom:16px;border:3px solid rgba(255,255,255,0.3);">`
        : `<div style="width:64px;height:64px;border-radius:18px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin-bottom:16px;border:2px solid rgba(255,255,255,0.2);"><span style="color:white;font-weight:800;font-size:28px;font-family:${fontPair.heading};">${data.businessName.charAt(0).toUpperCase()}</span></div>`;

    const servicesHtml = data.services
        .filter(s => s.trim())
        .map((s, i) => {
            const icons = ['&#10003;', '&#9733;', '&#9830;', '&#9654;', '&#10070;', '&#9830;'];
            return `
            <div style="background:${cardBg};border:1px solid ${borderColor};border-radius:12px;padding:24px;text-align:center;transition:transform 0.2s;">
                <div style="width:48px;height:48px;border-radius:12px;background:${theme.primary}15;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <span style="font-size:20px;color:${theme.primary};">${icons[i % icons.length]}</span>
                </div>
                <h3 style="margin:0;font-size:15px;color:${theme.text};font-family:${fontPair.heading};">${s.trim()}</h3>
            </div>`;
        }).join('');

    const galleryHtml = data.galleryImages.length > 0
        ? data.galleryImages.map(img => `
            <div style="flex:0 0 260px;scroll-snap-align:start;">
                <img src="${img}" alt="Gallery" style="width:260px;height:180px;object-fit:cover;border-radius:12px;border:1px solid ${borderColor};">
            </div>`).join('')
        : `
            <div style="flex:0 0 260px;scroll-snap-align:start;background:${cardBg};border:1px solid ${borderColor};border-radius:12px;height:180px;display:flex;align-items:center;justify-content:center;">
                <span style="color:${subtextColor};font-size:14px;">Photos will appear here</span>
            </div>`;

    const testimonialsHtml = data.testimonials
        .filter(t => t.name && t.text)
        .map(t => `
            <div style="background:${cardBg};border:1px solid ${borderColor};border-radius:12px;padding:20px;min-width:280px;flex:0 0 auto;scroll-snap-align:start;">
                <div style="color:${theme.primary};font-size:28px;line-height:1;margin-bottom:8px;">&#10077;</div>
                <p style="font-style:italic;color:${subtextColor};margin:0 0 14px;font-size:14px;line-height:1.6;">${t.text}</p>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;border-radius:18px;background:${theme.primary};display:flex;align-items:center;justify-content:center;">
                        <span style="color:white;font-weight:700;font-size:14px;">${t.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span style="font-weight:600;color:${theme.text};font-size:14px;">${t.name}</span>
                </div>
            </div>`).join('');

    const contactFormHtml = `
        <form id="enquiryForm" style="background:${cardBg};border:1px solid ${borderColor};border-radius:14px;padding:24px;" onsubmit="return submitEnquiry(event)">
            <h3 style="font-family:${fontPair.heading};font-size:18px;font-weight:700;color:${theme.text};margin:0 0 16px;">Get in Touch</h3>
            <div style="margin-bottom:12px;">
                <label style="font-size:12px;font-weight:600;color:${subtextColor};display:block;margin-bottom:4px;">Your Name</label>
                <input type="text" id="eq_name" placeholder="Enter your name" required style="width:100%;padding:12px 14px;border:1px solid ${borderColor};border-radius:8px;font-size:14px;background:${isDark ? '#0F172A' : '#F9FAFB'};color:${theme.text};outline:none;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:12px;font-weight:600;color:${subtextColor};display:block;margin-bottom:4px;">Phone Number</label>
                <input type="tel" id="eq_phone" placeholder="+91 9876543210" required style="width:100%;padding:12px 14px;border:1px solid ${borderColor};border-radius:8px;font-size:14px;background:${isDark ? '#0F172A' : '#F9FAFB'};color:${theme.text};outline:none;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:16px;">
                <label style="font-size:12px;font-weight:600;color:${subtextColor};display:block;margin-bottom:4px;">Message</label>
                <textarea id="eq_message" placeholder="How can we help?" rows="3" style="width:100%;padding:12px 14px;border:1px solid ${borderColor};border-radius:8px;font-size:14px;background:${isDark ? '#0F172A' : '#F9FAFB'};color:${theme.text};outline:none;resize:vertical;font-family:inherit;box-sizing:border-box;"></textarea>
            </div>
            <button type="submit" id="eq_btn" style="width:100%;padding:14px;background:${theme.primary};color:white;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;font-family:${fontPair.body};">Send Message</button>
            <p id="eq_status" style="text-align:center;margin-top:10px;font-size:13px;display:none;"></p>
        </form>
        <script>
        var ENQUIRY_URL = '${API_BASE}/websites/enquiry/WEBSITE_ID';
        var OWNER_PHONE = '${(data.phone || '').replace(/[^0-9]/g, '')}';
        var BIZ_NAME = '${data.businessName.replace(/'/g, "\\'")}';
        function submitEnquiry(e) {
            e.preventDefault();
            var btn = document.getElementById('eq_btn');
            var status = document.getElementById('eq_status');
            var name = document.getElementById('eq_name').value;
            var phone = document.getElementById('eq_phone').value;
            var message = document.getElementById('eq_message').value;
            btn.textContent = 'Sending...';
            btn.disabled = true;
            fetch(ENQUIRY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, phone: phone, message: message })
            }).then(function(r) { return r.json(); }).then(function(d) {
                status.style.display = 'block';
                status.style.color = '#22C55E';
                status.textContent = 'Redirecting to WhatsApp...';
                document.getElementById('enquiryForm').reset();
                btn.textContent = 'Send Message';
                btn.disabled = false;
                var waMsg = 'Hi ' + BIZ_NAME + '!%0A%0A'
                    + 'I visited your website and would like to connect.%0A%0A'
                    + 'Name: ' + encodeURIComponent(name) + '%0A'
                    + (phone ? 'Phone: ' + encodeURIComponent(phone) + '%0A' : '')
                    + (message ? 'Message: ' + encodeURIComponent(message) : '');
                setTimeout(function() {
                    window.open('https://wa.me/' + OWNER_PHONE + '?text=' + waMsg, '_blank');
                }, 500);
            }).catch(function() {
                status.style.display = 'block';
                status.style.color = '#EF4444';
                status.textContent = 'Something went wrong. Please try again.';
                btn.textContent = 'Send Message';
                btn.disabled = false;
            });
            return false;
        }
        </script>`;

    const navLinks = enabledSections
        .filter(s => !['hero', 'cta'].includes(s))
        .map(s => {
            const labels: Record<string, string> = { about: 'About', services: 'Services', gallery: 'Gallery', testimonials: 'Reviews', contactForm: 'Enquiry', contact: 'Contact' };
            return labels[s] ? `<a href="#${s}" style="color:${isDark ? '#D1D5DB' : '#4B5563'};text-decoration:none;font-size:13px;font-weight:500;">${labels[s]}</a>` : '';
        }).filter(Boolean).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.businessName}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&family=Poppins:wght@400;600;700&family=Montserrat:wght@700;800&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: ${fontPair.body}; background: ${theme.bg}; color: ${theme.text}; -webkit-font-smoothing: antialiased; }
.container { max-width: 800px; margin: 0 auto; }
section { border-bottom: 1px solid ${borderColor}; }
section:last-of-type { border-bottom: none; }
.scroll-row { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
.scroll-row::-webkit-scrollbar { display: none; }
#hamburger-toggle { display: none; }
#hamburger-toggle:checked ~ .mobile-nav { display: flex; }
.mobile-nav { display: none; flex-direction: column; gap: 12px; padding: 16px 24px; background: ${isDark ? '#111827' : '#FFFFFF'}; border-bottom: 1px solid ${borderColor}; }
</style>
</head>
<body>

<!-- Sticky Nav with Hamburger -->
<nav style="background:${isDark ? '#111827' : '#FFFFFF'};border-bottom:1px solid ${borderColor};position:sticky;top:0;z-index:100;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;">
        <div style="display:flex;align-items:center;gap:10px;">
            ${logoHtml}
            <span style="font-family:${fontPair.heading};font-weight:700;font-size:16px;color:${theme.text};">${data.businessName}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
            ${data.phone ? `<a href="tel:${data.phone}" style="background:${theme.primary};color:white;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;">Call Now</a>` : ''}
            <label for="hamburger-toggle" style="cursor:pointer;display:flex;flex-direction:column;gap:4px;padding:4px;">
                <span style="display:block;width:20px;height:2px;background:${theme.text};border-radius:1px;"></span>
                <span style="display:block;width:20px;height:2px;background:${theme.text};border-radius:1px;"></span>
                <span style="display:block;width:14px;height:2px;background:${theme.text};border-radius:1px;"></span>
            </label>
        </div>
    </div>
    <input type="checkbox" id="hamburger-toggle">
    <div class="mobile-nav">
        ${navLinks}
        ${data.whatsapp ? `<a href="https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}" style="display:flex;align-items:center;justify-content:center;gap:6px;background:#25D366;color:white;padding:10px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">&#128172; WhatsApp</a>` : ''}
    </div>
</nav>

${enabledSections.includes('hero') ? `
<!-- Hero -->
<section id="hero" style="background:linear-gradient(135deg, ${theme.primary}, ${theme.secondary});padding:56px 24px;text-align:center;border-bottom:none;">
    <div class="container">
        ${heroLogoHtml}
        <h1 style="font-family:${fontPair.heading};font-size:30px;font-weight:800;color:#FFFFFF;margin-bottom:14px;line-height:1.2;">${data.businessName}</h1>
        <p style="font-size:15px;color:rgba(255,255,255,0.85);margin-bottom:28px;line-height:1.5;max-width:500px;margin-left:auto;margin-right:auto;">${data.tagline}</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            ${data.whatsapp ? `<a href="https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:white;padding:13px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">&#128172; WhatsApp</a>` : ''}
            <a href="#contact" style="display:inline-block;background:#FFFFFF;color:${theme.primary};padding:13px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">${data.heroButtonText || 'Contact Us'}</a>
        </div>
    </div>
</section>` : ''}

${enabledSections.includes('about') ? `
<!-- About -->
<section id="about" style="padding:44px 24px;">
    <div class="container">
        <h2 style="font-family:${fontPair.heading};font-size:22px;font-weight:700;margin-bottom:6px;color:${theme.text};">About Us</h2>
        <div style="width:40px;height:3px;background:${theme.primary};border-radius:2px;margin-bottom:18px;"></div>
        <p style="font-size:15px;line-height:1.7;color:${subtextColor};">${data.about}</p>
    </div>
</section>` : ''}

${enabledSections.includes('services') && data.services.length > 0 ? `
<!-- Services -->
<section id="services" style="padding:44px 24px;background:${sectionBgAlt};">
    <div class="container">
        <h2 style="font-family:${fontPair.heading};font-size:22px;font-weight:700;margin-bottom:6px;text-align:center;color:${theme.text};">Our Services</h2>
        <div style="width:40px;height:3px;background:${theme.primary};border-radius:2px;margin:0 auto 24px;"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:14px;">
            ${servicesHtml}
        </div>
    </div>
</section>` : ''}

${enabledSections.includes('gallery') ? `
<!-- Gallery -->
<section id="gallery" style="padding:44px 24px;">
    <div class="container">
        <h2 style="font-family:${fontPair.heading};font-size:22px;font-weight:700;margin-bottom:6px;color:${theme.text};">Gallery</h2>
        <div style="width:40px;height:3px;background:${theme.primary};border-radius:2px;margin-bottom:20px;"></div>
        <div class="scroll-row">
            ${galleryHtml}
        </div>
    </div>
</section>` : ''}

${enabledSections.includes('testimonials') && data.testimonials.some(t => t.name && t.text) ? `
<!-- Testimonials -->
<section id="testimonials" style="padding:44px 24px;background:${sectionBgAlt};">
    <div class="container">
        <h2 style="font-family:${fontPair.heading};font-size:22px;font-weight:700;margin-bottom:6px;text-align:center;color:${theme.text};">What People Say</h2>
        <div style="width:40px;height:3px;background:${theme.primary};border-radius:2px;margin:0 auto 20px;"></div>
        <div class="scroll-row">
            ${testimonialsHtml}
        </div>
    </div>
</section>` : ''}

${enabledSections.includes('contactForm') ? `
<!-- Contact Form -->
<section id="contactForm" style="padding:44px 24px;">
    <div class="container">
        <h2 style="font-family:${fontPair.heading};font-size:22px;font-weight:700;margin-bottom:6px;color:${theme.text};">Enquiry Form</h2>
        <div style="width:40px;height:3px;background:${theme.primary};border-radius:2px;margin-bottom:20px;"></div>
        ${contactFormHtml}
    </div>
</section>` : ''}

${enabledSections.includes('cta') ? `
<!-- CTA -->
<section style="background:linear-gradient(135deg, ${theme.primary}, ${theme.secondary});padding:44px 24px;text-align:center;border-bottom:none;">
    <div class="container">
        <h2 style="font-family:${fontPair.heading};font-size:22px;font-weight:700;color:#FFFFFF;margin-bottom:10px;">Ready to Get Started?</h2>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin-bottom:22px;">Contact us today and let's grow your business together.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            ${data.whatsapp ? `<a href="https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:white;padding:13px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">&#128172; WhatsApp Us</a>` : ''}
            ${data.phone ? `<a href="tel:${data.phone}" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.2);color:white;padding:13px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;border:1px solid rgba(255,255,255,0.3);">&#9742; Call Now</a>` : ''}
        </div>
    </div>
</section>` : ''}

${enabledSections.includes('contact') ? `
<!-- Contact Info -->
<section id="contact" style="padding:44px 24px;background:${sectionBgAlt};">
    <div class="container">
        <h2 style="font-family:${fontPair.heading};font-size:22px;font-weight:700;margin-bottom:6px;color:${theme.text};">Contact Us</h2>
        <div style="width:40px;height:3px;background:${theme.primary};border-radius:2px;margin-bottom:20px;"></div>
        <div style="display:flex;flex-direction:column;gap:14px;">
            ${data.phone ? `<div style="display:flex;align-items:center;gap:12px;"><div style="width:42px;height:42px;border-radius:12px;background:${theme.primary}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:${theme.primary};font-size:18px;">&#9742;</span></div><div><p style="font-size:11px;color:${subtextColor};margin-bottom:2px;font-weight:500;">Phone</p><a href="tel:${data.phone}" style="font-size:15px;font-weight:600;color:${theme.text};text-decoration:none;">${data.phone}</a></div></div>` : ''}
            ${data.email ? `<div style="display:flex;align-items:center;gap:12px;"><div style="width:42px;height:42px;border-radius:12px;background:${theme.primary}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:${theme.primary};font-size:18px;">&#9993;</span></div><div><p style="font-size:11px;color:${subtextColor};margin-bottom:2px;font-weight:500;">Email</p><a href="mailto:${data.email}" style="font-size:15px;font-weight:600;color:${theme.text};text-decoration:none;">${data.email}</a></div></div>` : ''}
            ${data.address ? `<div style="display:flex;align-items:center;gap:12px;"><div style="width:42px;height:42px;border-radius:12px;background:${theme.primary}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:${theme.primary};font-size:18px;">&#9873;</span></div><div><p style="font-size:11px;color:${subtextColor};margin-bottom:2px;font-weight:500;">Address</p><p style="font-size:15px;font-weight:600;color:${theme.text};">${data.address}</p></div></div>` : ''}
            ${data.whatsapp ? `<a href="https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#25D366;color:white;padding:14px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;margin-top:6px;">&#128172; Chat on WhatsApp</a>` : ''}
        </div>
    </div>
</section>` : ''}

<!-- Footer -->
<footer style="background:${isDark ? '#030712' : theme.secondary};padding:28px 24px;text-align:center;">
    <div class="container">
        <p style="font-family:${fontPair.heading};font-weight:700;color:#FFFFFF;font-size:16px;margin-bottom:8px;">${data.businessName}</p>
        <p style="color:rgba(255,255,255,0.5);font-size:12px;">Made with Biz499</p>
    </div>
</footer>

</body>
</html>`;
}

// ─── Sub-components ──────────────────────────────────────────

const StepIndicator = ({ steps, current }: { steps: string[]; current: number }) => (
    <View style={styles.stepRow}>
        {steps.map((label, i) => (
            <View key={label} style={styles.stepItem}>
                <View style={[styles.stepDot, i <= current && styles.stepDotActive]}>
                    {i < current ? (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                    ) : (
                        <Text style={[styles.stepDotText, i <= current && styles.stepDotTextActive]}>{i + 1}</Text>
                    )}
                </View>
                <Text style={[styles.stepLabel, i <= current && styles.stepLabelActive]}>{label}</Text>
                {i < steps.length - 1 && <View style={[styles.stepLine, i < current && styles.stepLineActive]} />}
            </View>
        ))}
    </View>
);

// ─── Main Component ──────────────────────────────────────────

export default function WebsiteBuilderScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const user = useAuthStore(s => s.user);
    const C = useColors();

    const [step, setStep] = useState(0);
    const [selectedTheme, setSelectedTheme] = useState(0);
    const [selectedFont, setSelectedFont] = useState(0);
    const [enabledSections, setEnabledSections] = useState(['hero', 'about', 'services', 'contact', 'contactForm']);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedId, setSubmittedId] = useState<string | null>(null);
    const [previewFullscreen, setPreviewFullscreen] = useState(false);
    const [newService, setNewService] = useState('');
    const [existingRequest, setExistingRequest] = useState<any>(null);
    const [checkingExisting, setCheckingExisting] = useState(true);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // Check if user already has a website request
    React.useEffect(() => {
        (async () => {
            try {
                const res = await api.getWebsiteRequests();
                if (res.requests?.length > 0) {
                    const active = res.requests.find((r: any) => r.status === 'pending' || r.status === 'in_progress' || r.status === 'completed');
                    if (active) setExistingRequest(active);
                }
            } catch {}
            setCheckingExisting(false);
        })();
    }, []);

    const [siteData, setSiteData] = useState<SiteData>({
        businessName: user?.businessName || 'Your Business',
        tagline: 'Quality products and services for everyone',
        about: 'We are a trusted business committed to delivering quality products and exceptional service. With a focus on customer satisfaction, we strive to exceed expectations every day.',
        services: ['Service 1', 'Service 2', 'Service 3'],
        phone: (user?.phone || '').replace(/^\++/, '+'),
        email: user?.email || '',
        address: '',
        whatsapp: (user?.phone || '').replace(/^\++/, '+'),
        heroButtonText: 'Contact Us',
        testimonials: [
            { name: '', text: '' },
            { name: '', text: '' },
        ],
        socialLinks: { facebook: '', instagram: '', youtube: '' },
        logoUri: '',
        galleryImages: [],
        contactFormEnabled: true,
        mapEmbedUrl: '',
    });

    const theme = THEMES[selectedTheme];
    const fontPair = FONT_PAIRS[selectedFont];

    const htmlContent = useMemo(
        () => generateHTML(siteData, theme, fontPair, enabledSections),
        [siteData, theme, fontPair, enabledSections]
    );

    const updateField = (key: keyof SiteData, value: any) => {
        setSiteData(prev => ({ ...prev, [key]: value }));
    };

    const toggleSection = (id: string) => {
        const section = SECTION_OPTIONS.find(s => s.id === id);
        if (section?.required) return;
        setEnabledSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const addService = () => {
        if (!newService.trim()) return;
        updateField('services', [...siteData.services, newService.trim()]);
        setNewService('');
    };

    const removeService = (index: number) => {
        updateField('services', siteData.services.filter((_, i) => i !== index));
    };

    const updateTestimonial = (index: number, field: 'name' | 'text', value: string) => {
        const updated = [...siteData.testimonials];
        updated[index] = { ...updated[index], [field]: value };
        updateField('testimonials', updated);
    };

    const addTestimonial = () => {
        updateField('testimonials', [...siteData.testimonials, { name: '', text: '' }]);
    };

    const pickLogo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Grant media library access to pick images.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            updateField('logoUri', uri);
        }
    };

    const pickGalleryImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Grant media library access to pick images.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.7,
            selectionLimit: 10,
            base64: true,
        });
        if (!result.canceled && result.assets.length > 0) {
            const newImages = result.assets.map(a => a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
            updateField('galleryImages', [...siteData.galleryImages, ...newImages].slice(0, 10));
        }
    };

    const removeGalleryImage = (index: number) => {
        updateField('galleryImages', siteData.galleryImages.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const result = await api.submitWebsiteRequest({
                businessName: siteData.businessName,
                businessCategory: user?.businessCategory || undefined,
                phone: siteData.phone || user?.phone || undefined,
                email: siteData.email || user?.email || undefined,
                websiteType: 'business',
                pagesNeeded: ['Home', 'About', 'Services', 'Contact',
                    ...(siteData.galleryImages.length > 0 ? ['Gallery'] : []),
                    ...(siteData.testimonials.length > 0 ? ['Testimonials'] : []),
                ],
                description: `Theme: ${selectedTheme}. Tagline: ${siteData.tagline}. About: ${siteData.about}. Services: ${siteData.services.join(', ')}`,
                referenceUrls: siteData.socialLinks.facebook || siteData.socialLinks.instagram
                    ? [siteData.socialLinks.facebook, siteData.socialLinks.instagram].filter(Boolean)
                    : undefined,
                // Full design data for the team
                designHtml: htmlContent,
                designData: JSON.stringify({
                    theme: selectedTheme,
                    fontPair: selectedFont,
                    enabledSections,
                    siteData: {
                        ...siteData,
                        // Strip base64 images to keep payload reasonable, store separately
                        logoUri: siteData.logoUri ? '[HAS_LOGO]' : '',
                        galleryImages: siteData.galleryImages.map((_, i) => `[GALLERY_IMAGE_${i + 1}]`),
                    },
                }),
            });

            // Upload logo + gallery images separately to R2
            const hasImages = siteData.logoUri || siteData.galleryImages.length > 0;
            if (hasImages && result.id) {
                try {
                    await api.uploadWebsiteImages(result.id, {
                        logo: siteData.logoUri || undefined,
                        galleryImages: siteData.galleryImages.length > 0 ? siteData.galleryImages : undefined,
                    });
                } catch (e) {
                    console.warn('Image upload failed (non-critical):', e);
                }
            }

            setSubmittedId(result.id);
            setSubmitted(true);
            analytics.track('Website Submitted');
            NotifyEvents.websiteSubmitted();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to submit request.');
        } finally {
            setSubmitting(false);
        }
    };

    const canProceed = () => {
        if (step === 0) return siteData.businessName.trim().length > 0;
        return true;
    };

    // ─── Step 0: Info ─────────────────────────────────────────

    const renderStep0_Info = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.stepTitle, { color: C.text }]}>Business Information</Text>
            <Text style={[styles.stepDesc, { color: C.textSecondary }]}>This info will appear on your website.</Text>

            {/* Logo Upload */}
            <Text style={[styles.subHeading, { color: C.text }]}>Business Logo</Text>
            <TouchableOpacity onPress={pickLogo} style={styles.logoUpload} activeOpacity={0.7}>
                {siteData.logoUri ? (
                    <Image source={{ uri: siteData.logoUri }} style={styles.logoPreview} />
                ) : (
                    <View style={styles.logoPlaceholder}>
                        <Ionicons name="camera-outline" size={28} color={Colors.textTertiary} />
                        <Text style={styles.logoPlaceholderText}>Upload Logo</Text>
                    </View>
                )}
                <View style={styles.logoUploadBadge}>
                    <Ionicons name={siteData.logoUri ? 'pencil' : 'add'} size={14} color="#FFF" />
                </View>
            </TouchableOpacity>

            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Business Name *</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.businessName} onChangeText={v => updateField('businessName', v)} placeholder="e.g. Sharma Electronics" placeholderTextColor={Colors.textTertiary} />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Tagline / Slogan</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.tagline} onChangeText={v => updateField('tagline', v)} placeholder="A short description of your business" placeholderTextColor={Colors.textTertiary} />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>About Your Business</Text>
                <TextInput style={[styles.fieldInput, styles.fieldInputMultiline, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.about} onChangeText={v => updateField('about', v)} placeholder="Describe what your business does..." placeholderTextColor={Colors.textTertiary} multiline numberOfLines={4} />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Hero Button Text</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.heroButtonText} onChangeText={v => updateField('heroButtonText', v)} placeholder="e.g. Contact Us, Shop Now" placeholderTextColor={Colors.textTertiary} />
            </View>

            <View style={styles.divider} />
            <Text style={[styles.subHeading, { color: C.text }]}>Contact Details</Text>

            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Phone Number</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.phone} onChangeText={v => updateField('phone', v)} placeholder="+91 9876543210" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" />
            </View>
            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Email</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.email} onChangeText={v => updateField('email', v)} placeholder="you@business.com" placeholderTextColor={Colors.textTertiary} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>WhatsApp Number</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.whatsapp} onChangeText={v => updateField('whatsapp', v)} placeholder="+91 9876543210" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" />
            </View>
            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Address</Text>
                <TextInput style={[styles.fieldInput, styles.fieldInputMultiline, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.address} onChangeText={v => updateField('address', v)} placeholder="Shop 12, Main Market, New Delhi" placeholderTextColor={Colors.textTertiary} multiline />
            </View>

            <View style={styles.divider} />
            <Text style={[styles.subHeading, { color: C.text }]}>Social Media (optional)</Text>
            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Facebook URL</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.socialLinks.facebook} onChangeText={v => updateField('socialLinks', { ...siteData.socialLinks, facebook: v })} placeholder="https://facebook.com/yourbusiness" placeholderTextColor={Colors.textTertiary} autoCapitalize="none" />
            </View>
            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Instagram URL</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={siteData.socialLinks.instagram} onChangeText={v => updateField('socialLinks', { ...siteData.socialLinks, instagram: v })} placeholder="https://instagram.com/yourbusiness" placeholderTextColor={Colors.textTertiary} autoCapitalize="none" />
            </View>
        </ScrollView>
    );

    // ─── Step 1: Design ───────────────────────────────────────

    const renderStep1_Design = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner} showsVerticalScrollIndicator={false}>
            <Text style={[styles.stepTitle, { color: C.text }]}>Choose Your Design</Text>
            <Text style={[styles.stepDesc, { color: C.textSecondary }]}>Pick a theme, font style, and sections.</Text>

            <Text style={[styles.subHeading, { color: C.text }]}>Color Theme</Text>
            <View style={styles.themeGrid}>
                {THEMES.map((t, i) => (
                    <TouchableOpacity
                        key={t.id}
                        style={[styles.themeCard, { backgroundColor: C.surface, borderColor: C.borderLight }, selectedTheme === i && { borderColor: t.primary, borderWidth: 2 }]}
                        onPress={() => setSelectedTheme(i)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.themePreview, { backgroundColor: t.primary }]}>
                            <Ionicons name={t.icon as any} size={20} color="#FFF" />
                        </View>
                        <Text style={[styles.themeName, { color: C.textSecondary }, selectedTheme === i && { color: t.primary, fontFamily: Fonts.semiBold }]}>{t.name}</Text>
                        {selectedTheme === i && (
                            <View style={[styles.themeCheck, { backgroundColor: t.primary }]}>
                                <Ionicons name="checkmark" size={12} color="#FFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.divider} />
            <Text style={[styles.subHeading, { color: C.text }]}>Font Style</Text>
            {FONT_PAIRS.map((f, i) => (
                <TouchableOpacity key={f.id} style={[styles.fontCard, { backgroundColor: C.surface, borderColor: C.borderLight }, selectedFont === i && styles.fontCardActive]} onPress={() => setSelectedFont(i)} activeOpacity={0.7}>
                    <View style={styles.fontCardLeft}>
                        <View style={[styles.radioOuter, selectedFont === i && { borderColor: Colors.brand }]}>
                            {selectedFont === i && <View style={styles.radioInner} />}
                        </View>
                        <View>
                            <Text style={[styles.fontName, { color: C.text }, selectedFont === i && { color: Colors.brand }]}>{f.name}</Text>
                            <Text style={[styles.fontSample, { color: C.textSecondary }]}>Aa Bb Cc 123</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            ))}

            <View style={styles.divider} />
            <Text style={[styles.subHeading, { color: C.text }]}>Website Sections</Text>
            <Text style={[styles.stepDesc, { marginBottom: 8, color: C.textSecondary }]}>Choose which sections to include.</Text>
            {SECTION_OPTIONS.map(s => (
                <TouchableOpacity key={s.id} style={[styles.sectionToggle, { borderBottomColor: C.borderLight }]} onPress={() => toggleSection(s.id)} activeOpacity={0.7} disabled={s.required}>
                    <View style={styles.sectionToggleLeft}>
                        <Ionicons name={s.icon as any} size={20} color={enabledSections.includes(s.id) ? Colors.brand : Colors.textTertiary} />
                        <Text style={[styles.sectionToggleText, { color: C.textSecondary }, enabledSections.includes(s.id) && { color: C.text, fontFamily: Fonts.semiBold }]}>{s.label}</Text>
                        {s.required && <Text style={styles.requiredBadge}>Required</Text>}
                    </View>
                    <Ionicons name={enabledSections.includes(s.id) ? 'checkbox' : 'square-outline'} size={22} color={enabledSections.includes(s.id) ? Colors.brand : Colors.textTertiary} />
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    // ─── Step 2: Media & Content ──────────────────────────────

    const renderStep2_Media = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.stepTitle, { color: C.text }]}>Add Content & Photos</Text>
            <Text style={[styles.stepDesc, { color: C.textSecondary }]}>Add services, photos, and testimonials.</Text>

            {/* Services */}
            {enabledSections.includes('services') && (
                <>
                    <Text style={[styles.subHeading, { color: C.text }]}>Services</Text>
                    {siteData.services.map((s, i) => (
                        <View key={i} style={[styles.serviceRow, { backgroundColor: C.surfaceSecondary }]}>
                            <Text style={[styles.serviceText, { color: C.text }]}>{s}</Text>
                            <TouchableOpacity onPress={() => removeService(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <View style={styles.addServiceRow}>
                        <TextInput
                            style={[styles.fieldInput, { flex: 1, backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]}
                            value={newService}
                            onChangeText={setNewService}
                            placeholder="Add a service..."
                            placeholderTextColor={Colors.textTertiary}
                            onSubmitEditing={addService}
                            returnKeyType="done"
                        />
                        <TouchableOpacity onPress={addService} style={styles.addServiceBtn}>
                            <Ionicons name="add" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.divider} />
                </>
            )}

            {/* Gallery */}
            {enabledSections.includes('gallery') && (
                <>
                    <Text style={[styles.subHeading, { color: C.text }]}>Photo Gallery</Text>
                    <Text style={[styles.stepDesc, { marginBottom: 12, color: C.textSecondary }]}>Add up to 10 photos. They'll appear in a scrollable carousel.</Text>

                    {siteData.galleryImages.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                            {siteData.galleryImages.map((img, i) => (
                                <View key={i} style={styles.galleryImageWrapper}>
                                    <Image source={{ uri: img }} style={styles.galleryImage} />
                                    <TouchableOpacity style={styles.galleryRemoveBtn} onPress={() => removeGalleryImage(i)}>
                                        <Ionicons name="close" size={14} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <TouchableOpacity onPress={pickGalleryImages} style={styles.uploadBtn} activeOpacity={0.7}>
                        <Ionicons name="images-outline" size={22} color={Colors.brand} />
                        <Text style={styles.uploadBtnText}>
                            {siteData.galleryImages.length > 0 ? `Add More Photos (${siteData.galleryImages.length}/10)` : 'Upload Photos from Gallery'}
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                </>
            )}

            {/* Testimonials */}
            {enabledSections.includes('testimonials') && (
                <>
                    <Text style={[styles.subHeading, { color: C.text }]}>Testimonials</Text>
                    <Text style={[styles.stepDesc, { marginBottom: 12, color: C.textSecondary }]}>Add customer reviews (leave empty to skip).</Text>
                    {siteData.testimonials.map((t, i) => (
                        <View key={i} style={[styles.testimonialCard, { backgroundColor: C.surfaceSecondary }]}>
                            <Text style={[styles.testimonialLabel, { color: C.textSecondary }]}>Review {i + 1}</Text>
                            <TextInput style={[styles.fieldInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={t.name} onChangeText={v => updateTestimonial(i, 'name', v)} placeholder="Customer name" placeholderTextColor={Colors.textTertiary} />
                            <TextInput style={[styles.fieldInput, styles.fieldInputMultiline, { marginTop: 8, backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]} value={t.text} onChangeText={v => updateTestimonial(i, 'text', v)} placeholder="What did they say?" placeholderTextColor={Colors.textTertiary} multiline />
                        </View>
                    ))}
                    <TouchableOpacity onPress={addTestimonial} style={styles.addMoreBtn}>
                        <Ionicons name="add-circle-outline" size={18} color={Colors.brand} />
                        <Text style={styles.addMoreText}>Add Another Review</Text>
                    </TouchableOpacity>
                </>
            )}

            {!enabledSections.includes('services') && !enabledSections.includes('gallery') && !enabledSections.includes('testimonials') && (
                <View style={styles.emptyContent}>
                    <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
                    <Text style={[styles.emptyContentTitle, { color: C.text }]}>All set!</Text>
                    <Text style={[styles.emptyContentDesc, { color: C.textSecondary }]}>Your info is ready. Tap Next to preview your website.</Text>
                </View>
            )}
        </ScrollView>
    );

    // ─── Step 3: Preview ──────────────────────────────────────

    const renderStep3_Preview = () => (
        <View style={[styles.previewContainer, { borderColor: C.borderLight }]}>
            <View style={[styles.browserBar, { backgroundColor: C.surfaceSecondary, borderBottomColor: C.borderLight }]}>
                <View style={styles.browserDots}>
                    <View style={[styles.browserDot, { backgroundColor: '#FF5F57' }]} />
                    <View style={[styles.browserDot, { backgroundColor: '#FFBD2E' }]} />
                    <View style={[styles.browserDot, { backgroundColor: '#28C840' }]} />
                </View>
                <View style={[styles.browserUrlBar, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
                    <Ionicons name="lock-closed" size={10} color={Colors.success} />
                    <Text style={[styles.browserUrl, { color: C.textSecondary }]} numberOfLines={1}>{siteData.businessName.toLowerCase().replace(/\s+/g, '')}.biz499.com</Text>
                </View>
                <TouchableOpacity onPress={() => setPreviewFullscreen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="expand-outline" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
            </View>
            <WebView
                source={{ html: htmlContent }}
                style={styles.webview}
                scrollEnabled
                showsVerticalScrollIndicator={false}
                originWhitelist={['*']}
                javaScriptEnabled
            />
        </View>
    );

    // ─── Loading state ────────────────────────────────────
    if (checkingExisting) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }]}>
                <ActivityIndicator size="large" color={Colors.brand} />
            </View>
        );
    }

    // ─── Existing request state ────────────────────────────
    if (existingRequest && !submitted) {
        const statusLabel = existingRequest.status === 'completed' ? 'Live' : existingRequest.status === 'in_progress' ? 'In Progress' : 'Submitted';
        const statusColor = existingRequest.status === 'completed' ? Colors.success : existingRequest.status === 'in_progress' ? Colors.warning : Colors.brand;
        const previewId = existingRequest.id;

        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
                <View style={styles.submittedContainer}>
                    <View style={styles.submittedIcon}>
                        <LinearGradient colors={[Colors.brand, '#4F46E5']} style={styles.submittedIconGrad}>
                            <Ionicons name="globe" size={48} color="#FFF" />
                        </LinearGradient>
                    </View>
                    <Text style={[styles.submittedTitle, { color: C.text }]}>Your Website</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
                        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: statusColor }}>{statusLabel}</Text>
                    </View>
                    <Text style={[styles.submittedDesc, { color: C.textSecondary }]}>
                        {existingRequest.status === 'completed'
                            ? 'Your website is live! Share it with your customers.'
                            : 'Your website request has been received. Our team is working on it.'}
                    </Text>

                    {/* Preview Link */}
                    <TouchableOpacity
                        onPress={() => Linking.openURL(`${API_BASE}/websites/preview/${previewId}`)}
                        activeOpacity={0.7}
                        style={{ width: '100%', backgroundColor: C.surfaceSecondary, borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}
                    >
                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name="eye-outline" size={22} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.brand }}>View Your Website</Text>
                            <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                                Tap to open your website preview
                            </Text>
                        </View>
                        <Ionicons name="open-outline" size={18} color={Colors.brand} />
                    </TouchableOpacity>

                    {/* Share */}
                    <TouchableOpacity
                        onPress={() => Share.share({ message: `Check out my website: ${API_BASE}/websites/preview/${previewId}` })}
                        activeOpacity={0.7}
                        style={{ width: '100%', marginBottom: 12 }}
                    >
                        <LinearGradient colors={['#25D366', '#128C7E']} style={styles.submittedBtn}>
                            <Ionicons name="logo-whatsapp" size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.submittedBtnText}>Share on WhatsApp</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Edit / Create New */}
                    <TouchableOpacity
                        onPress={async () => {
                            setLoadingEdit(true);
                            try {
                                const res = await api.getWebsiteDesignData(previewId);
                                if (res.designData) {
                                    const d = res.designData;
                                    if (d.theme !== undefined) setSelectedTheme(d.theme);
                                    if (d.fontPair !== undefined) setSelectedFont(d.fontPair);
                                    if (d.enabledSections) setEnabledSections(d.enabledSections);
                                    if (d.siteData) {
                                        const logoUrl = d.siteData.logoUri === '[HAS_LOGO]'
                                            ? `${API_BASE}/websites/asset/${previewId}/logo.jpg`
                                            : (d.siteData.logoUri || '');
                                        const galleryUrls = (d.siteData.galleryImages || []).map((g: string, i: number) =>
                                            g.startsWith('[') ? `${API_BASE}/websites/asset/${previewId}/gallery-${i + 1}.jpg` : g
                                        ).filter(Boolean);
                                        setSiteData(prev => ({
                                            ...prev,
                                            ...d.siteData,
                                            logoUri: logoUrl,
                                            galleryImages: galleryUrls,
                                        }));
                                    }
                                }
                            } catch (e) {
                                console.warn('Could not load design data:', e);
                            }
                            setLoadingEdit(false);
                            setExistingRequest(null);
                            setStep(0);
                        }}
                        activeOpacity={0.7}
                        disabled={loadingEdit}
                        style={{ width: '100%', marginBottom: 12 }}
                    >
                        <View style={[styles.submittedBtn, { backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border }]}>
                            {loadingEdit ? (
                                <ActivityIndicator size="small" color={Colors.text} />
                            ) : (
                                <>
                                    <Ionicons name="create-outline" size={18} color={Colors.text} style={{ marginRight: 8 }} />
                                    <Text style={[styles.submittedBtnText, { color: Colors.text }]}>Edit & Resubmit</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={{ width: '100%' }}>
                        <LinearGradient colors={[Colors.brand, '#0052B8']} style={styles.submittedBtn}>
                            <Text style={styles.submittedBtnText}>Back to Dashboard</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── Submitted state (just submitted) ───────────────────

    if (submitted) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
                <View style={styles.submittedContainer}>
                    <View style={styles.submittedIcon}>
                        <LinearGradient colors={[Colors.success, '#059669']} style={styles.submittedIconGrad}>
                            <Ionicons name="checkmark" size={48} color="#FFF" />
                        </LinearGradient>
                    </View>
                    <Text style={[styles.submittedTitle, { color: C.text }]}>Request Submitted!</Text>
                    <Text style={[styles.submittedDesc, { color: C.textSecondary }]}>
                        Our team has received your website details and design preferences.
                    </Text>

                    {/* Live Preview Link */}
                    {submittedId && (
                        <TouchableOpacity
                            onPress={() => Linking.openURL(`${API_BASE}/websites/preview/${submittedId}`)}
                            activeOpacity={0.7}
                            style={{ width: '100%', backgroundColor: C.surfaceSecondary, borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="eye-outline" size={22} color="#FFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.brand }}>View Your Website</Text>
                                <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: C.textSecondary, marginTop: 2 }} numberOfLines={1}>
                                    Tap to see your live preview
                                </Text>
                            </View>
                            <Ionicons name="open-outline" size={18} color={Colors.brand} />
                        </TouchableOpacity>
                    )}

                    <View style={[styles.submittedInfo, { backgroundColor: C.surfaceSecondary }]}>
                        <View style={styles.submittedInfoRow}>
                            <Ionicons name="time-outline" size={20} color={Colors.brand} />
                            <Text style={[styles.submittedInfoText, { color: C.text }]}>Our team will contact you within 24-48 hours</Text>
                        </View>
                        <View style={styles.submittedInfoRow}>
                            <Ionicons name="construct-outline" size={20} color={Colors.brand} />
                            <Text style={[styles.submittedInfoText, { color: C.text }]}>Professional website built based on your design</Text>
                        </View>
                        <View style={styles.submittedInfoRow}>
                            <Ionicons name="globe-outline" size={20} color={Colors.brand} />
                            <Text style={[styles.submittedInfoText, { color: C.text }]}>Final URL: {siteData.businessName.toLowerCase().replace(/\s+/g, '')}.biz499.com</Text>
                        </View>
                        <View style={styles.submittedInfoRow}>
                            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                            <Text style={[styles.submittedInfoText, { color: C.text }]}>WhatsApp & contact form will be fully functional</Text>
                        </View>
                    </View>

                    {/* Share Preview Link */}
                    {submittedId && (
                        <TouchableOpacity
                            onPress={() => Share.share({ message: `Check out my website preview: ${API_BASE}/websites/preview/${submittedId}` })}
                            activeOpacity={0.7}
                            style={{ width: '100%', marginBottom: 12 }}
                        >
                            <LinearGradient colors={['#25D366', '#128C7E']} style={styles.submittedBtn}>
                                <Ionicons name="share-social-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.submittedBtnText}>Share Preview Link</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={{ width: '100%' }}>
                        <LinearGradient colors={[Colors.brand, '#0052B8']} style={styles.submittedBtn}>
                            <Text style={styles.submittedBtnText}>Back to Dashboard</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── Main render ────────────────────────────────────────

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: C.borderLight }]}>
                    <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.surfaceSecondary }]}>
                        <Ionicons name="arrow-back" size={22} color={C.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: C.text }]}>Website Builder</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Steps */}
                <StepIndicator steps={STEPS} current={step} />

                {/* Step Content */}
                {step === 0 && renderStep0_Info()}
                {step === 1 && renderStep1_Design()}
                {step === 2 && renderStep2_Media()}
                {step === 3 && renderStep3_Preview()}

                {/* Bottom Bar */}
                <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: C.surface, borderTopColor: C.borderLight }]}>
                    {step === 3 ? (
                        <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
                            <LinearGradient colors={[Colors.success, '#059669']} style={styles.actionBtn}>
                                {submitting ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="rocket-outline" size={20} color="#FFF" />
                                        <Text style={styles.actionBtnText}>Submit Website Request</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setStep(step + 1)} disabled={!canProceed()} activeOpacity={0.8}>
                            <LinearGradient
                                colors={canProceed() ? [Colors.brand, '#0052B8'] : ['#D1D5DB', '#9CA3AF']}
                                style={styles.actionBtn}
                            >
                                <Text style={styles.actionBtnText}>{step === 2 ? 'Preview Website' : 'Next'}</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Fullscreen Preview Modal */}
                <Modal visible={previewFullscreen} animationType="slide">
                    <View style={[styles.fullscreenModal, { paddingTop: insets.top, backgroundColor: C.surface }]}>
                        <View style={[styles.fullscreenHeader, { borderBottomColor: C.borderLight }]}>
                            <Text style={[styles.fullscreenTitle, { color: C.text }]}>Website Preview</Text>
                            <TouchableOpacity onPress={() => setPreviewFullscreen(false)} style={[styles.backBtn, { backgroundColor: C.surfaceSecondary }]}>
                                <Ionicons name="close" size={22} color={C.text} />
                            </TouchableOpacity>
                        </View>
                        <WebView source={{ html: htmlContent }} style={{ flex: 1 }} scrollEnabled showsVerticalScrollIndicator={false} originWhitelist={['*']} javaScriptEnabled />
                    </View>
                </Modal>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: Fonts.bold, fontSize: FontSize.lg, color: Colors.text },

    // Steps
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20 },
    stepItem: { flexDirection: 'row', alignItems: 'center' },
    stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
    stepDotActive: { backgroundColor: Colors.brand },
    stepDotText: { fontFamily: Fonts.semiBold, fontSize: 11, color: Colors.textTertiary },
    stepDotTextActive: { color: '#FFF' },
    stepLabel: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textTertiary, marginLeft: 4 },
    stepLabelActive: { color: Colors.brand, fontFamily: Fonts.semiBold },
    stepLine: { width: 20, height: 2, backgroundColor: Colors.borderLight, marginHorizontal: 4 },
    stepLineActive: { backgroundColor: Colors.brand },

    // Step Content
    stepContent: { flex: 1 },
    stepContentInner: { padding: 20, paddingBottom: 20 },
    stepTitle: { fontFamily: Fonts.bold, fontSize: FontSize.xl, color: Colors.text, marginBottom: 4 },
    stepDesc: { fontFamily: Fonts.regular, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: 20 },
    subHeading: { fontFamily: Fonts.semiBold, fontSize: FontSize.md, color: Colors.text, marginBottom: 12, marginTop: 4 },

    // Logo
    logoUpload: { alignSelf: 'center', marginBottom: 24, position: 'relative' },
    logoPreview: { width: 88, height: 88, borderRadius: 22, borderWidth: 2, borderColor: Colors.borderLight },
    logoPlaceholder: {
        width: 88, height: 88, borderRadius: 22, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary,
    },
    logoPlaceholderText: { fontFamily: Fonts.medium, fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
    logoUploadBadge: {
        position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14,
        backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surface,
    },

    // Fields
    fieldGroup: { marginBottom: 14 },
    fieldLabel: { fontFamily: Fonts.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldInput: {
        backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, paddingHorizontal: 14, height: 48,
        fontFamily: Fonts.regular, fontSize: FontSize.base, color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight,
    },
    fieldInputMultiline: { height: 100, paddingTop: 14, textAlignVertical: 'top' },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 22 },

    // Theme grid
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    themeCard: {
        width: '31%', alignItems: 'center', padding: 14, borderRadius: Radius.lg,
        borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.surface,
    },
    themePreview: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    themeName: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
    themeCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

    // Font cards
    fontCard: {
        flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.md,
        borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 10, backgroundColor: Colors.surface,
    },
    fontCardActive: { borderColor: Colors.brand, backgroundColor: Colors.brandBg },
    fontCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.brand },
    fontName: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, color: Colors.text },
    fontSample: { fontFamily: Fonts.regular, fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },

    // Section toggles
    sectionToggle: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    sectionToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionToggleText: { fontFamily: Fonts.regular, fontSize: FontSize.base, color: Colors.textSecondary },
    requiredBadge: {
        fontFamily: Fonts.medium, fontSize: 10, color: Colors.brand,
        backgroundColor: Colors.brandBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
    },

    // Services
    serviceRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surfaceSecondary, padding: 12, borderRadius: Radius.md, marginBottom: 8,
    },
    serviceText: { fontFamily: Fonts.medium, fontSize: FontSize.sm, color: Colors.text, flex: 1 },
    addServiceRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    addServiceBtn: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center' },

    // Gallery
    galleryScroll: { gap: 10, paddingBottom: 12 },
    galleryImageWrapper: { position: 'relative' },
    galleryImage: { width: 120, height: 90, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderLight },
    galleryRemoveBtn: {
        position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
    },
    uploadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.brand,
        borderStyle: 'dashed', backgroundColor: Colors.brandBg,
    },
    uploadBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, color: Colors.brand },

    // Testimonials
    testimonialCard: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
    testimonialLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: 8, textTransform: 'uppercase' },
    addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
    addMoreText: { fontFamily: Fonts.medium, fontSize: FontSize.sm, color: Colors.brand },

    // Empty content
    emptyContent: { alignItems: 'center', paddingVertical: 40 },
    emptyContentTitle: { fontFamily: Fonts.bold, fontSize: FontSize.xl, color: Colors.text, marginTop: 12 },
    emptyContentDesc: { fontFamily: Fonts.regular, fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },

    // Preview
    previewContainer: { flex: 1, margin: 12, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
    browserBar: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: '#F1F3F5', borderBottomWidth: 1, borderBottomColor: '#E0E2E5',
    },
    browserDots: { flexDirection: 'row', gap: 5, marginRight: 10 },
    browserDot: { width: 10, height: 10, borderRadius: 5 },
    browserUrlBar: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB',
    },
    browserUrl: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textSecondary },
    webview: { flex: 1, backgroundColor: '#FFFFFF' },

    // Bottom bar
    bottomBar: {
        paddingHorizontal: 16, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.surface,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 16, borderRadius: Radius.lg,
    },
    actionBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.md, color: '#FFF' },

    // Fullscreen modal
    fullscreenModal: { flex: 1, backgroundColor: Colors.surface },
    fullscreenHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    fullscreenTitle: { fontFamily: Fonts.bold, fontSize: FontSize.lg, color: Colors.text },

    // Submitted
    submittedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
    submittedIcon: { marginBottom: 24 },
    submittedIconGrad: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
    submittedTitle: { fontFamily: Fonts.bold, fontSize: FontSize['2xl'], color: Colors.text, marginBottom: 10 },
    submittedDesc: { fontFamily: Fonts.regular, fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    submittedInfo: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.xl, padding: 20, width: '100%', gap: 16, marginBottom: 28 },
    submittedInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    submittedInfoText: { fontFamily: Fonts.medium, fontSize: FontSize.sm, color: Colors.text, flex: 1, lineHeight: 20 },
    submittedBtn: { paddingVertical: 16, borderRadius: Radius.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    submittedBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.md, color: '#FFF' },
});
