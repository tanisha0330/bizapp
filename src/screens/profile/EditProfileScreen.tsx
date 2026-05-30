import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { editProfileSchema, EditProfileFormData } from '../../utils/validation';
import { useColors } from '../../utils/theme';

export const EditProfileScreen = () => {
    const navigation = useNavigation();
    const C = useColors();
    const { user, updateUser } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<EditProfileFormData>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: {
            fullName: user?.fullName || '',
            phone: user?.phone || '',
        }
    });

    const onSubmit = async (data: EditProfileFormData) => {
        setLoading(true);
        setTimeout(() => {
            updateUser(data);
            setLoading(false);
            navigation.goBack();
        }, 1000);
    };

    return (
        <ScreenWrapper className="px-6 pt-6" style={{ backgroundColor: C.background }}>
            <Text className="text-2xl font-bold mb-6" style={{ color: C.text }}>Edit Profile</Text>

            <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Full Name"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={errors.fullName?.message}
                        style={{ backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }}
                    />
                )}
            />

            <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Phone Number"
                        keyboardType="phone-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={errors.phone?.message}
                        style={{ backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }}
                    />
                )}
            />

            <Button title="Save Changes" onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4" />
        </ScreenWrapper>
    );
};
