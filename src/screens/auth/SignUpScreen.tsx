import React, { useState } from 'react';
import { View, Text, ScrollView, Keyboard } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { signUpSchema, SignUpFormData } from '../../utils/validation';

export const SignUpScreen = () => {
    const navigation = useNavigation<any>();
    const login = useAuthStore((state) => state.login);
    const [loading, setLoading] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
    });

    const onSubmit = async (data: SignUpFormData) => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            login({
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
            });
        }, 1500);
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 120 }}>
                <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
                <Text className="text-gray-500 mb-8">Join Biz499 to start growing your business.</Text>

                <Controller
                    control={control}
                    name="fullName"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Full Name"
                            placeholder="John Doe"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            error={errors.fullName?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Email"
                            placeholder="john@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            error={errors.email?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Phone"
                            placeholder="9876543210"
                            keyboardType="phone-pad"
                            onBlur={onBlur}
                            onChangeText={(text) => {
                                onChange(text);
                                if (text.length === 10) {
                                    Keyboard.dismiss();
                                }
                            }}
                            value={value}
                            error={errors.phone?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Password"
                            placeholder="********"
                            secureTextEntry
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            error={errors.password?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Confirm Password"
                            placeholder="********"
                            secureTextEntry
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            error={errors.confirmPassword?.message}
                        />
                    )}
                />

                <Button title="Create Account" onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4 mb-4" />

                <View className="flex-row justify-center mt-4 mb-8">
                    <Text className="text-gray-600">Already have an account? </Text>
                    <Button
                        title="Log In"
                        variant="ghost"
                        className="py-0 px-0 h-auto"
                        onPress={() => navigation.navigate('Login')}
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};
