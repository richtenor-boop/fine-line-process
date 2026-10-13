import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getGeneratedContract } from "@/lib/modules/contract-generator/service";
import { renderContract } from "@/lib/modules/contract-generator/templates";
import { generateContractSchema } from "@/lib/modules/contract-generator/schema";
import { PrintButton } from "./print-button";

export default async function GeneratedContractPage({ params }: PageProps<"/contracts/[id]">) {
  const { id } = await params;
  const session = await requirePermission("deals:view");
  const contract = await getGeneratedContract(session.user.organizationId, id);
  if (!contract) notFound();

  // Re-render from the saved inputs so layout fixes apply to old drafts too; the wording is the same.
  const fields = generateContractSchema.parse(contract.fields);
  const rendered = renderContract(fields);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/properties/${contract.property.id}`} className="text-sm text-primary hover:underline">
          ← {contract.property.addressLine1}
        </Link>
        <div className="flex items-center gap-3">
          {contract.documentId && (
            <a href={`/api/documents/${contract.documentId}`} className="text-sm text-primary hover:underline">
              Download file
            </a>
          )}
          <Link
            href={`/properties/${contract.property.id}/contracts/new?type=${contract.type}`}
            className="text-sm text-muted hover:underline"
          >
            New version
          </Link>
          <PrintButton />
        </div>
      </div>

      <article className="contract-sheet rounded-lg border border-border bg-white px-6 py-8 font-serif text-[15px] leading-relaxed text-slate-900 shadow-sm sm:px-12">
        <h1 className="text-center text-xl font-bold">{rendered.title}</h1>
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 font-sans text-xs text-amber-900">{rendered.notice}</p>
        {rendered.sections.map((s) => (
          <section key={s.heading} className="mt-5">
            <h2 className="text-sm font-bold">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="mt-1 whitespace-pre-wrap">
                {p}
              </p>
            ))}
          </section>
        ))}
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
          {rendered.signatureParties.map((party) => (
            <div key={party.role}>
              <div className="h-10 border-b border-slate-900" />
              <p className="mt-1 text-sm">
                {party.role}: {party.name}
              </p>
              <p className="text-sm">Date: ______________</p>
            </div>
          ))}
        </div>
      </article>
      <p className="no-print text-xs text-muted">
        Generated {contract.createdAt.toLocaleString()}. A copy is saved in the property&apos;s Documents.
      </p>
    </div>
  );
}
