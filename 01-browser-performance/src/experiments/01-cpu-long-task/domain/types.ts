export type LookupNode = {
  id: string;
  name: string;
  children?: LookupNode[];
};

export type Company = {
  id: string;
  name: string;
  description: string;
  countryId: string;
  cityId: string;
  companyTypeId: string;
  employeeRangeId: string;
  therapeuticAreaIds: string[];
  serviceIds: string[];
  technologyIds: string[];
  active: boolean;
  rating: number;
};

export type LookupBundle = {
  countries: LookupNode[];
  cities: LookupNode[];
  companyTypes: LookupNode[];
  employeeRanges: LookupNode[];
  therapeuticAreas: LookupNode[];
  services: LookupNode[];
  technologies: LookupNode[];
};

export type LookupIndexes = {
  [Key in keyof LookupBundle]: Map<string, string>;
};

export type Choice = { id: string; name: string };

export type SearchCriteria = {
  searchText: string;
  companyTypeId: string;
  countryId: string;
  therapeuticAreaId: string;
  activeOnly: boolean;
  sortBy: "name" | "country" | "companyType" | "rating";
};
