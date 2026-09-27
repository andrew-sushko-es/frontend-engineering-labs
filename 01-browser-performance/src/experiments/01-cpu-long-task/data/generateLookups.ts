import { buildLookupIndex } from "../domain/lookup";
import type {
  Choice,
  LookupBundle,
  LookupIndexes,
  LookupNode,
} from "../domain/types";

type Taxonomy = { tree: LookupNode[]; selectableIds: string[] };

const countryChoices: Choice[] = [
  { id: "country-us", name: "United States" },
  { id: "country-de", name: "Germany" },
  { id: "country-ch", name: "Switzerland" },
  { id: "country-gb", name: "United Kingdom" },
  { id: "country-fr", name: "France" },
  { id: "country-jp", name: "Japan" },
  { id: "country-sg", name: "Singapore" },
];

const typeChoices: Choice[] = [
  { id: "type-biotech", name: "Biotechnology" },
  { id: "type-cro", name: "Clinical research organization" },
  { id: "type-cdmo", name: "CDMO" },
  { id: "type-diagnostics", name: "Diagnostics" },
  { id: "type-platform", name: "Platform company" },
];

function createTaxonomy(
  prefix: string,
  noun: string,
  breadth: number,
): Taxonomy {
  const selectableIds: string[] = [];
  const buildLevel = (path: number[], level: number): LookupNode[] => {
    if (level === 5) return [];
    return Array.from({ length: breadth }, (_, index) => {
      const nextPath = [...path, index + 1];
      const id = `${prefix}-${nextPath.join("-")}`;
      const children = buildLevel(nextPath, level + 1);
      if (children.length === 0) selectableIds.push(id);
      return {
        id,
        name: `${noun} ${nextPath.map((part) => String(part).padStart(2, "0")).join(".")}`,
        ...(children.length ? { children } : {}),
      };
    });
  };
  return { tree: buildLevel([], 0), selectableIds };
}

function createCities(): LookupNode[] {
  return countryChoices.map((country, countryIndex) => ({
    ...country,
    children: Array.from({ length: 8 }, (_, cityIndex) => ({
      id: `city-${countryIndex + 1}-${cityIndex + 1}`,
      name: [
        "Cambridge",
        "Basel",
        "Boston",
        "Berlin",
        "Lyon",
        "Osaka",
        "Seattle",
        "Singapore",
      ][cityIndex],
    })),
  }));
}

function createSimpleLookups(): Pick<
  LookupBundle,
  "countries" | "cities" | "companyTypes" | "employeeRanges"
> {
  return {
    countries: countryChoices.map(({ id, name }) => ({ id, name })),
    cities: createCities(),
    companyTypes: typeChoices.map(({ id, name }) => ({ id, name })),
    employeeRanges: [
      { id: "employees-1-10", name: "1–10 employees" },
      { id: "employees-11-50", name: "11–50 employees" },
      { id: "employees-51-200", name: "51–200 employees" },
      { id: "employees-201-500", name: "201–500 employees" },
      { id: "employees-501-plus", name: "501+ employees" },
    ],
  };
}

export type LookupFixture = {
  lookups: LookupBundle;
  lookupIndexes: LookupIndexes;
  countryChoices: Choice[];
  companyTypeChoices: Choice[];
  therapeuticAreaChoices: Choice[];
  serviceIds: string[];
  technologyIds: string[];
  fixtureTherapeuticAreaId: string;
};

export function createLookupFixture(size: "medium" | "large"): LookupFixture {
  const breadth = size === "large" ? 5 : 4;
  const therapeuticAreas = createTaxonomy(
    "therapy",
    "Therapeutic area",
    breadth,
  );
  const services = createTaxonomy("service", "Service capability", breadth);
  const technologies = createTaxonomy(
    "technology",
    "Technology platform",
    breadth,
  );
  const simple = createSimpleLookups();
  const fixtureTherapeuticAreaId =
    therapeuticAreas.selectableIds[
      Math.floor(therapeuticAreas.selectableIds.length * 0.8)
    ];
  const therapeuticAreaChoices = therapeuticAreas.selectableIds
    .filter(
      (_, index) =>
        index %
          Math.max(
            1,
            Math.floor(therapeuticAreas.selectableIds.length / 12),
          ) ===
        0,
    )
    .map((id) => ({
      id,
      name: `Therapeutic area ${id.replace("therapy-", "").replaceAll("-", ".")}`,
    }));
  therapeuticAreaChoices.unshift({
    id: fixtureTherapeuticAreaId,
    name: `Therapeutic area ${fixtureTherapeuticAreaId.replace("therapy-", "").replaceAll("-", ".")}`,
  });

  const lookups: LookupBundle = {
    ...simple,
    therapeuticAreas: therapeuticAreas.tree,
    services: services.tree,
    technologies: technologies.tree,
  };

  const lookupIndexes: LookupIndexes = {
    countries: buildLookupIndex(lookups.countries),
    cities: buildLookupIndex(lookups.cities),
    companyTypes: buildLookupIndex(lookups.companyTypes),
    employeeRanges: buildLookupIndex(lookups.employeeRanges),
    therapeuticAreas: buildLookupIndex(lookups.therapeuticAreas),
    services: buildLookupIndex(lookups.services),
    technologies: buildLookupIndex(lookups.technologies),
  };

  return {
    lookups,
    lookupIndexes,
    countryChoices,
    companyTypeChoices: typeChoices,
    therapeuticAreaChoices,
    serviceIds: services.selectableIds,
    technologyIds: technologies.selectableIds,
    fixtureTherapeuticAreaId,
  };
}
