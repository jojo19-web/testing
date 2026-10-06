import { BookOpen, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { HEALTHY_MODEL_CLASSES } from "@/lib/model-classes";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ published?: string }> }) {
  const supabase = getAdminClient();
  const { data = [], error } = await supabase
    .from("disease_catalog")
    .select("id,category,model_class_index,model_label,content_version,disease_localizations(language_tag,name,symptom_preview,causes,guidance),disease_references(language_tag,publisher,title,url)")
    .order("model_class_index");
  const diseases = data ?? [];
  const published = (await searchParams).published;
  const publishedName = diseases.find((disease) => disease.id === published)?.disease_localizations?.find((row) => row.language_tag === "en")?.name ?? published;
  const catalogEntries = [
    ...diseases.map((disease) => ({ kind: "disease" as const, disease })),
    ...HEALTHY_MODEL_CLASSES
      .filter(({ index }) => !diseases.some((disease) => disease.model_class_index === index))
      .map((modelClass) => ({ kind: "healthy" as const, modelClass })),
  ].sort((left, right) => {
    const leftIndex = left.kind === "disease" ? left.disease.model_class_index : left.modelClass.index;
    const rightIndex = right.kind === "disease" ? right.disease.model_class_index : right.modelClass.index;
    return leftIndex - rightIndex;
  });

  return (
    <div className="fade-up mx-auto max-w-[1240px]">
      <header>
        <h1 className="text-3xl font-bold tracking-[-.03em]">Disease catalog</h1>
        <p className="mt-1 text-sm text-[#686a69]">The full model map is shown below. Disease entries are editable; healthy model outputs are read-only.</p>
      </header>
      {published && <p role="status" className="status-banner mt-5 flex items-center gap-2 rounded-xl border border-[#bfe4c5] bg-[#f1fbf2] p-3 text-sm font-semibold text-[#247936]"><CheckCircle2 size={17}/>{publishedName || "Disease content"} published successfully.</p>}
      {error ? <p role="alert" className="mt-6 rounded-xl bg-[#fff0f2] p-4 text-sm text-[#a92f40]">The disease catalog is temporarily unavailable.</p> : <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Disease and model class catalog">
        {catalogEntries.map((entry) => {
          if (entry.kind === "healthy") {
            return <div className="surface border-[#d8e5d9] bg-[#fbfef9] p-5" key={`healthy-${entry.modelClass.index}`} aria-label={`Model class ${entry.modelClass.index}: ${entry.modelClass.label}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#278b3d]">Healthy model output</p><h2 className="mt-1 text-xl font-bold">{entry.modelClass.label}</h2></div><span className="rounded-lg bg-[#edf2ed] px-2 py-1 font-mono text-xs text-[#2f4732]">Class {entry.modelClass.index}</span></div><p className="mt-3 text-sm leading-6 text-[#625e72]">{entry.modelClass.description}</p><p className="mt-4 text-xs font-semibold uppercase tracking-[.1em] text-[#6b756d]">Read-only model mapping</p></div>;
          }
          const disease = entry.disease;
          const en = disease.disease_localizations?.find((localization) => localization.language_tag === "en");
          return <Link href={`/disease-catalog/${disease.id}`} key={disease.id} className="surface motion-card p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#278b3d]">{disease.category.replaceAll("_", " ")}</p><h2 className="mt-1 text-xl font-bold">{en?.name ?? disease.id}</h2></div><span className="rounded-lg bg-[#f1ecf8] px-2 py-1 font-mono text-xs text-[#5b3295]">Class {disease.model_class_index}</span></div><p className="mt-3 text-sm leading-6 text-[#625e72]">{en?.symptom_preview || "Content will be published from the bundled offline catalog."}</p><div className="mt-4 flex flex-wrap gap-2">{disease.disease_references?.filter((reference) => reference.language_tag === "en").map((reference) => <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5b3295]" key={reference.url}>{reference.publisher}<ExternalLink size={12}/></span>)}</div></Link>;
        })}
      </section>}
      <div className="mt-5 rounded-xl border border-[#d9d3e4] bg-[#f8f4fb] p-4 text-sm text-[#655f74]"><BookOpen className="mr-2 inline text-[#5b3295]" size={18}/>Publishing increases the catalog version while keeping disease IDs and model mappings stable. Classes 2 and 3 are healthy detector outputs, so they remain read-only here.</div>
    </div>
  );
}
