import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/library/document-view";
import { ESSAYS } from "@/components/library/essays";
import { CATALOG, entryFor } from "@/lib/library/catalog";
import { loadDocument } from "@/lib/library/document";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATALOG.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = entryFor(slug);
  return entry ? { title: entry.title.join(" "), description: entry.dek } : {};
}

export default async function DocumentPage({ params }: Props) {
  const { slug } = await params;
  const Essay = ESSAYS[slug];
  if (Essay) return <Essay />;
  const doc = await loadDocument(slug);
  if (!doc) notFound();
  return <DocumentView doc={doc} />;
}
