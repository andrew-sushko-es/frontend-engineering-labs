import { useMarketplace } from "../context/useMarketplace";
import { filterCompanies } from "../domain/filtering";
import { CompanyCard } from "./CompanyCard";

export function CompanyList() {
  const {
    companies,
    search,
    filters,
    compactMode,
    watchlist,
    compareSelection,
    selectedCompanyId,
    toggleWatchlist,
    toggleCompare,
    setSelectedCompanyId,
  } = useMarketplace();
  const visibleCompanies = filterCompanies(companies, search, filters);

  return (
    <section
      className="marketplace-results"
      aria-labelledby="marketplace-results-heading"
    >
      <div className="marketplace-results-heading">
        <div>
          <p className="section-label">Marketplace results</p>
          <h2 id="marketplace-results-heading">
            Companies <span>{visibleCompanies.length} visible</span>
          </h2>
        </div>
      </div>
      <div className="marketplace-company-grid">
        {visibleCompanies.map((company) => {
          const isWatchlisted = watchlist.has(company.id);
          const isCompared = compareSelection.includes(company.id);
          const isSelected = selectedCompanyId === company.id;
          return (
            <CompanyCard
              company={company}
              key={company.id}
              compactMode={compactMode}
              isCompared={isCompared}
              isSelected={isSelected}
              isWatchlisted={isWatchlisted}
              onCompare={toggleCompare}
              onSelect={setSelectedCompanyId}
              onWatchlist={toggleWatchlist}
            />
          );
        })}
      </div>
    </section>
  );
}
