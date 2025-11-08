import React from 'react';
import { RecentSearch } from '../types';

interface RecentSearchesProps {
    searches: RecentSearch[];
    onSelect: (search: RecentSearch) => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({ searches, onSelect }) => {
    if (searches.length === 0) {
        return null;
    }

    return (
        <section className="mb-6">
            <h3 className="text-md font-semibold text-gray-700 mb-3">Búsquedas recientes</h3>
            <div className="flex overflow-x-auto space-x-3 pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {searches.map((search, index) => {
                    const isTaxiSearch = search.isTaxiOnDemand || (search.origin === search.destination && search.origin !== '');
                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(search)}
                            className="flex-shrink-0 bg-white p-3 rounded-lg shadow-md hover:shadow-lg hover:bg-teal-50 border border-gray-200 transition-all text-left w-48"
                        >
                            <div className="flex items-center text-teal-600 mb-1.5">
                                <i className={`fa-solid ${isTaxiSearch ? 'fa-taxi' : 'fa-route'} fa-fw mr-2`} aria-hidden="true"></i>
                                <p className="text-sm font-semibold truncate text-gray-800" title={isTaxiSearch ? search.origin : `${search.origin} a ${search.destination}`}>
                                    {isTaxiSearch ? search.origin : `${search.origin} → ${search.destination}`}
                                </p>
                            </div>
                            <p className="text-xs text-gray-500">{new Date(search.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};