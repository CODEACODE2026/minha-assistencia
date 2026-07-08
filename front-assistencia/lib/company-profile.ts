export type CompanyProfile = {
  nome: string;
  responsavel: string;
  documento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  cidade: string;
  site: string;
  observacaoPdf: string;
  logo?: string | null;
};

export const companyProfileStorageKey = "minha-assistencia:company-profile";
export const companyProfileUpdatedEvent = "minha-assistencia:company-profile-updated";

export const defaultCompanyProfile: CompanyProfile = {
  nome: "Minha Assistencia",
  responsavel: "",
  documento: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  cidade: "",
  site: "",
  observacaoPdf: "",
  logo: null
};

export function getStoredCompanyProfile(): CompanyProfile {
  if (typeof window === "undefined") {
    return defaultCompanyProfile;
  }

  const raw = window.localStorage.getItem(companyProfileStorageKey);
  if (!raw) {
    return defaultCompanyProfile;
  }

  try {
    return { ...defaultCompanyProfile, ...(JSON.parse(raw) as Partial<CompanyProfile>) };
  } catch {
    window.localStorage.removeItem(companyProfileStorageKey);
    return defaultCompanyProfile;
  }
}

export function setStoredCompanyProfile(profile: CompanyProfile) {
  window.localStorage.setItem(companyProfileStorageKey, JSON.stringify(profile));
  window.dispatchEvent(new Event(companyProfileUpdatedEvent));
}
