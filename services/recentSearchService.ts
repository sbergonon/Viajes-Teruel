import { RecentSearch } from '../types';

const RECENT_SEARCHES_KEY = 'teruelTripPlanner_recentSearches';

export const getRecentSearches = (): RecentSearch[] => {
    try {
        const storedSearches = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (storedSearches) {
            return JSON.parse(storedSearches);
        }
    } catch (error) {
        console.error("Failed to parse recent searches from localStorage", error);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
        return [];
    }
    return [];
};

export const saveRecentSearch = (search: RecentSearch): void => {
    try {
        const searches = getRecentSearches();
        
        // Create a unique key for the search to check for duplicates
        const searchKey = `${search.origin}|${search.destination}|${search.isTaxiOnDemand}|${search.isUrgent}`;

        // Remove any existing duplicate search based on the key
        const filteredSearches = searches.filter(s => 
            `${s.origin}|${s.destination}|${s.isTaxiOnDemand}|${s.isUrgent}` !== searchKey
        );

        // Add the new search to the beginning of the list
        const newSearches = [search, ...filteredSearches];
        
        // Ensure we only store the last 5 searches
        const limitedSearches = newSearches.slice(0, 5);

        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(limitedSearches));
    } catch (error) {
        console.error("Failed to save recent searches to localStorage", error);
    }
};