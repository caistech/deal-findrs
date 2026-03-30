"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { forwardSearch, reverseSearch, parseCoordinates, parseFeature } from "@/lib/mapbox";
import type { MapboxFeature, GeocodedAddress } from "@/lib/mapbox";

interface AddressAutocompleteProps {
  value: string;
  onSelect: (address: GeocodedAddress) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onSelect,
  onChange,
  placeholder = "Start typing an address...",
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    setLoading(true);
    try {
      // Check if input looks like coordinates first
      const coords = parseCoordinates(query);
      const results = coords
        ? await reverseSearch(coords.lat, coords.lng)
        : await forwardSearch(query);
      setSuggestions(results);
      setOpen(results.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(val: string) {
    setInputValue(val);
    onChange?.(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function handleSelect(feature: MapboxFeature) {
    const parsed = parseFeature(feature);
    setInputValue(parsed.formatted_address);
    setOpen(false);
    setSuggestions([]);
    onSelect(parsed);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${className || ""}`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
          {suggestions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-amber-50 text-sm flex items-start gap-3 border-b border-gray-50 last:border-0"
              onClick={() => handleSelect(feature)}
            >
              <MapPin className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{feature.place_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
