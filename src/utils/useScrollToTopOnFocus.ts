import { useRef, useCallback } from 'react';
import { ScrollView, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function useScrollToTopOnFocus() {
    const scrollRef = useRef<ScrollView>(null);

    useFocusEffect(
        useCallback(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
        }, [])
    );

    return scrollRef;
}

export function useFlatListScrollToTopOnFocus() {
    const flatListRef = useRef<FlatList>(null);

    useFocusEffect(
        useCallback(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }, [])
    );

    return flatListRef;
}
