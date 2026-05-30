import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, Text } from 'react-native';

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    autoFocus?: boolean;
}

export const OTPInput = ({
    length = 6,
    value,
    onChange,
    error,
    autoFocus = true,
}: OTPInputProps) => {
    const inputRefs = useRef<(TextInput | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(0);

    useEffect(() => {
        if (autoFocus && inputRefs.current[0]) {
            inputRefs.current[0]?.focus();
        }
    }, [autoFocus]);

    const handleChange = (text: string, index: number) => {
        const newValue = value.split('');

        // Handle paste
        if (text.length > 1) {
            const pastedValue = text.slice(0, length);
            onChange(pastedValue);
            const lastIndex = Math.min(pastedValue.length, length) - 1;
            inputRefs.current[lastIndex]?.focus();
            return;
        }

        newValue[index] = text;
        const finalValue = newValue.join('');
        onChange(finalValue);

        // Move to next input
        if (text && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace') {
            if (!value[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
                const newValue = value.split('');
                newValue[index - 1] = '';
                onChange(newValue.join(''));
            }
        }
    };

    return (
        <View>
            <View className="flex-row justify-between gap-3">
                {Array.from({ length }).map((_, index) => (
                    <View
                        key={index}
                        className={`flex-1 aspect-square max-w-[52px] rounded-apple-lg border-2 ${focusedIndex === index
                                ? 'border-primary-500 bg-primary-50'
                                : value[index]
                                    ? 'border-gray-300 bg-white'
                                    : 'border-gray-200 bg-gray-50'
                            }`}
                        style={{
                            shadowColor: focusedIndex === index ? '#1A7CFF' : 'transparent',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.15,
                            shadowRadius: 8,
                        }}
                    >
                        <TextInput
                            ref={(ref: TextInput | null) => { inputRefs.current[index] = ref; }}
                            className="flex-1 text-center text-gray-900 text-[24px] font-semibold"
                            keyboardType="number-pad"
                            maxLength={1}
                            value={value[index] || ''}
                            onChangeText={(text) => handleChange(text, index)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                            onFocus={() => setFocusedIndex(index)}
                            selectTextOnFocus
                        />
                    </View>
                ))}
            </View>
            {error && (
                <Text className="text-red-500 text-[13px] mt-3 text-center">{error}</Text>
            )}
        </View>
    );
};
