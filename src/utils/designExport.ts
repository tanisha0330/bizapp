import { Alert, InteractionManager } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import type { SavedDesign } from '../store/useDesignStore';

type CaptureTarget = Parameters<typeof captureRef>[0];

type SaveDesignInput = {
    viewRef: CaptureTarget;
    design: Omit<SavedDesign, 'imageUri'>;
    addDesign: (design: SavedDesign) => void;
    saveToPhone?: boolean;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error || 'Unknown error');

export const captureDesignImage = async (viewRef: CaptureTarget): Promise<string> => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
            await new Promise<void>(resolve => InteractionManager.runAfterInteractions(() => resolve()));
            await wait(attempt === 0 ? 120 : 350);

            const uri = await captureRef(viewRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            if (typeof uri === 'string' && uri.length > 0) {
                return uri;
            }

            lastError = new Error('Capture returned an empty file path.');
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(`Could not capture poster. ${getErrorMessage(lastError)}`);
};

export const saveImageToPhone = async (uri: string): Promise<boolean> => {
    try {
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (permission.status !== 'granted') {
            return false;
        }

        await MediaLibrary.saveToLibraryAsync(uri);
        return true;
    } catch (error) {
        console.warn('Saving image to phone failed:', error);
        return false;
    }
};

export const copyImageToDesignsFolder = async (uri: string, designId: string): Promise<string> => {
    const roots = [FileSystem.documentDirectory, FileSystem.cacheDirectory].filter(Boolean) as string[];

    for (const root of roots) {
        try {
            const dir = `${root}designs/`;
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
            const destination = `${dir}${designId}.png`;
            await FileSystem.copyAsync({ from: uri, to: destination });
            return destination;
        } catch (error) {
            console.warn('Persisting design copy failed for root:', root, error);
        }
    }

    return uri;
};

export const captureAndSaveDesign = async ({
    viewRef,
    design,
    addDesign,
    saveToPhone = false,
}: SaveDesignInput): Promise<{ imageUri: string; phoneSaved: boolean }> => {
    const capturedUri = await captureDesignImage(viewRef);
    const phoneSaved = saveToPhone ? await saveImageToPhone(capturedUri) : false;
    const imageUri = await copyImageToDesignsFolder(capturedUri, design.id);

    addDesign({
        ...design,
        imageUri,
    });

    return { imageUri, phoneSaved };
};

export const showExportError = (title = 'Export Failed') => {
    Alert.alert(
        title,
        'Could not export this design. Please wait for the poster image to finish loading, then try again.'
    );
};
