export interface OwnerAccountData {
    phone: string;
    businessName: string;
    contactEmail: string;
    contactPhone: string;
    bankLast4: string;
    resEmail: boolean;
    resSms: boolean;
    payEmail: boolean;
    paySms: boolean;
}

export const SAMPLE_OWNER_ACCOUNT: OwnerAccountData = {
    phone: "(555) 234-1111",
    businessName: "Harbor & Coast Hospitality LLC",
    contactEmail: "stays@harborhousemonterey.example.com",
    contactPhone: "(831) 555-0194",
    bankLast4: "4218",
    resEmail: true,
    resSms: true,
    payEmail: true,
    paySms: false,
};

export const EMPTY_OWNER_ACCOUNT: OwnerAccountData = {
    phone: "",
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    bankLast4: "4218",
    resEmail: true,
    resSms: false,
    payEmail: true,
    paySms: false,
};