import { useCallback, useState, type ReactNode } from "react";
import { generateCompanies } from "../data/generateCompanies";
import type { Company, MarketplaceFilters } from "../domain/company";
import {
  MarketplaceContext,
  type DatasetSize,
} from "./marketplaceContextValue";

const initialFilters: MarketplaceFilters = {
  country: "",
  companyType: "",
  verifiedOnly: false,
};

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [datasetSize, setDatasetSizeState] = useState<DatasetSize>(500);
  const [companies, setCompanies] = useState<Company[]>(() =>
    generateCompanies(500),
  );
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<MarketplaceFilters>(initialFilters);
  const [watchlist, setWatchlist] = useState<Set<string>>(() => new Set());
  const [compactMode, setCompactMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );

  const setDatasetSize = (size: DatasetSize) => {
    setDatasetSizeState(size);
    setCompanies(generateCompanies(size));
    setCompareSelection([]);
    setSelectedCompanyId(null);
  };

  const toggleWatchlist = useCallback((companyId: string) => {
    setWatchlist((current) => {
      const next = new Set(current);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }, []);

  const toggleCompare = useCallback((companyId: string) => {
    setCompareSelection((current) =>
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId],
    );
  }, []);

  return (
    <MarketplaceContext.Provider
      value={{
        companies,
        datasetSize,
        search,
        filters,
        watchlist,
        compactMode,
        compareSelection,
        selectedCompanyId,
        setDatasetSize,
        setSearch,
        setFilters,
        toggleWatchlist,
        setCompactMode,
        toggleCompare,
        setSelectedCompanyId,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}
