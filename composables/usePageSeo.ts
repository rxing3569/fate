type SeoValue = string | (() => string);
type SeoKeywords = string[] | (() => string[]);

interface PageSeoOptions {
  title: SeoValue;
  description: SeoValue;
  keywords: SeoKeywords;
  canonicalPath?: SeoValue;
  ogType?: "website" | "article";
  brandLabel?: string;
}

const siteUrl = "https://www.fatejyc.com";
const brandName = "江映澄紫微、AI紫微、紫微教學平台";

function resolveValue(value: SeoValue) {
  return typeof value === "function" ? value() : value;
}

function resolveKeywords(value: SeoKeywords) {
  return typeof value === "function" ? value() : value;
}

function brandedTitle(value: string, brandLabel = brandName) {
  const title = value.trim();
  return title.includes(brandLabel) ? title : `${title}｜${brandLabel}`;
}

function canonicalUrl(path: string) {
  const normalized = path.split(/[?#]/)[0]?.replace(/\/+$/, "") || "";
  return normalized ? `${siteUrl}${normalized}/` : `${siteUrl}/`;
}

export function usePageSeo(options: PageSeoOptions) {
  const route = useRoute();
  const title = computed(() =>
    brandedTitle(resolveValue(options.title), options.brandLabel),
  );
  const description = computed(() => resolveValue(options.description).trim());
  const keywords = computed(() =>
    [...new Set(resolveKeywords(options.keywords).map((item) => item.trim()))]
      .filter(Boolean)
      .join(", "),
  );
  const canonical = computed(() =>
    canonicalUrl(
      options.canonicalPath ? resolveValue(options.canonicalPath) : route.path,
    ),
  );

  useSeoMeta({
    title: () => title.value,
    description: () => description.value,
    keywords: () => keywords.value,
    ogTitle: () => title.value,
    ogDescription: () => description.value,
    ogType: options.ogType || "website",
    twitterTitle: () => title.value,
    twitterDescription: () => description.value,
  });
  useHead(() => ({
    link: [{ rel: "canonical", href: canonical.value }],
  }));
}
