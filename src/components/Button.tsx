import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

export const Button = ({
    title,
    variant = 'primary',
    size = 'md',
    fullWidth = true,
    loading,
    className,
    disabled,
    icon,
    iconPosition = 'left',
    ...props
}: ButtonProps) => {
    const baseStyles = "items-center flex-row justify-center";

    const sizeStyles = {
        sm: "rounded-apple py-2.5 px-4",
        md: "rounded-apple-lg py-4 px-6",
        lg: "rounded-apple-xl py-5 px-8",
    };

    const variants = {
        primary: "",
        secondary: "bg-gray-100 active:bg-gray-200",
        outline: "bg-transparent border-2 border-primary-500 active:bg-primary-50",
        ghost: "bg-transparent active:opacity-70",
    };

    const textSizes = {
        sm: "text-[15px]",
        md: "text-[17px]",
        lg: "text-[18px]",
    };

    const textVariants = {
        primary: "text-white font-semibold",
        secondary: "text-gray-900 font-semibold",
        outline: "text-primary-500 font-semibold",
        ghost: "text-primary-500 font-medium",
    };

    const buttonClass = twMerge(clsx(
        baseStyles,
        sizeStyles[size],
        variants[variant],
        disabled && "opacity-50",
        fullWidth && "w-full",
        className
    ));
    const textClass = twMerge(clsx(textVariants[variant], textSizes[size]));

    const content = (
        <>
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'ghost' ? '#1A7CFF' : 'white'}
                    style={{ marginRight: 8 }}
                />
            ) : icon && iconPosition === 'left' ? (
                <View style={{ marginRight: 8 }}>{icon}</View>
            ) : null}
            <Text className={textClass}>{title}</Text>
            {!loading && icon && iconPosition === 'right' ? (
                <View style={{ marginLeft: 8 }}>{icon}</View>
            ) : null}
        </>
    );

    if (variant === 'primary') {
        return (
            <TouchableOpacity
                disabled={loading || disabled}
                activeOpacity={0.85}
                {...props}
            >
                <LinearGradient
                    colors={disabled ? ['#A1A1A6', '#86868B'] : ['#1A7CFF', '#0066E6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className={buttonClass}
                    style={{ shadowColor: '#1A7CFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                >
                    {content}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            className={buttonClass}
            disabled={loading || disabled}
            activeOpacity={0.7}
            {...props}
        >
            {content}
        </TouchableOpacity>
    );
};
