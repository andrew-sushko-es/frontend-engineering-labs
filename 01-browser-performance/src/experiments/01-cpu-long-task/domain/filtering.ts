import { resolveLookupLabelFromIndex } from "./lookup";
import { normalizeSearchValue } from "./normalization";
import type { Company, LookupIndexes, SearchCriteria } from "./types";

export function matchesCompanyFilters(
  company: Company,
  criteria: SearchCriteria,
  lookupIndexes: LookupIndexes,
) {
  const searchableValues = [
    company.name,
    company.description,
    resolveLookupLabelFromIndex(lookupIndexes.countries, company.countryId),
    resolveLookupLabelFromIndex(lookupIndexes.cities, company.cityId),
    resolveLookupLabelFromIndex(
      lookupIndexes.companyTypes,
      company.companyTypeId,
    ),
    resolveLookupLabelFromIndex(
      lookupIndexes.employeeRanges,
      company.employeeRangeId,
    ),
    ...company.therapeuticAreaIds.map((id) =>
      resolveLookupLabelFromIndex(lookupIndexes.therapeuticAreas, id),
    ),
    ...company.serviceIds.map((id) =>
      resolveLookupLabelFromIndex(lookupIndexes.services, id),
    ),
    ...company.technologyIds.map((id) =>
      resolveLookupLabelFromIndex(lookupIndexes.technologies, id),
    ),
  ];
  const normalizedSearch = normalizeSearchValue(criteria.searchText);
  const searchMatches =
    !normalizedSearch ||
    searchableValues.some((value) =>
      normalizeSearchValue(value).includes(normalizedSearch),
    );

  const selectedCountry = criteria.countryId
    ? normalizeSearchValue(
        resolveLookupLabelFromIndex(
          lookupIndexes.countries,
          criteria.countryId,
        ),
      )
    : "";
  const countryMatches =
    !criteria.countryId ||
    normalizeSearchValue(
      resolveLookupLabelFromIndex(lookupIndexes.countries, company.countryId),
    ) === selectedCountry;

  const selectedType = criteria.companyTypeId
    ? normalizeSearchValue(
        resolveLookupLabelFromIndex(
          lookupIndexes.companyTypes,
          criteria.companyTypeId,
        ),
      )
    : "";
  const typeMatches =
    !criteria.companyTypeId ||
    normalizeSearchValue(
      resolveLookupLabelFromIndex(
        lookupIndexes.companyTypes,
        company.companyTypeId,
      ),
    ) === selectedType;

  const selectedTherapeuticArea = criteria.therapeuticAreaId
    ? normalizeSearchValue(
        resolveLookupLabelFromIndex(
          lookupIndexes.therapeuticAreas,
          criteria.therapeuticAreaId,
        ),
      )
    : "";
  const therapeuticAreaMatches =
    !criteria.therapeuticAreaId ||
    company.therapeuticAreaIds.some(
      (id) =>
        normalizeSearchValue(
          resolveLookupLabelFromIndex(lookupIndexes.therapeuticAreas, id),
        ) === selectedTherapeuticArea,
    );

  return (
    searchMatches &&
    countryMatches &&
    typeMatches &&
    therapeuticAreaMatches &&
    (!criteria.activeOnly || company.active)
  );
}

export function filterCompanies(
  companies: Company[],
  criteria: SearchCriteria,
  lookupIndexes: LookupIndexes,
) {
  return companies.filter((company) =>
    matchesCompanyFilters(company, criteria, lookupIndexes),
  );
}
