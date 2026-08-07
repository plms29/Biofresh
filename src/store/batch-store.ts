// ============================================================
// BioFresh OS — Batch Store (Zustand)
// Global state management for batch data
// ============================================================

import { create } from "zustand";
import type { Batch, DashboardMetrics } from "@/types";
import { mockBatches, mockDashboardMetrics } from "@/lib/mock-data";

interface BatchState {
  batches: Batch[];
  selectedBatch: Batch | null;
  metrics: DashboardMetrics;
  searchQuery: string;

  // Actions
  selectBatch: (batch: Batch | null) => void;
  selectBatchById: (id: string) => void;
  setSearchQuery: (query: string) => void;
  getFilteredBatches: () => Batch[];
  getBatchById: (id: string) => Batch | undefined;
  fetchBatches: () => Promise<void>;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: mockBatches, // Default to mock data for instant load
  selectedBatch: null,
  metrics: mockDashboardMetrics,
  searchQuery: "",

  selectBatch: (batch) => set({ selectedBatch: batch }),

  selectBatchById: (id) => {
    const batch = get().batches.find((b) => b.id === id) || null;
    set({ selectedBatch: batch });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredBatches: () => {
    const { batches, searchQuery } = get();
    if (!searchQuery.trim()) return batches;
    const q = searchQuery.toLowerCase();
    return batches.filter(
      (b) =>
        b.id.toLowerCase().includes(q) ||
        b.fruitLabel.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.farmName.toLowerCase().includes(q)
    );
  },

  getBatchById: (id) => {
    return get().batches.find((b) => b.id === id);
  },

  fetchBatches: async () => {
    try {
      // Lazy load to prevent issues if run on server
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("batches")
        .select(`
          *,
          treatments (*),
          quality_metrics (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Transform snake_case DB fields to camelCase if needed,
        // Assuming schema aligns closely or transforming as necessary.
        // For now, if data exists, set it. (Will need transformation in production)
        
        // Since we are doing a seamless transition, let's keep mock data 
        // if DB is empty so the UI doesn't look broken.
        // set({ batches: data as any }); 
      }
    } catch (error) {
      console.warn("Supabase fetch failed (using mock data):", error);
      // Keep mock data
    }
  },
}));
