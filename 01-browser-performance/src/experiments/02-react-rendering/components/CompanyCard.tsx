import React from "react";
import type { Company } from "../domain/company";
import { CompanyStats } from "./CompanyStats";

type CompanyCardProps = {
  company: Company;
  onWatchlist: (companyId: string) => void;
  onCompare: (companyId: string) => void;
  onSelect: (companyId: string | null) => void;
  compactMode: boolean;
  isWatchlisted: boolean;
  isCompared: boolean;
  isSelected: boolean;
};

function CompanyCardContent({
  company,
  compactMode,
  isWatchlisted,
  isCompared,
  isSelected,
  onWatchlist,
  onCompare,
  onSelect,
}: CompanyCardProps) {
  const displayMeta = {
    location: `${company.city}, ${company.country}`,
    verified: company.verified,
    areas: company.therapeuticAreas.slice(0, 2),
  };
  return (
    <article
      className={`marketplace-company-card${compactMode ? " is-compact" : ""}${isSelected ? " is-selected" : ""}`}
    >
      <div className="marketplace-company-heading">
        <div>
          <div className="marketplace-company-title">
            <h3>{company.name}</h3>
            {displayMeta.verified && (
              <span className="verified-badge">Verified</span>
            )}
          </div>
          <p>{company.companyType}</p>
        </div>
        <strong className="rating">★ {company.rating.toFixed(1)}</strong>
      </div>
      <p className="marketplace-description">{company.description}</p>
      <dl className="marketplace-company-details">
        <div>
          <dt>Location</dt>
          <dd>{displayMeta.location}</dd>
        </div>
        <div>
          <dt>Team</dt>
          <dd>{company.employeeRange}</dd>
        </div>
        <div>
          <dt>Focus</dt>
          <dd>{displayMeta.areas.join(", ")}</dd>
        </div>
      </dl>
      <CompanyStats company={company} />
      <div className="marketplace-card-actions">
        <button onClick={() => onWatchlist(company.id)} type="button">
          {isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
        </button>
        <label>
          <input
            checked={isCompared}
            onChange={() => onCompare(company.id)}
            type="checkbox"
          />
          Compare
        </label>
        <button
          className="text-button"
          onClick={() => onSelect(company.id)}
          type="button"
        >
          {isSelected ? "Selected" : "View details"}
        </button>
      </div>
    </article>
  );
}
export const CompanyCard = React.memo(CompanyCardContent);
