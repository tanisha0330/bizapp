import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns the correct bottom padding for any absolute-positioned bottom bar,
 * accounting for Android gesture nav / button nav bar height.
 * Minimum 16px so it always looks decent even on devices with no system bar.
 */
export const useBottomSafe = (minPadding = 16): number => {
    const insets = useSafeAreaInsets();
    return Math.max(insets.bottom, minPadding);
};
