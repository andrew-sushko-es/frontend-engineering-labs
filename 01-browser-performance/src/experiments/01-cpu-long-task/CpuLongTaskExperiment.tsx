import { useState } from "react";
import { measureApplyFilters } from "./benchmark/measurements";
import { generateCompanies } from "./data/generateCompanies";
import { createLookupFixture } from "./data/generateLookups";
import { filterCompanies } from "./domain/filtering";
import { resolveLookupLabel } from "./domain/lookup";
import { sortCompanies } from "./domain/sorting";
import type { Company, SearchCriteria } from "./domain/types";

type DatasetSize = 250 | 500 | 1000 | 2000;

const mediumFixture = createLookupFixture("medium");
const largeFixture = createLookupFixture("large");
const initialCriteria: SearchCriteria = {
  searchText: "",
  companyTypeId: "",
  countryId: "",
  therapeuticAreaId: "",
  activeOnly: false,
  sortBy: "name",
};

function getFixture(size: "medium" | "large") {
  return size === "large" ? largeFixture : mediumFixture;
}

function CompanyCard({
  company,
  taxonomySize,
}: {
  company: Company;
  taxonomySize: "medium" | "large";
}) {
  const lookups = getFixture(taxonomySize).lookups;
  return (
    <article className="company-card">
      <div className="company-card-heading">
        <div>
          <h3>{company.name}</h3>
          <p>
            {resolveLookupLabel(lookups.companyTypes, company.companyTypeId)}
          </p>
        </div>
        <span className={company.active ? "status active" : "status"}>
          {company.active ? "Active" : "Inactive"}
        </span>
      </div>
      <p>{company.description}</p>
      <dl>
        <div>
          <dt>Location</dt>
          <dd>
            {resolveLookupLabel(lookups.cities, company.cityId)},{" "}
            {resolveLookupLabel(lookups.countries, company.countryId)}
          </dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>
            {resolveLookupLabel(
              lookups.employeeRanges,
              company.employeeRangeId,
            )}
          </dd>
        </div>
        <div>
          <dt>Rating</dt>
          <dd>{company.rating.toFixed(1)} / 5</dd>
        </div>
      </dl>
    </article>
  );
}

export function CpuLongTaskExperiment() {
  const [datasetSize, setDatasetSize] = useState<DatasetSize>(1000);
  const [taxonomySize, setTaxonomySize] = useState<"medium" | "large">("large");
  const [criteria, setCriteria] = useState<SearchCriteria>(initialCriteria);
  const [results, setResults] = useState<Company[]>(() =>
    generateCompanies(1000, largeFixture),
  );
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const fixture = getFixture(taxonomySize);
  const companies = generateCompanies(datasetSize, fixture);

  const updateCriteria = <Key extends keyof SearchCriteria>(
    key: Key,
    value: SearchCriteria[Key],
  ) => {
    setCriteria((current) => ({ ...current, [key]: value }));
  };

  const updateDatasetSize = (nextSize: DatasetSize) => {
    setDatasetSize(nextSize);
    setResults(generateCompanies(nextSize, getFixture(taxonomySize)));
    setLastDuration(null);
  };

  const updateTaxonomySize = (nextSize: "medium" | "large") => {
    setTaxonomySize(nextSize);
    setResults(generateCompanies(datasetSize, getFixture(nextSize)));
    setLastDuration(null);
  };

  const applyFilters = () => {
    const measurement = measureApplyFilters(() =>
      sortCompanies(
        filterCompanies(companies, criteria, fixture.lookups),
        criteria,
        fixture.lookups,
      ),
    );
    setResults(measurement.result);
    setLastDuration(measurement.duration);
  };

  const resetFilters = () => {
    setCriteria(initialCriteria);
    setResults(companies);
    setLastDuration(null);
  };

  return (
    <div className="experiment-layout">
      <section className="task-panel" aria-labelledby="task-heading">
        <p className="section-label">Task</p>
        <h2 id="task-heading">Find the interaction that blocks the page</h2>
        <p>
          Use this company directory to record and inspect a repeatable
          filtering interaction.
        </p>
      </section>

      <section
        className="reproduction-panel"
        aria-labelledby="reproduction-heading"
      >
        <p className="section-label" id="reproduction-heading">
          Reproduction steps
        </p>
        <ol>
          <li>Select 1000 or 2000 companies and Large taxonomy.</li>
          <li>
            Enter <code>biopharma</code> in Search companies.
          </li>
          <li>Select United States and the first therapeutic-area option.</li>
          <li>Enable Active only and sort by Country.</li>
          <li>Set CPU throttling to 6×.</li>
          <li>Start a Performance recording, click Apply Filters, then stop recording after the results update.</li>
        </ol>
      </section>

      <section className="controls-panel" aria-labelledby="controls-heading">
        <p className="section-label" id="controls-heading">
          Scenario controls
        </p>
        <div className="control-groups">
          <fieldset>
            <legend>Dataset</legend>
            {([250, 500, 1000, 2000] as const).map((size) => (
              <label key={size}>
                <input
                  checked={datasetSize === size}
                  name="dataset"
                  onChange={() => updateDatasetSize(size)}
                  type="radio"
                />{" "}
                {size} companies
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Taxonomy size</legend>
            {(["medium", "large"] as const).map((size) => (
              <label key={size}>
                <input
                  checked={taxonomySize === size}
                  name="taxonomy"
                  onChange={() => updateTaxonomySize(size)}
                  type="radio"
                />{" "}
                {size[0].toUpperCase() + size.slice(1)}
              </label>
            ))}
          </fieldset>
        </div>
        <div className="filter-grid">
          <label>
            Search companies
            <input
              onChange={(event) =>
                updateCriteria("searchText", event.target.value)
              }
              placeholder="Search companies"
              value={criteria.searchText}
            />
          </label>
          <label>
            Company type
            <select
              onChange={(event) =>
                updateCriteria("companyTypeId", event.target.value)
              }
              value={criteria.companyTypeId}
            >
              <option value="">All company types</option>
              {fixture.companyTypeChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country
            <select
              onChange={(event) =>
                updateCriteria("countryId", event.target.value)
              }
              value={criteria.countryId}
            >
              <option value="">All countries</option>
              {fixture.countryChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Therapeutic area
            <select
              onChange={(event) =>
                updateCriteria("therapeuticAreaId", event.target.value)
              }
              value={criteria.therapeuticAreaId}
            >
              <option value="">All therapeutic areas</option>
              {fixture.therapeuticAreaChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select
              onChange={(event) =>
                updateCriteria(
                  "sortBy",
                  event.target.value as SearchCriteria["sortBy"],
                )
              }
              value={criteria.sortBy}
            >
              <option value="name">Company name</option>
              <option value="country">Country</option>
              <option value="companyType">Company type</option>
              <option value="rating">Rating</option>
            </select>
          </label>
          <label className="toggle-label">
            <input
              checked={criteria.activeOnly}
              onChange={(event) =>
                updateCriteria("activeOnly", event.target.checked)
              }
              type="checkbox"
            />{" "}
            Active only
          </label>
        </div>
        <div className="actions">
          <button
            className="primary-button"
            onClick={applyFilters}
            type="button"
          >
            Apply Filters
          </button>
          <button
            className="secondary-button"
            onClick={resetFilters}
            type="button"
          >
            Reset Filters
          </button>
        </div>
      </section>

      <section className="results-panel" aria-labelledby="results-heading">
        <div className="results-heading">
          <div>
            <p className="section-label">Experiment application</p>
            <h2 id="results-heading">
              Companies <span>{results.length} results</span>
            </h2>
          </div>
          {lastDuration !== null && (
            <p className="diagnostic">
              Last Apply duration: {lastDuration.toFixed(1)} ms
            </p>
          )}
        </div>
        <div className="company-grid">
          {results.map((company) => (
            <CompanyCard
              company={company}
              key={company.id}
              taxonomySize={taxonomySize}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
