import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = 'd12f90476d39d86aeb45459b15eb0a35';

const mixpanel = new Mixpanel(MIXPANEL_TOKEN, true);
mixpanel.init();

export const analytics = {
    // Identify user (call after login)
    identify: (userId: string, props?: {
        name?: string;
        phone?: string;
        email?: string;
        businessName?: string;
        businessCategory?: string;
    }) => {
        try {
            mixpanel.identify(userId);
            if (props) {
                const profile: Record<string, string> = {};
                if (props.name) profile['$name'] = props.name;
                if (props.phone) profile['Phone'] = props.phone;
                if (props.email) profile['$email'] = props.email;
                if (props.businessName) profile['Business Name'] = props.businessName;
                if (props.businessCategory) profile['Business Category'] = props.businessCategory;
                mixpanel.getPeople().set(profile);
            }
        } catch {}
    },

    // Track event
    track: (event: string, props?: Record<string, any>) => {
        try {
            mixpanel.track(event, props);
        } catch {}
    },

    // Reset on logout
    reset: () => {
        try {
            mixpanel.reset();
        } catch {}
    },
};
