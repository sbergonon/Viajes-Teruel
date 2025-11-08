import { Subscription, Route } from '../types';

const SUBSCRIPTIONS_KEY = 'teruelTripPlanner_subscriptions';

// Function to create a unique ID for a route to avoid duplicates
const createSubscriptionId = (route: Route): string => {
    const transportTypes = route.steps.map(s => s.transportType).sort().join(',');
    return `${route.summary}|${route.totalDuration}|${route.totalPrice}|${transportTypes}`.replace(/\s/g, '');
};

export const getSubscriptions = (): Subscription[] => {
    try {
        const stored = localStorage.getItem(SUBSCRIPTIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error("Failed to parse subscriptions from localStorage", error);
        localStorage.removeItem(SUBSCRIPTIONS_KEY);
        return [];
    }
};

export const addSubscription = (route: Route, date: string): void => {
    try {
        const subscriptions = getSubscriptions();
        const id = createSubscriptionId(route);
        
        if (subscriptions.some(s => s.id === id)) {
            return; // Already subscribed
        }

        const newSubscription: Subscription = {
            id,
            origin: route.steps[0]?.origin || 'N/A',
            destination: route.steps[route.steps.length - 1]?.destination || 'N/A',
            summary: route.summary,
            date,
        };
        
        const newSubscriptions = [newSubscription, ...subscriptions].slice(0, 10); // Limit to 10 subscriptions
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(newSubscriptions));
    } catch (error) {
        console.error("Failed to save subscription to localStorage", error);
    }
};

export const removeSubscription = (subscriptionId: string): void => {
    try {
        let subscriptions = getSubscriptions();
        subscriptions = subscriptions.filter(s => s.id !== subscriptionId);
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
    } catch (error) {
        console.error("Failed to remove subscription from localStorage", error);
    }
};

export const isSubscribed = (route: Route): boolean => {
    const subscriptions = getSubscriptions();
    const id = createSubscriptionId(route);
    return subscriptions.some(s => s.id === id);
};

export const getSubscriptionId = (route: Route): string => createSubscriptionId(route);
