import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getContractDefaults } from "@/lib/modules/contract-generator/service";
import { contractTypeEnum } from "@/lib/modules/contract-generator/schema";
import { Card, CardContent } from "@/components/ui/card";
import { ContractForm } from "./contract-form";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function NewContractPage({ params, searchParams }: PageProps<"/properties/[id]/contracts/new">) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await requirePermission("deals:edit");
  const defaults = await getContractDefaults(session.user.organizationId, id);
  if (!defaults) notFound();

  const parsedType = contractTypeEnum.safeParse(first(sp.type));
  const type = parsedType.success ? parsedType.data : "CASH";
  const price = Number(first(sp.price));
  const purchasePrice = Number.isFinite(price) && price > 0 ? price : undefined;
  // Subject-To: anything the evaluator priced above the loan is cash to the seller.
  const cashToSeller =
    type === "SUBJECT_TO" && purchasePrice !== undefined && defaults.loanBalance !== undefined
      ? Math.max(0, purchasePrice - defaults.loanBalance)
      : undefined;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/properties/${id}`} className="text-sm text-primary hover:underline">
          ← {defaults.propertyLabel}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Generate a contract</h1>
        <p className="text-sm text-muted">Prefilled from the property, its owners, and the deal analyzer. Check every field.</p>
      </div>
      <Card>
        <CardContent className="pt-5">
          <ContractForm defaults={{ ...defaults, purchasePrice, cashToSeller }} initialType={type} />
        </CardContent>
      </Card>
    </div>
  );
}
