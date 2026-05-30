import { View, ViewProps } from 'react-native';
import { useColors } from '../utils/theme';

export const Card = ({ children, className, style, ...props }: ViewProps) => {
    const C = useColors();
    return (
        <View className={`rounded-xl shadow-sm p-4 ${className}`} style={[{ backgroundColor: C.surface }, style]} {...props}>
            {children}
        </View>
    );
};
