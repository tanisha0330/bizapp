export type AuthStackParamList = {
    Login: undefined;
    BusinessSetup: { phone?: string };
    ConnectAccounts: { businessName: string; category: string; phone?: string };
    SelectFacebookPages: { businessName: string; category: string; phone?: string };
};

export type MainTabParamList = {
    Home: undefined;
    Designs: undefined;
    Ads: undefined;
    Leads: { filter?: string } | undefined;
    Business: undefined;
};

export type DesignsStackParamList = {
    DesignsList: undefined;
    EditDesign: { template?: any };
};

export type RootStackParamList = {
    Onboarding: undefined;
    Auth: undefined;
    Main: undefined;
    EditDesign: { template?: any };
    EditProfile: undefined;
    TemplateEditor: { template: any };
    CustomPoster: { imageUri?: string; designName?: string } | undefined;
    AIDesignCreator: undefined;
    BusinessCard: undefined;
    WebsiteBuilder: undefined;
    CreateAd: { designUri?: string; designName?: string; draftAd?: any } | undefined;
    PageInsights: undefined;
    LeadsDetail: { title: string; fromDate: string | null };
    SelectFacebookPages: { businessName?: string; category?: string; phone?: string; fromDashboard?: boolean } | undefined;
    ProfileDetails: undefined;
};
