import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

// ============================================
// CORE INTERFACES
// ============================================

export interface IVideoTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  industry: IndustryType;
  thumbnail?: string;
  design: IDesignConfig;
  sceneTemplates: ISceneTemplate[];
  voiceDefaults: IVoiceDefaults;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDesignConfig {
  theme: IThemeConfig;
  typography: ITypographyConfig;
  layout: ILayoutConfig;
  animations: IAnimationConfig;
  overlays: IOverlayConfig;
}

export interface IThemeConfig {
  name: string;
  colorScheme: 'dark' | 'light' | 'mixed';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    accentSecondary: string;
    background: string;
    backgroundSecondary: string;
    surface: string;
    text: string;
    textMuted: string;
    textDim: string;
    success: string;
    warning: string;
    error: string;
  };
  gradients: {
    primary: string;
    accent: string;
    overlay: string;
  };
}

export interface ITypographyConfig {
  headlineFont: string;
  bodyFont: string;
  accentFont: string;
  fontUrls: string[];
  scale: {
    heroTitle: string;
    sectionTitle: string;
    subtitle: string;
    body: string;
    caption: string;
    tag: string;
  };
}

export interface ILayoutConfig {
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  safeZone: number;
  contentMaxWidth: string;
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface IAnimationConfig {
  entranceStyle: 'fade' | 'slide' | 'scale' | 'reveal' | 'typewriter';
  exitStyle: 'fade' | 'slide' | 'scale';
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: string;
  staggerDelay: string;
  kenBurns: boolean;
  particleEffects: boolean;
}

export interface IOverlayConfig {
  vignette: boolean;
  filmGrain: boolean;
  colorGrade: 'warm' | 'cool' | 'neutral' | 'cinematic';
  gradientOverlay: boolean;
  scanLines: boolean;
}

export interface ISceneTemplate {
  type: SceneType;
  name: string;
  layout: SceneLayout;
  components: ISceneComponent[];
  backgroundType: 'video' | 'image' | 'gradient' | 'solid';
  backgroundKeywords?: string[];
  duration: number;
}

export interface ISceneComponent {
  type: ComponentType;
  position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  animationDelay?: number;
  customStyles?: Record<string, string>;
}

export interface IVoiceDefaults {
  languageCode: string;
  voiceId: string;
  voiceName: string;
  preset: 'training' | 'narration' | 'conversational' | 'dramatic';
}

// ============================================
// ENUMS & TYPES
// ============================================

export type TemplateCategory = 
  | 'compliance'
  | 'onboarding'
  | 'safety'
  | 'skills'
  | 'leadership'
  | 'product'
  | 'general';

export type IndustryType =
  | 'corporate'
  | 'healthcare'
  | 'manufacturing'
  | 'technology'
  | 'finance'
  | 'retail'
  | 'education'
  | 'hospitality'
  | 'government'
  | 'generic';

export type SceneType =
  | 'title'
  | 'chapter'
  | 'content'
  | 'statistics'
  | 'split'
  | 'list'
  | 'quote'
  | 'scenario'
  | 'action'
  | 'summary'
  | 'closing';

export type SceneLayout =
  | 'full-center'
  | 'full-bottom'
  | 'split-left'
  | 'split-right'
  | 'grid-2x2'
  | 'thirds'
  | 'lower-third';

export type ComponentType =
  | 'title'
  | 'subtitle'
  | 'paragraph'
  | 'bullet-list'
  | 'numbered-list'
  | 'icon-list'
  | 'stat-number'
  | 'stat-grid'
  | 'quote-block'
  | 'scenario-card'
  | 'action-card'
  | 'timeline'
  | 'chapter-tag'
  | 'lower-third'
  | 'logo'
  | 'contact-card';

// ============================================
// PRESET THEMES
// ============================================

const THEME_PRESETS: Record<string, IThemeConfig> = {
  'corporate-dark': {
    name: 'Corporate Dark',
    colorScheme: 'dark',
    colors: {
      primary: '#0a0a0c',
      secondary: '#121215',
      accent: '#e63946',
      accentSecondary: '#f4a261',
      background: '#000000',
      backgroundSecondary: '#0a0a0c',
      surface: '#1a1a1f',
      text: '#fafafa',
      textMuted: '#8a8a95',
      textDim: '#5a5a65',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #e63946 0%, #f4a261 100%)',
      accent: 'linear-gradient(135deg, #1d3557 0%, #457b9d 100%)',
      overlay: 'linear-gradient(180deg, rgba(10,10,12,0.3) 0%, rgba(10,10,12,0.95) 100%)'
    }
  },
  'corporate-light': {
    name: 'Corporate Light',
    colorScheme: 'light',
    colors: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      accent: '#2563eb',
      accentSecondary: '#7c3aed',
      background: '#ffffff',
      backgroundSecondary: '#f3f4f6',
      surface: '#ffffff',
      text: '#111827',
      textMuted: '#6b7280',
      textDim: '#9ca3af',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
      accent: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      overlay: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.95) 100%)'
    }
  },
  'healthcare-trust': {
    name: 'Healthcare Trust',
    colorScheme: 'light',
    colors: {
      primary: '#f0fdfa',
      secondary: '#ffffff',
      accent: '#0d9488',
      accentSecondary: '#06b6d4',
      background: '#ffffff',
      backgroundSecondary: '#f0fdfa',
      surface: '#ffffff',
      text: '#134e4a',
      textMuted: '#5eead4',
      textDim: '#99f6e4',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
      accent: 'linear-gradient(135deg, #ccfbf1 0%, #cffafe 100%)',
      overlay: 'linear-gradient(180deg, rgba(240,253,250,0.1) 0%, rgba(240,253,250,0.95) 100%)'
    }
  },
  'safety-alert': {
    name: 'Safety Alert',
    colorScheme: 'dark',
    colors: {
      primary: '#18181b',
      secondary: '#27272a',
      accent: '#f59e0b',
      accentSecondary: '#ef4444',
      background: '#09090b',
      backgroundSecondary: '#18181b',
      surface: '#27272a',
      text: '#fafafa',
      textMuted: '#a1a1aa',
      textDim: '#71717a',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      accent: 'linear-gradient(135deg, #292524 0%, #44403c 100%)',
      overlay: 'linear-gradient(180deg, rgba(24,24,27,0.3) 0%, rgba(24,24,27,0.95) 100%)'
    }
  },
  'tech-modern': {
    name: 'Tech Modern',
    colorScheme: 'dark',
    colors: {
      primary: '#030712',
      secondary: '#111827',
      accent: '#8b5cf6',
      accentSecondary: '#ec4899',
      background: '#030712',
      backgroundSecondary: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      textDim: '#6b7280',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      accent: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      overlay: 'linear-gradient(180deg, rgba(3,7,18,0.3) 0%, rgba(3,7,18,0.95) 100%)'
    }
  },
  'finance-premium': {
    name: 'Finance Premium',
    colorScheme: 'dark',
    colors: {
      primary: '#0c0a09',
      secondary: '#1c1917',
      accent: '#d4af37',
      accentSecondary: '#b8860b',
      background: '#0c0a09',
      backgroundSecondary: '#1c1917',
      surface: '#292524',
      text: '#fafaf9',
      textMuted: '#a8a29e',
      textDim: '#78716c',
      success: '#22c55e',
      warning: '#eab308',
      error: '#dc2626'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
      accent: 'linear-gradient(135deg, #292524 0%, #44403c 100%)',
      overlay: 'linear-gradient(180deg, rgba(12,10,9,0.3) 0%, rgba(12,10,9,0.95) 100%)'
    }
  }
};

// ============================================
// TYPOGRAPHY PRESETS
// ============================================

const TYPOGRAPHY_PRESETS: Record<string, ITypographyConfig> = {
  'cinematic': {
    headlineFont: "'Instrument Serif', serif",
    bodyFont: "'Outfit', sans-serif",
    accentFont: "'Space Mono', monospace",
    fontUrls: [
      'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@100..900&family=Space+Mono:wght@400;700&display=swap'
    ],
    scale: {
      heroTitle: 'clamp(48px, 10vw, 140px)',
      sectionTitle: 'clamp(36px, 6vw, 80px)',
      subtitle: 'clamp(16px, 2vw, 24px)',
      body: 'clamp(14px, 1.5vw, 18px)',
      caption: 'clamp(11px, 1vw, 14px)',
      tag: 'clamp(11px, 1.2vw, 14px)'
    }
  },
  'modern': {
    headlineFont: "'Plus Jakarta Sans', sans-serif",
    bodyFont: "'Inter', sans-serif",
    accentFont: "'JetBrains Mono', monospace",
    fontUrls: [
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
    ],
    scale: {
      heroTitle: 'clamp(40px, 8vw, 100px)',
      sectionTitle: 'clamp(32px, 5vw, 64px)',
      subtitle: 'clamp(16px, 1.8vw, 22px)',
      body: 'clamp(14px, 1.4vw, 17px)',
      caption: 'clamp(11px, 1vw, 13px)',
      tag: 'clamp(10px, 1vw, 12px)'
    }
  },
  'editorial': {
    headlineFont: "'Playfair Display', serif",
    bodyFont: "'Source Sans 3', sans-serif",
    accentFont: "'IBM Plex Mono', monospace",
    fontUrls: [
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'
    ],
    scale: {
      heroTitle: 'clamp(44px, 9vw, 120px)',
      sectionTitle: 'clamp(34px, 5.5vw, 72px)',
      subtitle: 'clamp(16px, 1.9vw, 24px)',
      body: 'clamp(15px, 1.5vw, 18px)',
      caption: 'clamp(12px, 1vw, 14px)',
      tag: 'clamp(11px, 1.1vw, 13px)'
    }
  },
  'bold': {
    headlineFont: "'Bebas Neue', sans-serif",
    bodyFont: "'Roboto', sans-serif",
    accentFont: "'Roboto Mono', monospace",
    fontUrls: [
      'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap'
    ],
    scale: {
      heroTitle: 'clamp(52px, 12vw, 160px)',
      sectionTitle: 'clamp(40px, 7vw, 90px)',
      subtitle: 'clamp(16px, 2vw, 24px)',
      body: 'clamp(14px, 1.4vw, 17px)',
      caption: 'clamp(11px, 1vw, 13px)',
      tag: 'clamp(12px, 1.2vw, 15px)'
    }
  }
};

// ============================================
// INDUSTRY TEMPLATE PRESETS
// ============================================

const INDUSTRY_TEMPLATES: Record<IndustryType, Partial<IVideoTemplate>> = {
  corporate: {
    design: {
      theme: THEME_PRESETS['corporate-dark'],
      typography: TYPOGRAPHY_PRESETS['cinematic'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 8,
        contentMaxWidth: '1200px',
        spacing: { xs: '8px', sm: '16px', md: '24px', lg: '40px', xl: '64px' }
      },
      animations: {
        entranceStyle: 'slide',
        exitStyle: 'fade',
        duration: { fast: '0.3s', normal: '0.6s', slow: '1s' },
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        staggerDelay: '0.1s',
        kenBurns: true,
        particleEffects: true
      },
      overlays: {
        vignette: true,
        filmGrain: true,
        colorGrade: 'cinematic',
        gradientOverlay: true,
        scanLines: false
      }
    }
  },
  healthcare: {
    design: {
      theme: THEME_PRESETS['healthcare-trust'],
      typography: TYPOGRAPHY_PRESETS['modern'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 10,
        contentMaxWidth: '1100px',
        spacing: { xs: '8px', sm: '16px', md: '24px', lg: '36px', xl: '56px' }
      },
      animations: {
        entranceStyle: 'fade',
        exitStyle: 'fade',
        duration: { fast: '0.25s', normal: '0.5s', slow: '0.8s' },
        easing: 'ease-out',
        staggerDelay: '0.08s',
        kenBurns: false,
        particleEffects: false
      },
      overlays: {
        vignette: false,
        filmGrain: false,
        colorGrade: 'neutral',
        gradientOverlay: true,
        scanLines: false
      }
    }
  },
  manufacturing: {
    design: {
      theme: THEME_PRESETS['safety-alert'],
      typography: TYPOGRAPHY_PRESETS['bold'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 6,
        contentMaxWidth: '1300px',
        spacing: { xs: '8px', sm: '16px', md: '28px', lg: '44px', xl: '72px' }
      },
      animations: {
        entranceStyle: 'reveal',
        exitStyle: 'fade',
        duration: { fast: '0.2s', normal: '0.4s', slow: '0.7s' },
        easing: 'ease-in-out',
        staggerDelay: '0.12s',
        kenBurns: true,
        particleEffects: false
      },
      overlays: {
        vignette: true,
        filmGrain: false,
        colorGrade: 'warm',
        gradientOverlay: true,
        scanLines: true
      }
    }
  },
  technology: {
    design: {
      theme: THEME_PRESETS['tech-modern'],
      typography: TYPOGRAPHY_PRESETS['modern'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 8,
        contentMaxWidth: '1200px',
        spacing: { xs: '8px', sm: '16px', md: '24px', lg: '40px', xl: '64px' }
      },
      animations: {
        entranceStyle: 'scale',
        exitStyle: 'fade',
        duration: { fast: '0.2s', normal: '0.5s', slow: '0.9s' },
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        staggerDelay: '0.08s',
        kenBurns: true,
        particleEffects: true
      },
      overlays: {
        vignette: true,
        filmGrain: true,
        colorGrade: 'cool',
        gradientOverlay: true,
        scanLines: true
      }
    }
  },
  finance: {
    design: {
      theme: THEME_PRESETS['finance-premium'],
      typography: TYPOGRAPHY_PRESETS['editorial'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 10,
        contentMaxWidth: '1100px',
        spacing: { xs: '10px', sm: '18px', md: '28px', lg: '44px', xl: '68px' }
      },
      animations: {
        entranceStyle: 'fade',
        exitStyle: 'fade',
        duration: { fast: '0.3s', normal: '0.6s', slow: '1s' },
        easing: 'ease',
        staggerDelay: '0.15s',
        kenBurns: true,
        particleEffects: false
      },
      overlays: {
        vignette: true,
        filmGrain: true,
        colorGrade: 'warm',
        gradientOverlay: true,
        scanLines: false
      }
    }
  },
  retail: {
    design: {
      theme: THEME_PRESETS['corporate-light'],
      typography: TYPOGRAPHY_PRESETS['modern'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 8,
        contentMaxWidth: '1200px',
        spacing: { xs: '8px', sm: '14px', md: '22px', lg: '36px', xl: '56px' }
      },
      animations: {
        entranceStyle: 'slide',
        exitStyle: 'slide',
        duration: { fast: '0.25s', normal: '0.45s', slow: '0.75s' },
        easing: 'ease-out',
        staggerDelay: '0.1s',
        kenBurns: false,
        particleEffects: false
      },
      overlays: {
        vignette: false,
        filmGrain: false,
        colorGrade: 'neutral',
        gradientOverlay: true,
        scanLines: false
      }
    }
  },
  education: {
    design: {
      theme: THEME_PRESETS['corporate-light'],
      typography: TYPOGRAPHY_PRESETS['editorial'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 8,
        contentMaxWidth: '1100px',
        spacing: { xs: '8px', sm: '16px', md: '24px', lg: '38px', xl: '60px' }
      },
      animations: {
        entranceStyle: 'fade',
        exitStyle: 'fade',
        duration: { fast: '0.3s', normal: '0.55s', slow: '0.85s' },
        easing: 'ease-in-out',
        staggerDelay: '0.12s',
        kenBurns: true,
        particleEffects: false
      },
      overlays: {
        vignette: false,
        filmGrain: false,
        colorGrade: 'neutral',
        gradientOverlay: true,
        scanLines: false
      }
    }
  },
  hospitality: {
    design: {
      theme: THEME_PRESETS['corporate-dark'],
      typography: TYPOGRAPHY_PRESETS['editorial'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 8,
        contentMaxWidth: '1150px',
        spacing: { xs: '8px', sm: '16px', md: '26px', lg: '42px', xl: '66px' }
      },
      animations: {
        entranceStyle: 'fade',
        exitStyle: 'fade',
        duration: { fast: '0.35s', normal: '0.65s', slow: '1s' },
        easing: 'ease',
        staggerDelay: '0.14s',
        kenBurns: true,
        particleEffects: true
      },
      overlays: {
        vignette: true,
        filmGrain: true,
        colorGrade: 'warm',
        gradientOverlay: true,
        scanLines: false
      }
    }
  },
  government: {
    design: {
      theme: THEME_PRESETS['corporate-light'],
      typography: TYPOGRAPHY_PRESETS['modern'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 10,
        contentMaxWidth: '1050px',
        spacing: { xs: '8px', sm: '16px', md: '24px', lg: '36px', xl: '54px' }
      },
      animations: {
        entranceStyle: 'fade',
        exitStyle: 'fade',
        duration: { fast: '0.3s', normal: '0.5s', slow: '0.8s' },
        easing: 'ease-out',
        staggerDelay: '0.1s',
        kenBurns: false,
        particleEffects: false
      },
      overlays: {
        vignette: false,
        filmGrain: false,
        colorGrade: 'neutral',
        gradientOverlay: true,
        scanLines: false
      }
    }
  },
  generic: {
    design: {
      theme: THEME_PRESETS['corporate-dark'],
      typography: TYPOGRAPHY_PRESETS['cinematic'],
      layout: {
        aspectRatio: '16:9',
        safeZone: 8,
        contentMaxWidth: '1200px',
        spacing: { xs: '8px', sm: '16px', md: '24px', lg: '40px', xl: '64px' }
      },
      animations: {
        entranceStyle: 'slide',
        exitStyle: 'fade',
        duration: { fast: '0.3s', normal: '0.6s', slow: '1s' },
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        staggerDelay: '0.1s',
        kenBurns: true,
        particleEffects: true
      },
      overlays: {
        vignette: true,
        filmGrain: true,
        colorGrade: 'cinematic',
        gradientOverlay: true,
        scanLines: false
      }
    }
  }
};

// ============================================
// COMPLIANCE SCENE TEMPLATES
// ============================================

const COMPLIANCE_SCENE_TEMPLATES: ISceneTemplate[] = [
  {
    type: 'title',
    name: 'Opening Title',
    layout: 'full-center',
    components: [
      { type: 'chapter-tag', position: 'center', animationDelay: 0.3 },
      { type: 'title', position: 'center', animationDelay: 0.5 },
      { type: 'subtitle', position: 'center', animationDelay: 0.7 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['office', 'corporate', 'professional'],
    duration: 20
  },
  {
    type: 'chapter',
    name: 'Chapter Introduction',
    layout: 'full-bottom',
    components: [
      { type: 'chapter-tag', position: 'bottom-left', animationDelay: 0.3 },
      { type: 'title', position: 'bottom-left', animationDelay: 0.4 },
      { type: 'subtitle', position: 'bottom-left', animationDelay: 0.6 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['teamwork', 'meeting'],
    duration: 20
  },
  {
    type: 'statistics',
    name: 'Statistics Display',
    layout: 'full-center',
    components: [
      { type: 'chapter-tag', position: 'center', animationDelay: 0.3 },
      { type: 'stat-number', position: 'center', animationDelay: 0.4 },
      { type: 'subtitle', position: 'center', animationDelay: 0.8 },
      { type: 'stat-grid', position: 'center', animationDelay: 1.2 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['data', 'technology', 'abstract'],
    duration: 20
  },
  {
    type: 'split',
    name: 'Split Content',
    layout: 'split-right',
    components: [
      { type: 'chapter-tag', position: 'top-left', animationDelay: 0.3 },
      { type: 'title', position: 'center', animationDelay: 0.4 },
      { type: 'subtitle', position: 'center', animationDelay: 0.6 },
      { type: 'quote-block', position: 'center', animationDelay: 0.9 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['professional', 'business'],
    duration: 20
  },
  {
    type: 'list',
    name: 'Icon List',
    layout: 'split-left',
    components: [
      { type: 'chapter-tag', position: 'top-left', animationDelay: 0.3 },
      { type: 'title', position: 'top-left', animationDelay: 0.4 },
      { type: 'icon-list', position: 'center', animationDelay: 0.6 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['workplace', 'team'],
    duration: 20
  },
  {
    type: 'scenario',
    name: 'Case Study',
    layout: 'full-center',
    components: [
      { type: 'chapter-tag', position: 'center', animationDelay: 0.3 },
      { type: 'title', position: 'center', animationDelay: 0.4 },
      { type: 'scenario-card', position: 'center', animationDelay: 0.6 },
      { type: 'quote-block', position: 'center', animationDelay: 1.0 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['office', 'conversation'],
    duration: 20
  },
  {
    type: 'action',
    name: 'Action Steps',
    layout: 'full-center',
    components: [
      { type: 'chapter-tag', position: 'center', animationDelay: 0.3 },
      { type: 'title', position: 'center', animationDelay: 0.4 },
      { type: 'subtitle', position: 'center', animationDelay: 0.6 },
      { type: 'action-card', position: 'center', animationDelay: 0.8 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['teamwork', 'support'],
    duration: 20
  },
  {
    type: 'content',
    name: 'Content with Lower Third',
    layout: 'lower-third',
    components: [
      { type: 'chapter-tag', position: 'bottom-left', animationDelay: 0.3 },
      { type: 'title', position: 'bottom-left', animationDelay: 0.4 },
      { type: 'lower-third', position: 'bottom-left', animationDelay: 1.0 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['professional', 'business'],
    duration: 20
  },
  {
    type: 'closing',
    name: 'Closing',
    layout: 'full-center',
    components: [
      { type: 'chapter-tag', position: 'center', animationDelay: 0.3 },
      { type: 'title', position: 'center', animationDelay: 0.5 },
      { type: 'subtitle', position: 'center', animationDelay: 0.7 },
      { type: 'contact-card', position: 'center', animationDelay: 1.0 }
    ],
    backgroundType: 'video',
    backgroundKeywords: ['success', 'teamwork', 'positive'],
    duration: 20
  }
];

// ============================================
// SERVICE
// ============================================

@Injectable({
  providedIn: 'root'
})
export class VideoTemplateService {

  private templates$ = new BehaviorSubject<IVideoTemplate[]>([]);
  private activeTemplate$ = new BehaviorSubject<IVideoTemplate | null>(null);

  constructor() {
    this.initializeDefaultTemplates();
  }

  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================

  getTemplates(): Observable<IVideoTemplate[]> {
    return this.templates$.asObservable();
  }

  getTemplatesByCategory(category: TemplateCategory): Observable<IVideoTemplate[]> {
    return this.templates$.pipe(
      map(templates => templates.filter(t => t.category === category))
    );
  }

  getTemplatesByIndustry(industry: IndustryType): Observable<IVideoTemplate[]> {
    return this.templates$.pipe(
      map(templates => templates.filter(t => t.industry === industry))
    );
  }

  getTemplateById(id: string): Observable<IVideoTemplate | undefined> {
    return this.templates$.pipe(
      map(templates => templates.find(t => t.id === id))
    );
  }

  getActiveTemplate(): Observable<IVideoTemplate | null> {
    return this.activeTemplate$.asObservable();
  }

  setActiveTemplate(template: IVideoTemplate): void {
    this.activeTemplate$.next(template);
  }

  createTemplate(template: Omit<IVideoTemplate, 'id' | 'createdAt' | 'updatedAt'>): IVideoTemplate {
    const newTemplate: IVideoTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const current = this.templates$.getValue();
    this.templates$.next([...current, newTemplate]);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<IVideoTemplate>): void {
    const current = this.templates$.getValue();
    const index = current.findIndex(t => t.id === id);
    
    if (index !== -1) {
      current[index] = {
        ...current[index],
        ...updates,
        updatedAt: new Date()
      };
      this.templates$.next([...current]);
    }
  }

  deleteTemplate(id: string): void {
    const current = this.templates$.getValue();
    this.templates$.next(current.filter(t => t.id !== id));
  }

  // ============================================
  // PRESET ACCESS
  // ============================================

  getThemePresets(): Record<string, IThemeConfig> {
    return THEME_PRESETS;
  }

  getTypographyPresets(): Record<string, ITypographyConfig> {
    return TYPOGRAPHY_PRESETS;
  }

  getIndustryPresets(): Record<IndustryType, Partial<IVideoTemplate>> {
    return INDUSTRY_TEMPLATES;
  }

  getComplianceSceneTemplates(): ISceneTemplate[] {
    return COMPLIANCE_SCENE_TEMPLATES;
  }

  getAvailableIndustries(): IndustryType[] {
    return Object.keys(INDUSTRY_TEMPLATES) as IndustryType[];
  }

  getAvailableCategories(): TemplateCategory[] {
    return ['compliance', 'onboarding', 'safety', 'skills', 'leadership', 'product', 'general'];
  }

  // ============================================
  // TEMPLATE GENERATION
  // ============================================

  generateTemplate(
    name: string,
    industry: IndustryType,
    category: TemplateCategory,
    customizations?: Partial<IDesignConfig>
  ): IVideoTemplate {
    const industryPreset = INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES.generic;
    
    const template: IVideoTemplate = {
      id: this.generateId(),
      name,
      description: `${category} training template for ${industry} industry`,
      category,
      industry,
      design: {
        ...industryPreset.design!,
        ...customizations
      },
      sceneTemplates: COMPLIANCE_SCENE_TEMPLATES,
      voiceDefaults: {
        languageCode: 'en-US',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        voiceName: 'Sarah',
        preset: 'training'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return template;
  }

  applyBrandCustomization(
    template: IVideoTemplate,
    brandColors: Partial<IThemeConfig['colors']>,
    logo?: string
  ): IVideoTemplate {
    return {
      ...template,
      design: {
        ...template.design,
        theme: {
          ...template.design.theme,
          colors: {
            ...template.design.theme.colors,
            ...brandColors
          }
        }
      },
      updatedAt: new Date()
    };
  }

  // ============================================
  // CSS GENERATION
  // ============================================

  generateCSSVariables(template: IVideoTemplate): string {
    const { colors, gradients } = template.design.theme;
    const { scale } = template.design.typography;
    const { spacing } = template.design.layout;

    return `
:root {
  /* Colors */
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-accent: ${colors.accent};
  --color-accent-secondary: ${colors.accentSecondary};
  --color-background: ${colors.background};
  --color-background-secondary: ${colors.backgroundSecondary};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-muted: ${colors.textMuted};
  --color-text-dim: ${colors.textDim};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  
  /* Gradients */
  --gradient-primary: ${gradients.primary};
  --gradient-accent: ${gradients.accent};
  --gradient-overlay: ${gradients.overlay};
  
  /* Typography Scale */
  --font-size-hero: ${scale.heroTitle};
  --font-size-section: ${scale.sectionTitle};
  --font-size-subtitle: ${scale.subtitle};
  --font-size-body: ${scale.body};
  --font-size-caption: ${scale.caption};
  --font-size-tag: ${scale.tag};
  
  /* Spacing */
  --spacing-xs: ${spacing.xs};
  --spacing-sm: ${spacing.sm};
  --spacing-md: ${spacing.md};
  --spacing-lg: ${spacing.lg};
  --spacing-xl: ${spacing.xl};
  
  /* Fonts */
  --font-headline: ${template.design.typography.headlineFont};
  --font-body: ${template.design.typography.bodyFont};
  --font-accent: ${template.design.typography.accentFont};
  
  /* Animation */
  --animation-duration-fast: ${template.design.animations.duration.fast};
  --animation-duration-normal: ${template.design.animations.duration.normal};
  --animation-duration-slow: ${template.design.animations.duration.slow};
  --animation-easing: ${template.design.animations.easing};
  --animation-stagger: ${template.design.animations.staggerDelay};
}
    `.trim();
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private initializeDefaultTemplates(): void {
    const defaultTemplates: IVideoTemplate[] = [
      this.generateTemplate('Corporate Compliance', 'corporate', 'compliance'),
      this.generateTemplate('Healthcare Training', 'healthcare', 'compliance'),
      this.generateTemplate('Safety Essentials', 'manufacturing', 'safety'),
      this.generateTemplate('Tech Onboarding', 'technology', 'onboarding'),
      this.generateTemplate('Finance Ethics', 'finance', 'compliance'),
      this.generateTemplate('Retail Customer Service', 'retail', 'skills'),
      this.generateTemplate('Education Fundamentals', 'education', 'general')
    ];

    this.templates$.next(defaultTemplates);
  }

  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}