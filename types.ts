export enum TransportType {
    BUS = 'Bus',
    TRAIN = 'Train',
    TAXI = 'Taxi',
    WALK = 'Walk',
}

export enum BookingType {
    WEB = 'Web',
    PHONE = 'Phone',
    EMAIL = 'Email',
    ON_SITE = 'OnSite',
    NOT_AVAILABLE = 'NotAvailable',
}

export interface BookingInfo {
    type: BookingType;
    details: string;
    notes?: string;
    fareInfo?: string;
}

export interface GeoPoint {
    lat: number;
    lng: number;
}

export interface Step {
    transportType: TransportType;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    company?: string;
    line?: string;
    price: number;
    bookingInfo: BookingInfo;
    originCoords: GeoPoint;
    destinationCoords: GeoPoint;
}

export interface Accommodation {
    name: string;
    type: string;
    contactDetails: string;
    notes?: string;
}

export interface Route {
    summary: string;
    totalDuration: string;
    totalPrice: number;
    steps: Step[];
    notes?: string;
    accommodationSuggestions?: Accommodation[];
}

export interface TripPlan {
    routes: Route[];
}

export interface TripIdea {
    title: string;
    description: string;
    origin: string;
    destination: string;
}

export interface RecentSearch {
    origin: string;
    destination: string;
    date: string;
    isOnDemand: boolean;
    passengers: number;
    isWheelchairAccessible: boolean;
    isTaxiOnDemand: boolean;
    findAccommodation: boolean;
}

export interface Subscription {
    id: string;
    origin: string;
    destination: string;
    summary: string;
    date: string;
}
