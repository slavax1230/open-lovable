'use client';

import React, { useState, useEffect } from 'react';
import { OpenRouterModel, ModelFilter } from '@/lib/ai/model-service';

interface ModelSelectorProps {
  value?: string;
  onChange?: (model: string) => void;
  showRecommendedOnly?: boolean;
  compact?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  showRecommendedOnly = false,
  compact = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ModelFilter>({});
  const [showFilters, setShowFilters] = useState(!compact);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const url = new URL('/api/models', window.location.origin);
        
        if (showRecommendedOnly) {
          url.searchParams.set('recommended', 'true');
        }
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        
        const data = await response.json();
        setModels(data.models || []);
        setFilteredModels(data.models || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('[ModelSelector] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [showRecommendedOnly]);

  // Apply filters whenever search term or filters change
  useEffect(() => {
    let filtered = models;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((m) =>
        m.id.toLowerCase().includes(searchLower) ||
        m.name?.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.free) {
      filtered = filtered.filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0);
    } else if (filters.paid) {
      filtered = filtered.filter((m) => m.pricing.prompt !== 0 || m.pricing.completion !== 0);
    }

    setFilteredModels(filtered);
  }, [searchTerm, filters, models]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-500">Loading models...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="text-sm text-red-700">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search models by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Filter Buttons */}
      {showFilters && !compact && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                free: !prev.free,
                paid: false,
              }))
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filters.free
                ? 'bg-green-100 border-green-300 text-green-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            💚 Free Only
          </button>
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                paid: !prev.paid,
                free: false,
              }))
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filters.paid
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            💙 Paid
          </button>
          <button
            onClick={() => setFilters({})}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Model List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {filteredModels.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No models found matching your criteria
          </div>
        ) : (
          <div className={`max-h-96 overflow-y-auto ${compact ? 'max-h-64' : ''}`}>
            {filteredModels.map((model) => {
              const isFree = model.pricing.prompt === 0 && model.pricing.completion === 0;
              const isSelected = value === model.id;
              
              return (
                <div
                  key={model.id}
                  onClick={() => onChange?.(model.id)}
                  className={`p-3 cursor-pointer border-b border-gray-100 transition-colors ${
                    isSelected
                      ? 'bg-orange-50 border-l-2 border-l-orange-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">
                        {model.name || model.id}
                      </div>
                      {model.description && (
                        <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                          {model.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {isFree && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">Free</span>}
                        {model.context_length && (
                          <span>{Math.floor(model.context_length / 1000)}k ctx</span>
                        )}
                        {model.top_provider && (
                          <span className="text-gray-400">{model.top_provider}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-orange-500 flex-shrink-0">
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="text-xs text-gray-500 text-center">
        Showing {filteredModels.length} of {models.length} models
      </div>
    </div>
  );
}

export default ModelSelector;
