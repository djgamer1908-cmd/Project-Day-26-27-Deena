import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeRequest {
  description: string;
  latitude?: number;
  longitude?: number;
  excludeId?: string;
}

interface CategoryRule {
  category: string;
  keywords: string[];
  baseSeverity: number;
}

const CATEGORY_RULES: CategoryRule[] = [
  { category: "road", keywords: ["pothole", "road", "street", "crack", "asphalt", "pavement", "sinkhole", "manhole", "speed bump", "kerb", "sidewalk", "footpath"], baseSeverity: 4 },
  { category: "garbage", keywords: ["garbage", "trash", "rubbish", "waste", "dump", "overflow", "bin", "litter", "dumping", "debris", "recycling"], baseSeverity: 3 },
  { category: "streetlight", keywords: ["streetlight", "light", "lamp", "pole", "dark", "flicker", "bulb", "illumination", "street light"], baseSeverity: 2 },
  { category: "water", keywords: ["water", "leak", "pipe", "burst", "flooding", "flood", "tap", "sewage", "supply", "tank", "drinking water"], baseSeverity: 4 },
  { category: "drain", keywords: ["drain", "gutter", "culvert", "blocked", "clog", "overflow", "sewer", "storm", "manhole"], baseSeverity: 3 },
  { category: "other", keywords: [], baseSeverity: 3 },
];

const SEVERITY_BOOST_WORDS = ["urgent", "danger", "hazard", "accident", "injury", "injured", "children", "school", "hospital", "critical", "severe", "broken", "collapsed", "fire", "live wire", "electrocution", "drowning"];

function classify(text: string): { category: string; severity: number } {
  const lower = text.toLowerCase();
  let bestCategory = "other";
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) if (lower.includes(kw)) score += 1;
    if (score > bestScore) { bestScore = score; bestCategory = rule.category; }
  }
  const rule = CATEGORY_RULES.find((r) => r.category === bestCategory)!;
  let severity = rule.baseSeverity;
  for (const word of SEVERITY_BOOST_WORDS) if (lower.includes(word)) severity = Math.min(5, severity + 1);
  return { category: bestCategory, severity };
}

function generateSummary(text: string, category: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= 100) return clean || `${category} issue reported`;
  return clean.slice(0, 97) + "...";
}

function deriveTitle(text: string, category: string): string {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.category === category) {
      for (const kw of rule.keywords) {
        if (lower.includes(kw)) {
          const cap = kw.charAt(0).toUpperCase() + kw.slice(1);
          return `${cap} issue`;
        }
      }
    }
  }
  const cap = category.charAt(0).toUpperCase() + category.slice(1);
  return `${cap} issue`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const body = await req.json() as AnalyzeRequest;
    if (!body.description) return new Response(JSON.stringify({ error: "description required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { category, severity } = classify(body.description);
    const summary = generateSummary(body.description, category);
    const title = deriveTitle(body.description, category);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Duplicate detection: nearby issues (within 100m) of same category, OR text similarity
    let duplicateOf: string | null = null;
    let duplicateSimilarity = 0;

    if (body.latitude && body.longitude) {
      const { data: nearby } = await supabase.rpc("find_nearby_duplicates", {
        p_lat: body.latitude,
        p_lng: body.longitude,
        p_category: category,
        p_exclude: body.excludeId || null,
      });
      if (nearby && nearby.length > 0) {
        duplicateOf = nearby[0].id;
        duplicateSimilarity = Math.round((nearby[0].distance_m || 0) < 50 ? 0.95 : 0.8 * 100) / 100;
      }
    }

    // Text-based duplicate fallback
    if (!duplicateOf && body.description.trim().length > 10) {
      const { data: similar } = await supabase.rpc("find_text_duplicates", {
        p_text: body.description,
        p_category: category,
        p_exclude: body.excludeId || null,
      });
      if (similar && similar.length > 0 && similar[0].similarity >= 0.6) {
        duplicateOf = similar[0].id;
        duplicateSimilarity = similar[0].similarity;
      }
    }

    return new Response(JSON.stringify({
      category, severity, summary, title,
      duplicate_of: duplicateOf,
      duplicate_similarity: duplicateSimilarity,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
