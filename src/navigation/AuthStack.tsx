import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { BusinessSetupScreen } from '../screens/auth/BusinessSetupScreen';
import { ConnectAccountsScreen } from '../screens/auth/ConnectAccountsScreen';
import { SelectFacebookPagesScreen } from '../screens/auth/SelectFacebookPagesScreen';
import { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="BusinessSetup" component={BusinessSetupScreen} />
            <Stack.Screen name="ConnectAccounts" component={ConnectAccountsScreen} />
            <Stack.Screen name="SelectFacebookPages" component={SelectFacebookPagesScreen} />
        </Stack.Navigator>
    );
};
