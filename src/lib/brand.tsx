import React, { createContext, useContext, useState, useEffect } from "react";

export interface FontPackage {
  id: string;
  name: string;
  displayFont: string;
  bodyFont: string;
  importUrl: string;
}

export interface BrandKit {
  id: string;
  name: string;
  desc: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontPackageId: string;
}

export const FONT_PACKAGES: FontPackage[] = [
  {
    id: "editorial-classic",
    name: "Editorial Classic",
    displayFont: "Playfair Display",
    bodyFont: "Inter",
    importUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap"
  },
  {
    id: "contemporary-prose",
    name: "Contemporary Prose",
    displayFont: "Lora",
    bodyFont: "Plus Jakarta Sans",
    importUrl: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
  },
  {
    id: "scholarly-inkwell",
    name: "Scholarly Inkwell",
    displayFont: "Cormorant Garamond",
    bodyFont: "Spectral",
    importUrl: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,400&family=Spectral:ital,wght@0,400;0,500;1,400&display=swap"
  },
  {
    id: "swiss-elegant",
    name: "Swiss Elegant",
    displayFont: "Outfit",
    bodyFont: "DM Sans",
    importUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&family=DM+Sans:wght@400;500;700&display=swap"
  },
  {
    id: "modern-author",
    name: "Modern Artistry",
    displayFont: "Cinzel",
    bodyFont: "Inter",
    importUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@300;400;500;600&display=swap"
  },
  {
    id: "classic-novelist",
    name: "Classic Novelist",
    displayFont: "Merriweather",
    bodyFont: "EB Garamond",
    importUrl: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap"
  }
];

export const BRAND_PRESETS: BrandKit[] = [
  {
    id: "cozy-terracotta",
    name: "Cozy Terracotta (Default)",
    desc: "Warm clay tones with premium literary cream backgrounds.",
    primaryColor: "#7c3a2a",
    secondaryColor: "#BA7517",
    backgroundColor: "#F5F0EA",
    textColor: "#3a1c14",
    fontPackageId: "editorial-classic"
  },
  {
    id: "forest-reverie",
    name: "Forest Reverie",
    desc: "Deep academic pine with calming moss accents and organic tones.",
    primaryColor: "#1B3B2B",
    secondaryColor: "#638D73",
    backgroundColor: "#F4F6F4",
    textColor: "#0F1D15",
    fontPackageId: "scholarly-inkwell"
  },
  {
    id: "sleek-ink",
    name: "Midnight Modernist",
    desc: "Sleek dark obsidian branding on a crisp modern light canvas.",
    primaryColor: "#18181B",
    secondaryColor: "#71717A",
    backgroundColor: "#FAFAFA",
    textColor: "#09090B",
    fontPackageId: "swiss-elegant"
  },
  {
    id: "editorial-blush",
    name: "Editorial Blush",
    desc: "Plum burgundy highlights paired with delicate pink tea undertones.",
    primaryColor: "#5A2C35",
    secondaryColor: "#C97D84",
    backgroundColor: "#FDFBFB",
    textColor: "#261014",
    fontPackageId: "contemporary-prose"
  },
  {
    id: "royal-velvet",
    name: "Imperial Gilt",
    desc: "Luxurious royal plum matched with brilliant marigold details.",
    primaryColor: "#4A154B",
    secondaryColor: "#ECB22E",
    backgroundColor: "#FAF5FF",
    textColor: "#1E0025",
    fontPackageId: "modern-author"
  },
  {
    id: "ocean-breeze",
    name: "Ocean Serenade",
    desc: "Clean maritime navy blue paired with refreshing sea glass cyan.",
    primaryColor: "#1E3A5F",
    secondaryColor: "#4A90E2",
    backgroundColor: "#F0F4F8",
    textColor: "#0D1B2A",
    fontPackageId: "swiss-elegant"
  }
];

export interface BrandContextType {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontPackageId: string;
  customHeadingFont: string;
  customBodyFont: string;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setTextColor: (color: string) => void;
  setFontPackageId: (id: string) => void;
  setCustomHeadingFont: (font: string) => void;
  setCustomBodyFont: (font: string) => void;
  applyPreset: (preset: BrandKit) => void;
  resetToDefault: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem("brand_primary") || "#7c3a2a");
  const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem("brand_secondary") || "#BA7517");
  const [backgroundColor, setBackgroundColor] = useState(() => localStorage.getItem("brand_bg") || "#F5F0EA");
  const [textColor, setTextColor] = useState(() => localStorage.getItem("brand_text") || "#3a1c14");
  const [fontPackageId, setFontPackageId] = useState(() => localStorage.getItem("brand_font_pkg") || "editorial-classic");
  const [customHeadingFont, setCustomHeadingFont] = useState(() => localStorage.getItem("brand_heading_font") || "");
  const [customBodyFont, setCustomBodyFont] = useState(() => localStorage.getItem("brand_body_font") || "");

  const applyPreset = (preset: BrandKit) => {
    setPrimaryColor(preset.primaryColor);
    setSecondaryColor(preset.secondaryColor);
    setBackgroundColor(preset.backgroundColor);
    setTextColor(preset.textColor);
    setFontPackageId(preset.fontPackageId);
    setCustomHeadingFont("");
    setCustomBodyFont("");
  };

  const resetToDefault = () => {
    applyPreset(BRAND_PRESETS[0]);
  };

  useEffect(() => {
    localStorage.setItem("brand_primary", primaryColor);
    localStorage.setItem("brand_secondary", secondaryColor);
    localStorage.setItem("brand_bg", backgroundColor);
    localStorage.setItem("brand_text", textColor);
    localStorage.setItem("brand_font_pkg", fontPackageId);
    localStorage.setItem("brand_heading_font", customHeadingFont);
    localStorage.setItem("brand_body_font", customBodyFont);
  }, [primaryColor, secondaryColor, backgroundColor, textColor, fontPackageId, customHeadingFont, customBodyFont]);

  // Inject Custom styles to head dynamically to override classes across ALL screens consistently
  useEffect(() => {
    // 1. Dynamic Font Link Loading
    const headingFontName = customHeadingFont || FONT_PACKAGES.find(p => p.id === fontPackageId)?.displayFont || "Playfair Display";
    const bodyFontName = customBodyFont || FONT_PACKAGES.find(p => p.id === fontPackageId)?.bodyFont || "Inter";

    const fetchFontsLink = () => {
      const activePkg = FONT_PACKAGES.find(p => p.id === fontPackageId);
      if (!customHeadingFont && !customBodyFont && activePkg) {
        return activePkg.importUrl;
      }
      // Encode individual font components
      const headingEncoded = encodeURIComponent(headingFontName + ":ital,wght@0,300;0,400;0,500;0,600;0,700;1,400");
      const bodyEncoded = encodeURIComponent(bodyFontName + ":ital,wght@0,300;0,400;0,500;0,600;0,700;1,400");
      return `https://fonts.googleapis.com/css2?family=${headingEncoded}&family=${bodyEncoded}&display=swap`;
    };

    const linkId = "scriptally-dynamic-google-fonts";
    let isAdded = document.getElementById(linkId) as HTMLLinkElement;
    if (!isAdded) {
      isAdded = document.createElement("link");
      isAdded.id = linkId;
      isAdded.rel = "stylesheet";
      document.head.appendChild(isAdded);
    }
    isAdded.href = fetchFontsLink();

    // 2. Dynamic Style Tag Generation
    const hexToRgb = (hex: string): string => {
      const cleanHex = hex.replace("#", "");
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `${isNaN(r) ? 124 : r}, ${isNaN(g) ? 58 : g}, ${isNaN(b) ? 42 : b}`;
    };

    const primaryRgb = hexToRgb(primaryColor);
    const secondaryRgb = hexToRgb(secondaryColor);
    const backgroundRgb = hexToRgb(backgroundColor);
    const textRgb = hexToRgb(textColor);

    const styleId = "scriptally-brand-style-overrides";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      :root {
        --color-custom-primary: ${primaryColor} !important;
        --color-custom-secondary: ${secondaryColor} !important;
        --color-custom-background: ${backgroundColor} !important;
        --color-custom-dark-text: ${textColor} !important;
        
        --color-primary-rgb: ${primaryRgb};
        --color-secondary-rgb: ${secondaryRgb};
        --color-bg-rgb: ${backgroundRgb};
        --color-text-rgb: ${textRgb};
      }

      /* 1. Font Family Overrides */
      .font-serif, h1, h2, h3, .font-serif-header {
        font-family: "${headingFontName}", Garamond, Georgia, serif !important;
      }
      .font-sans, p, span, div, button, input, select, textarea, label {
        font-family: "${bodyFontName}", system-ui, -apple-system, sans-serif;
      }

      /* 2. Global Selection Background */
      ::selection {
        background-color: rgba(${primaryRgb}, 0.2) !important;
        color: ${textColor} !important;
      }

      /* 3. Comprehensive Color Overrides of Tailwind literal Hex classes across all elements */
      
      /* Primary Class Overrides (#7c3a2a) */
      .bg-\\[\\#7c3a2a\\] {
        background-color: var(--color-custom-primary) !important;
      }
      .hover\\:bg-\\[\\#7c3a2a\\]\\/95:hover {
        background-color: rgba(${primaryRgb}, 0.95) !important;
      }
      .text-\\[\\#7c3a2a\\] {
        color: var(--color-custom-primary) !important;
      }
      .border-\\[\\#7c3a2a\\] {
        border-color: var(--color-custom-primary) !important;
      }
      
      /* Alpha variants */
      .bg-\\[\\#7c3a2a\\]\\/10 {
        background-color: rgba(${primaryRgb}, 0.1) !important;
      }
      .bg-\\[\\#7c3a2a\\]\\/5 {
        background-color: rgba(${primaryRgb}, 0.05) !important;
      }
      .hover\\:bg-\\[\\#7c3a2a\\]\\/10:hover {
        background-color: rgba(${primaryRgb}, 0.1) !important;
      }
      .hover\\:bg-\\[\\#7c3a2a\\]\\/5:hover {
        background-color: rgba(${primaryRgb}, 0.05) !important;
      }
      .hover\\:text-\\[\\#7c3a2a\\]:hover {
        color: var(--color-custom-primary) !important;
      }
      .border-\\[\\#7c3a2a\\]\\/10 {
        border-color: rgba(${primaryRgb}, 0.1) !important;
      }
      .border-\\[\\#7c3a2a\\]\\/15 {
        border-color: rgba(${primaryRgb}, 0.15) !important;
      }
      .border-\\[\\#7c3a2a\\]\\/20 {
        border-color: rgba(${primaryRgb}, 0.2) !important;
      }

      /* Dark Coffee Text Overrides (#3a1c14) */
      .text-\\[\\#3a1c14\\] {
        color: var(--color-custom-dark-text) !important;
      }
      .bg-\\[\\#3a1c14\\] {
        background-color: var(--color-custom-dark-text) !important;
      }
      .border-\\[\\#3a1c14\\] {
        border-color: var(--color-custom-dark-text) !important;
      }
      .text-\\[\\#3a1c14\\]\\/70 {
        color: rgba(${textRgb}, 0.7) !important;
      }
      .text-\\[\\#3a1c14\\]\\/60 {
        color: rgba(${textRgb}, 0.6) !important;
      }
      .text-\\[\\#3a1c14\\]\\/65 {
        color: rgba(${textRgb}, 0.65) !important;
      }
      .text-\\[\\#3a1c14\\]\\/40 {
        color: rgba(${textRgb}, 0.4) !important;
      }
      .bg-\\[\\#3a1c14\\]\\/5 {
        background-color: rgba(${textRgb}, 0.05) !important;
      }
      .bg-\\[\\#3a1c14\\]\\/10 {
        background-color: rgba(${textRgb}, 0.1) !important;
      }

      /* Warm Background Overrides (#F5F0EA and #F8F5F0) */
      .bg-\\[\\#F5F0EA\\] {
        background-color: var(--color-custom-background) !important;
      }
      .bg-\\[\\#F8F5F0\\] {
        /* Soft lightness adjustment for section containers on top of parent background */
        background-color: ${backgroundColor === "#FAFAFA" ? "#FFFFFF" : `rgba(${primaryRgb}, 0.04)`} !important;
      }
      .bg-\\[\\#F8F5F0\\]\\/60 {
        background-color: rgba(${primaryRgb}, 0.02) !important;
      }
      .border-\\[\\#EBDCD3\\] {
        border-color: rgba(${primaryRgb}, 0.15) !important;
      }
      .border-\\[\\#FAF1EF\\] {
        border-color: rgba(${primaryRgb}, 0.08) !important;
      }
      .bg-\\[\\#FAF1EF\\] {
        background-color: rgba(${primaryRgb}, 0.05) !important;
      }
      .bg-\\[\\#FAF1EF\\]\\/40 {
        background-color: rgba(${primaryRgb}, 0.02) !important;
      }

      /* Secondary Highlighter Overrides (#BA7517) */
      .text-\\[\\#BA7517\\] {
        color: var(--color-custom-secondary) !important;
      }
      .bg-\\[\\#BA7517\\] {
        background-color: var(--color-custom-secondary) !important;
      }
      .bg-\\[\\#BA7517\\]\\/15 {
        background-color: rgba(${secondaryRgb}, 0.15) !important;
      }
      .border-\\[\\#BA7517\\]\\/20 {
        border-color: rgba(${secondaryRgb}, 0.2) !important;
      }
      .from-\\[\\#BA7517\\] {
        --tw-gradient-from: var(--color-custom-secondary) !important;
      }
    `;

  }, [primaryColor, secondaryColor, backgroundColor, textColor, fontPackageId, customHeadingFont, customBodyFont]);

  return (
    <BrandContext.Provider
      value={{
        primaryColor,
        secondaryColor,
        backgroundColor,
        textColor,
        fontPackageId,
        customHeadingFont,
        customBodyFont,
        setPrimaryColor,
        setSecondaryColor,
        setBackgroundColor,
        setTextColor,
        setFontPackageId,
        setCustomHeadingFont,
        setCustomBodyFont,
        applyPreset,
        resetToDefault
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
};
