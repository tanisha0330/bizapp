import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PhoneMockupProps {
    children: React.ReactNode;
    backgroundColors?: readonly [string, string, ...string[]];
}

export const PhoneMockup = ({
    children,
    backgroundColors = ['#1A7CFF', '#00B4FF'] as const,
}: PhoneMockupProps) => {
    return (
        <View className="flex-1 items-center justify-center">
            <LinearGradient
                colors={backgroundColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-full flex-1 items-center justify-center"
            >
                {/* Phone frame */}
                <View
                    className="bg-gray-900 rounded-[40px] p-[6px] mx-6"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 20 },
                        shadowOpacity: 0.4,
                        shadowRadius: 40,
                        elevation: 20,
                    }}
                >
                    <View className="bg-white rounded-[34px] overflow-hidden w-64 h-[420px]">
                        {children}
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

interface FeatureCardProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

export const OnboardingCard = ({ title, description, children }: FeatureCardProps) => {
    return (
        <View className="flex-1">
            {/* Top section with phone mockup */}
            <View className="flex-1">
                {children}
            </View>

            {/* Bottom section with text */}
            <View className="bg-white px-8 pt-8 pb-4">
                <Text className="text-[26px] font-bold text-gray-900 text-center tracking-tight mb-3">
                    {title}
                </Text>
                <Text className="text-[16px] text-gray-500 text-center leading-6">
                    {description}
                </Text>
            </View>
        </View>
    );
};
