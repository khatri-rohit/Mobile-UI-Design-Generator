import { ComponentTreeNode, DesignContext, WebAppSpec } from "./types";

export const GENERATED_SCREEN_LIMITS = {
  web: 4,
  mobile: 3,
} as const;

const IMPORT_ALLOWLIST = [
  "react",
  "react-dom",
  "lucide-react",
  "recharts",
  "clsx",
  "tailwind-merge",
  "date-fns",
  "dayjs",
  "lodash",
].join(", ");

export const STAGE1_SYSTEM = `
You are a Design Architect. Extract a compact, implementation-ready WebAppSpec from the user's UI prompt.
Output ONLY valid JSON. No markdown. No comments. No explanation.

Screen limits:
- Web: output 1 to ${GENERATED_SCREEN_LIMITS.web} screens.
- Mobile: output 1 to ${GENERATED_SCREEN_LIMITS.mobile} screens.
- If the user asks for more screens than the cap, choose the screens that best cover the primary user workflow. Do not add overflow, appendix, or duplicate screens.
- Screen names must be short product screen names, not implementation notes.

Return exactly this object shape:
{
  "screens": ["string"],
  "navPattern": "top-nav" | "sidebar" | "hybrid" | "none",
  "platform": "web" | "mobile",
  "colorMode": "dark" | "light",
  "primaryColor": "#hex",
  "accentColor": "#hex",
  "stylingLib": "tailwind",
  "layoutDensity": "comfortable" | "compact",
  "components": ["string"],
  "visualPersonality": "corporate-precision" | "editorial-bold" | "minimal-utility" | "expressive-brand" | "data-dense" | "conversational-warm",
  "dominantLayoutPattern": "full-page-sections" | "dashboard-grid" | "sidebar-content" | "centered-focused" | "split-screen" | "data-table-primary",
  "typographyAuthority": "display-driven" | "body-balanced" | "data-first" | "label-dominant",
  "spacingPhilosophy": "airy" | "balanced" | "dense",
  "primaryInteraction": "read" | "navigate" | "input" | "browse" | "monitor",
  "contentDensityScore": 1 | 2 | 3 | 4 | 5,
  "keyEmotionalTone": "trustworthy" | "energetic" | "calm" | "authoritative" | "playful" | "urgent"
}

Field decisions:
- navPattern is structural. Choose sidebar for tools with 5+ persistent destinations, top-nav for marketing/content, hybrid for complex apps with global nav plus sections, none for single-focus utility screens.
- components should list only visible UI building blocks that Stage 3 must render.
- visualPersonality controls craft level, not brand adjectives.
- primaryInteraction is the dominant user behavior on the screen set.
- contentDensityScore 1 is sparse editorial, 3 is normal SaaS, 5 is dense operational/data UI.
`.trim();

export const STAGE2_SYSTEM = `
You are a UI Layout Architect. Convert a WebAppSpec into one layout blueprint per screen.
Output ONLY a valid JSON array. No markdown. No comments. No explanation.

Do not output canvas positions. Runtime canvas layout is computed by the app.

Return this machine-parseable array shape:
[
  {
    "screen": "string",
    "components": ["string"],
    "layoutArchitecture": {
      "outerContainer": "full-bleed" | "max-w-7xl centered" | "split-sidebar-content" | "hero-then-sections" | "mobile-stack",
      "primaryGrid": "12-col" | "8-col" | "auto-fit-280px" | "single-column" | "sidebar-256px-fluid",
      "sectionBreaks": ["Hero/Above-fold", "Primary Content", "Secondary Content", "CTA/Footer"],
      "fixedElements": ["top-nav 64px", "sidebar 256px"],
      "contentStartOffset": "80px" | "64px" | "0px"
    },
    "componentIntents": [
      {
        "component": "string",
        "role": "primary-action" | "navigation" | "data-display" | "status-indicator" | "content-container" | "input" | "feedback",
        "spatialWeight": "full-width" | "half-width" | "one-third" | "sidebar" | "overlay" | "inline",
        "visualPriority": 1 | 2 | 3,
        "interactionType": "clickable" | "readable" | "inputable" | "static"
      }
    ]
  }
]

Rules:
- fixedElements is always an array. Use [] when there are no fixed elements.
- Every component listed in componentIntents must appear in components.
- Use spatialWeight to describe layout footprint, not importance.
- For mobile, prefer outerContainer "mobile-stack", primaryGrid "single-column", and contentStartOffset "0px" unless the spec requires persistent navigation.
- For sidebar apps, include "sidebar 256px" in fixedElements and use primaryGrid "sidebar-256px-fluid".
`.trim();

const DESIGN_VOCABULARY_DIRECTIVE = `
<design_contract>
1. Layout rhythm
- Use the 8pt system through Tailwind spacing: gap-2, gap-3, gap-4, gap-6, gap-8, gap-12, gap-16, gap-20.
- Avoid arbitrary spacing unless a single icon or media crop needs exact centering.
- Give every screen one primary focal point inside the first 200px.

2. Type system
- Display: text-5xl lg:text-6xl font-black tracking-tight leading-[1.05], hero only.
- H1: text-4xl font-bold tracking-tight leading-tight, page title only.
- H2: text-2xl font-semibold tracking-tight, section title.
- H3: text-lg font-semibold, card or group title.
- Body: text-base leading-relaxed.
- UI: text-sm font-medium.
- Caption: text-xs font-medium tracking-wide uppercase.
- Use at most three visible type levels inside a single section.

3. Color system
- Use the provided CSS variables semantically: surface, surface-elevated, border, primary, accent, text-primary, text-secondary, text-tertiary.
- Never use one gray class for all secondary text.
- Primary color is for the main CTA, active state, or primary data highlight only.

4. Component selection
- For 5+ comparable rows, use a semantic table with thead and tbody.
- For 5+ form fields, use two columns at lg: and one column below lg.
- For 5+ navigation items, use sidebar navigation.
- Empty states need a compact visual mark, specific copy, and one action.
- Loading states must mirror the final layout shape.

5. React and runtime constraints
- Client-rendered React only. No Server Components, async components, use(), next/link, next/image, or router APIs.
- No local imports and no UI component library imports.
- Keep generated data inline in the component file.
</design_contract>
`.trim();

export const STAGE3_SYSTEM = `
You are a world-class product designer who writes production-quality React code.
Your output is rendered directly in a Sandpack iframe and must look complete on first render.

${DESIGN_VOCABULARY_DIRECTIVE}

OUTPUT RULES:
- TSX source code only. No markdown and no prose.
- First non-whitespace token must be import, type, interface, const, function, class, or export.
- Allowed imports exactly: ${IMPORT_ALLOWLIST}. No other package imports.
- No local imports: no ./, ../, /, @/, @/components, next/image, next/link, react-router-dom, shadcn, radix, headlessui, framer-motion, or motion.
- Use standard React + TypeScript. Do not use React 19-only patterns: no use(), no async component functions, no Server Components, no server actions.
- Use Tailwind CSS utility classes. CDN Tailwind is available.
- Compose from semantic HTML elements plus Tailwind. Buttons are <button>, links can be <a href="#">, dialogs are semantic div sections with aria where needed.
- Generate static interactive-looking UI only. No timers, effects, network calls, CSS keyframes, or mount animations.
- Component name must be GeneratedScreen.
- Final line must be: export default GeneratedScreen;
- Include realistic domain-specific mock data. No lorem ipsum, Acme Corp, John Doe, or placeholder labels.
`.trim();

export const WEB_APP_SPEC_SCHEMA = {
  type: "object",
  properties: {
    screens: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: GENERATED_SCREEN_LIMITS.web,
    },
    navPattern: {
      type: "string",
      enum: ["top-nav", "sidebar", "hybrid", "none"],
    },
    platform: { type: "string", enum: ["web", "mobile"] },
    colorMode: { type: "string", enum: ["dark", "light"] },
    primaryColor: { type: "string" },
    accentColor: { type: "string" },
    stylingLib: { type: "string", enum: ["tailwind"] },
    layoutDensity: { type: "string", enum: ["comfortable", "compact"] },
    components: { type: "array", items: { type: "string" } },
    visualPersonality: {
      type: "string",
      enum: [
        "corporate-precision",
        "editorial-bold",
        "minimal-utility",
        "expressive-brand",
        "data-dense",
        "conversational-warm",
      ],
    },
    dominantLayoutPattern: {
      type: "string",
      enum: [
        "full-page-sections",
        "dashboard-grid",
        "sidebar-content",
        "centered-focused",
        "split-screen",
        "data-table-primary",
      ],
    },
    typographyAuthority: {
      type: "string",
      enum: [
        "display-driven",
        "body-balanced",
        "data-first",
        "label-dominant",
      ],
    },
    spacingPhilosophy: {
      type: "string",
      enum: ["airy", "balanced", "dense"],
    },
    primaryInteraction: {
      type: "string",
      enum: ["read", "navigate", "input", "browse", "monitor"],
    },
    contentDensityScore: { type: "number", minimum: 1, maximum: 5 },
    keyEmotionalTone: { type: "string" },
  },
  required: [
    "screens",
    "navPattern",
    "platform",
    "colorMode",
    "stylingLib",
    "layoutDensity",
    "components",
  ],
};

export const MOBILE_SPEC_SCHEMA = WEB_APP_SPEC_SCHEMA;

const SPATIAL_WEIGHT_CLASS_MAP: Record<string, string> = {
  "full-width": "col-span-full w-full",
  "half-width": "col-span-full lg:col-span-6",
  "one-third": "col-span-full md:col-span-6 lg:col-span-4",
  sidebar: "w-full lg:w-64 lg:shrink-0",
  overlay: "fixed inset-4 z-40 max-w-lg ml-auto",
  inline: "inline-flex items-center",
};

function buildNavDirective(navPattern: WebAppSpec["navPattern"]): string {
  const directives: Record<WebAppSpec["navPattern"], string> = {
    "top-nav":
      "Use a top navigation header: h-16, full-width, brand at left, 2-4 nav items, primary action at right. Main content starts below it.",
    sidebar:
      "Use a persistent left sidebar: w-64 on desktop, navigation stacked vertically, main content in a fluid region to the right. On mobile, collapse to a top bar.",
    hybrid:
      "Use both a compact top bar and a left sidebar: top bar for global actions, sidebar for screen sections, main content offset by both.",
    none: "Do not add persistent navigation. Focus the screen on the primary task and local actions only.",
  };

  return directives[navPattern];
}

function buildInteractionDirective(
  interaction?: WebAppSpec["primaryInteraction"],
): string {
  const directives: Record<NonNullable<WebAppSpec["primaryInteraction"]>, string> =
    {
      read: "Optimize for scanning and reading: strong headings, readable line length, calm supporting actions.",
      navigate:
        "Optimize for wayfinding: clear active states, grouped destinations, and visible hierarchy between current and secondary routes.",
      input:
        "Optimize for form completion: labels above controls, grouped fields, validation hints, and visible save/discard actions.",
      browse:
        "Optimize for browsing: filters, cards or rows with comparable metadata, and obvious item affordances.",
      monitor:
        "Optimize for monitoring: dense but legible metrics, status color used sparingly, and recent activity near the top.",
    };

  return directives[interaction ?? "read"];
}

function buildSplitFlowDirective(
  spec: WebAppSpec,
  screen: string,
): string {
  const match = screen.match(/^(.*)\s+-\s+(\d+)$/);
  if (!match) return "";

  const baseName = match[1].trim();
  const currentIndex = Number(match[2]);
  const siblings = spec.screens.filter((candidate) =>
    candidate.startsWith(`${baseName} - `),
  );

  if (siblings.length < 2) return "";

  return `
SPLIT MOBILE FLOW CONTEXT:
- This screen is step ${currentIndex} of ${siblings.length} in the "${baseName}" mobile flow.
- The complete flow is: ${siblings.join(" -> ")}.
- Render this as one connected product journey, not as a disconnected app concept.
- Include subtle step context or persistent destination cues when useful, but do not duplicate the same hero on every step.
`.trim();
}

function buildDesignContextContract(designContext?: DesignContext): string {
  if (!designContext) return "";

  return `
AUTHORITATIVE DESIGN CONTEXT:
- Product type: ${designContext.productType}
- Direction: ${designContext.direction}
- Style: ${designContext.style.name} (${designContext.style.category})
- Typography intent: ${designContext.style.typography}
- Palette: ${designContext.palette.name}; psychology: ${designContext.palette.psychology}
- Layout hint: ${designContext.layout.name}; ${designContext.layout.cssStructure}
- UX priority: ${designContext.uxPriorities[0] || "Accessible contrast, clear hierarchy, and visible focus states."}
- Bias corrections to obey: ${designContext.biasCorrections.slice(0, 3).join(" ")}
`.trim();
}

export function buildScreenPrompt(
  spec: WebAppSpec,
  tree: ComponentTreeNode[],
  screen: string,
  userPrompt: string,
  designContext?: DesignContext,
): string {
  const node = tree.find((n) => n.screen === screen) as
    | (ComponentTreeNode & {
        layoutArchitecture?: Record<string, unknown>;
        componentIntents?: unknown[];
      })
    | undefined;
  const components = node?.components ?? spec.components ?? [];
  const layoutArch = node?.layoutArchitecture;
  const componentIntents = node?.componentIntents ?? [];

  const isDark = spec.colorMode === "dark";
  const isMobile = spec.platform === "mobile";

  const tokenSystem = `
DESIGN TOKENS:
Define these as inline CSS variables on the root element and use them semantically.
- --surface: ${isDark ? "#0f0f0f" : "#fbfbfa"}
- --surface-elevated: ${isDark ? "#1a1a1a" : "#f4f4f2"}
- --surface-overlay: ${isDark ? "#242424" : "#ececea"}
- --border: ${isDark ? "rgba(255,255,255,0.10)" : "rgba(15,15,15,0.10)"}
- --text-primary: ${isDark ? "#f2f2ef" : "#10100e"}
- --text-secondary: ${isDark ? "rgba(242,242,239,0.66)" : "rgba(16,16,14,0.66)"}
- --text-tertiary: ${isDark ? "rgba(242,242,239,0.42)" : "rgba(16,16,14,0.42)"}
- --primary: ${spec.primaryColor}
- --primary-muted: ${spec.primaryColor}22
- --accent: ${spec.accentColor}
- --accent-muted: ${spec.accentColor}22
Use classes like bg-[var(--surface)], text-[var(--text-secondary)], border-[var(--border)].
`.trim();

  const layoutDirective = layoutArch
    ? `
MANDATORY LAYOUT ARCHITECTURE:
- Outer container: ${layoutArch.outerContainer}
- Primary grid: ${layoutArch.primaryGrid}
- Section structure: ${((layoutArch.sectionBreaks as string[]) ?? []).join(" -> ") || "screen-specific sections"}
- Fixed UI elements: ${((layoutArch.fixedElements as string[]) ?? []).join(", ") || "none"}
- Content start offset: ${layoutArch.contentStartOffset ?? "0px"}
`
    : "";

  const designBrief = `
DESIGN BRIEF:
- Screen: ${screen}
- Visual personality: ${spec.visualPersonality || "minimal-utility"}
- Emotional tone: ${spec.keyEmotionalTone || "trustworthy"}
- Layout pattern: ${spec.dominantLayoutPattern || "dashboard-grid"}
- Typography authority: ${spec.typographyAuthority || "body-balanced"}
- Spacing philosophy: ${spec.spacingPhilosophy || "balanced"}
- Density: ${spec.contentDensityScore || 3}/5
- Platform: ${isMobile ? "mobile, 390px viewport, touch-first" : "web, desktop-first, 1280px and wider"}
- Navigation directive: ${buildNavDirective(spec.navPattern)}
- Interaction directive: ${buildInteractionDirective(spec.primaryInteraction)}
`.trim();

  const componentPlan =
    componentIntents.length > 0
      ? `
COMPONENT PLACEMENT PLAN:
${(
  componentIntents as Array<{
    component: string;
    role: string;
    spatialWeight: string;
    visualPriority: number;
    interactionType: string;
  }>
)
  .map((intent) => {
    const classes =
      SPATIAL_WEIGHT_CLASS_MAP[intent.spatialWeight] ??
      "col-span-full";
    return `- Priority ${intent.visualPriority}: ${intent.component}; role=${intent.role}; spatialWeight=${intent.spatialWeight}; classes=${classes}; interaction=${intent.interactionType}`;
  })
  .join("\n")}
`
      : `COMPONENTS TO INCLUDE: ${components.join(", ") || "derive from user intent"}`;

  const antiPatterns = `
ANTI-PATTERNS TO AVOID:
- Equal-size KPI cards with identical visual weight. Vary emphasis and add trend context.
- Generic three-card feature rows. Use asymmetric rhythm or a table/list when the content is comparable.
- text-gray-500 for all secondary text. Use the token system.
- Every button styled as primary. Use primary, secondary, and ghost hierarchy.
- p-4 on every element. Follow the spacing contract.
- Single-column desktop forms with 5+ fields. Use lg:grid-cols-2.
- Dashboard content trapped in a narrow centered column. Use the available width.
`.trim();

  return `
Generate a complete, production-quality React component for screen: "${screen}".

USER INTENT:
${userPrompt}

${designBrief}

${buildSplitFlowDirective(spec, screen)}

${buildDesignContextContract(designContext)}

${tokenSystem}

${layoutDirective}

${componentPlan}

${antiPatterns}

SYNTAX REQUIREMENTS:
- Component name: GeneratedScreen.
- Root element must include style={{ fontFamily: "'Inter', system-ui, sans-serif" }}.
- Include realistic mock data with at least 4 items for every list, grid, chart, or table.
- Close all JSX tags and balance all braces.
- Final line: export default GeneratedScreen;
- Output code only.
`.trim();
}
