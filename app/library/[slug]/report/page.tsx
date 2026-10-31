import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/library/document-view";
import { ESSAYS } from "@/components/library/essays";
import { entryFor } from "@/lib/library/catalog";
import { loadDocument } from "@/lib/library/document";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(ESSAYS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = entryFor(slug);
  return entry ? { title: `${entry.title.join(" ")} (report)` } : {};
}

export default async function ReportPage({ params }: Props) {
  const { slug } = await params;
  const doc = await loadDocument(slug);
  if (!doc) notFound();
  return <DocumentView doc={doc} essay={`/library/${slug}`} />;
}
