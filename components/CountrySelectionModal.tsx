import React, { useState } from 'react';

interface CountrySelectionModalProps {
  isOpen: boolean;
  currentCountry: string | null;
  onClose: () => void;
  onSelect: (country: string | null) => void;
}

const COUNTRIES = [
  { value: null, label: '🌍 Generalized (No specific country)' },
  { value: 'Afghanistan', label: '🇦🇫 Afghanistan' },
  { value: 'Argentina', label: '🇦🇷 Argentina' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'Austria', label: '🇦🇹 Austria' },
  { value: 'Bangladesh', label: '🇧🇩 Bangladesh' },
  { value: 'Belgium', label: '🇧🇪 Belgium' },
  { value: 'Brazil', label: '🇧🇷 Brazil' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  { value: 'Chile', label: '🇨🇱 Chile' },
  { value: 'China', label: '🇨🇳 China' },
  { value: 'Colombia', label: '🇨🇴 Colombia' },
  { value: 'Czech Republic', label: '🇨🇿 Czech Republic' },
  { value: 'Denmark', label: '🇩🇰 Denmark' },
  { value: 'Egypt', label: '🇪🇬 Egypt' },
  { value: 'Ethiopia', label: '🇪🇹 Ethiopia' },
  { value: 'Finland', label: '🇫🇮 Finland' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Germany', label: '🇩🇪 Germany' },
  { value: 'Ghana', label: '🇬🇭 Ghana' },
  { value: 'Greece', label: '🇬🇷 Greece' },
  { value: 'Hungary', label: '🇭🇺 Hungary' },
  { value: 'India', label: '🇮🇳 India' },
  { value: 'Indonesia', label: '🇮🇩 Indonesia' },
  { value: 'Iran', label: '🇮🇷 Iran' },
  { value: 'Iraq', label: '🇮🇶 Iraq' },
  { value: 'Ireland', label: '🇮🇪 Ireland' },
  { value: 'Israel', label: '🇮🇱 Israel' },
  { value: 'Italy', label: '🇮🇹 Italy' },
  { value: 'Japan', label: '🇯🇵 Japan' },
  { value: 'Jordan', label: '🇯🇴 Jordan' },
  { value: 'Kenya', label: '🇰🇪 Kenya' },
  { value: 'Malaysia', label: '🇲🇾 Malaysia' },
  { value: 'Mexico', label: '🇲🇽 Mexico' },
  { value: 'Morocco', label: '🇲🇦 Morocco' },
  { value: 'Myanmar', label: '🇲🇲 Myanmar' },
  { value: 'Netherlands', label: '🇳🇱 Netherlands' },
  { value: 'New Zealand', label: '🇳🇿 New Zealand' },
  { value: 'Nigeria', label: '🇳🇬 Nigeria' },
  { value: 'Norway', label: '🇳🇴 Norway' },
  { value: 'Pakistan', label: '🇵🇰 Pakistan' },
  { value: 'Peru', label: '🇵🇪 Peru' },
  { value: 'Philippines', label: '🇵🇭 Philippines' },
  { value: 'Poland', label: '🇵🇱 Poland' },
  { value: 'Portugal', label: '🇵🇹 Portugal' },
  { value: 'Romania', label: '🇷🇴 Romania' },
  { value: 'Russia', label: '🇷🇺 Russia' },
  { value: 'Saudi Arabia', label: '🇸🇦 Saudi Arabia' },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'South Africa', label: '🇿🇦 South Africa' },
  { value: 'South Korea', label: '🇰🇷 South Korea' },
  { value: 'Spain', label: '🇪🇸 Spain' },
  { value: 'Sri Lanka', label: '🇱🇰 Sri Lanka' },
  { value: 'Sudan', label: '🇸🇩 Sudan' },
  { value: 'Sweden', label: '🇸🇪 Sweden' },
  { value: 'Switzerland', label: '🇨🇭 Switzerland' },
  { value: 'Syria', label: '🇸🇾 Syria' },
  { value: 'Taiwan', label: '🇹🇼 Taiwan' },
  { value: 'Tanzania', label: '🇹🇿 Tanzania' },
  { value: 'Thailand', label: '🇹🇭 Thailand' },
  { value: 'Turkey', label: '🇹🇷 Turkey' },
  { value: 'Uganda', label: '🇺🇬 Uganda' },
  { value: 'Ukraine', label: '🇺🇦 Ukraine' },
  { value: 'United Arab Emirates', label: '🇦🇪 United Arab Emirates' },
  { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
  { value: 'United States', label: '🇺🇸 United States' },
  { value: 'Venezuela', label: '🇻🇪 Venezuela' },
  { value: 'Vietnam', label: '🇻🇳 Vietnam' },
  { value: 'Yemen', label: '🇾🇪 Yemen' },
  { value: 'Zimbabwe', label: '🇿🇼 Zimbabwe' },
];

const CountrySelectionModal: React.FC<CountrySelectionModalProps> = ({
  isOpen,
  currentCountry,
  onClose,
  onSelect,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(currentCountry);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredCountries = COUNTRIES.filter(country =>
    country.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedCountry !== currentCountry) {
      // Show warning if changing from an existing country
      if (currentCountry !== null) {
        const confirmed = window.confirm(
          '⚠️ Changing country context will remove all expanded nodes (depth 2+) as they may be irrelevant to the new context. Continue?'
        );
        if (!confirmed) return;
      }
    }
    onSelect(selectedCountry);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-2xl font-bold text-gray-900">🎯 Country Context</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Select a country to tailor the cascading effects to that specific context
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="🔍 Search countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Country List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredCountries.map((country) => (
              <button
                key={country.value || 'generalized'}
                onClick={() => setSelectedCountry(country.value)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedCountry === country.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                }`}
              >
                {country.label}
              </button>
            ))}
          </div>
          {filteredCountries.length === 0 && (
            <p className="text-center text-gray-500 py-8">No countries found</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountrySelectionModal;
