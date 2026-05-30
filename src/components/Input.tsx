import { TextInput, TextInputProps, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Radius, Spacing } from '../utils/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    showPasswordToggle?: boolean;
}

export const Input = ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    showPasswordToggle,
    secureTextEntry,
    style,
    ...props
}: InputProps) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
                style={[
                    styles.inputRow,
                    isFocused && styles.inputRowFocused,
                    error ? styles.inputRowError : null,
                ]}
            >
                {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                <TextInput
                    style={[
                        styles.input,
                        leftIcon ? { paddingLeft: 8 } : null,
                        (rightIcon || showPasswordToggle) ? { paddingRight: 8 } : null,
                        props.multiline ? { minHeight: 80, textAlignVertical: 'top' } : null,
                        style,
                    ]}
                    placeholderTextColor={Colors.textTertiary}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={isSecure}
                    {...props}
                />
                {showPasswordToggle && (
                    <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.rightIcon}>
                        <Ionicons name={isSecure ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.textTertiary} />
                    </TouchableOpacity>
                )}
                {rightIcon && !showPasswordToggle && (
                    <View style={styles.rightIcon}>{rightIcon}</View>
                )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: 16 },
    label: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.sm,
        color: Colors.text,
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceSecondary,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: Radius.md,
    },
    inputRowFocused: {
        borderColor: Colors.brand,
        backgroundColor: Colors.surface,
    },
    inputRowError: {
        borderColor: Colors.danger,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.md,
        color: Colors.text,
        paddingHorizontal: Spacing.md,
        paddingVertical: 14,
    },
    leftIcon: { paddingLeft: Spacing.md },
    rightIcon: { paddingRight: Spacing.md },
    errorText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.xs,
        color: Colors.danger,
        marginTop: 4,
        marginLeft: 2,
    },
    hintText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
        marginTop: 4,
        marginLeft: 2,
    },
});
