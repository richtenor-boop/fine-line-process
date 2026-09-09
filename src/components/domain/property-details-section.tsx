import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  foreclosureStatusEnum,
  taxSaleStatusEnum,
  surplusClaimStatusEnum,
  mortgageSurplusStatusEnum,
  probateStatusEnum,
  shortSaleStatusEnum,
  creativeFinanceTypeEnum,
} from "@/lib/modules/property-details/schema";
import {
  upsertForeclosureAction,
  upsertTaxSaleAction,
  createTaxSurplusClaimAction,
  deleteTaxSurplusClaimAction,
  createMortgageSurplusClaimAction,
  deleteMortgageSurplusClaimAction,
  upsertProbateCaseAction,
  upsertShortSaleAction,
  upsertCreativeFinanceDealAction,
  createLienAction,
  deleteLienAction,
  createMortgageAction,
  deleteMortgageAction,
  createAuctionAction,
  deleteAuctionAction,
  createValuationAction,
  deleteValuationAction,
  createComparableSaleAction,
  deleteComparableSaleAction,
  createRepairEstimateAction,
  deleteRepairEstimateAction,
} from "@/lib/modules/property-details/actions";
import type { getPropertyDetails } from "@/lib/modules/property-details/service";

type PropertyDetails = Awaited<ReturnType<typeof getPropertyDetails>>;

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function money(value: unknown): string {
  const n = value === null || value === undefined ? null : Number(value);
  return n ? `$${n.toLocaleString()}` : "—";
}

function dateStr(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function StatusOptions({ options }: { options: readonly string[] }) {
  return (
    <>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {humanize(opt)}
        </option>
      ))}
    </>
  );
}

function DeleteButton({
  action,
  hiddenFields,
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
}) {
  return (
    <form action={action}>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant="ghost" className="text-xs text-danger">
        Delete
      </Button>
    </form>
  );
}

export function PropertyDetailsSection({
  propertyId,
  details,
}: {
  propertyId: string;
  details: PropertyDetails;
}) {
  const { foreclosure, taxSale, mortgageSurplusClaims, probateCase, shortSale, creativeFinanceDeal } = details;
  const { liens, mortgages, auctions, valuations, comparableSales, repairEstimates } = details;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Specialized case status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 divide-y divide-border">
          <details className="py-3" open={!!foreclosure}>
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Foreclosure {foreclosure && <span className="text-xs text-muted">({humanize(foreclosure.status)})</span>}
            </summary>
            <form action={upsertForeclosureAction} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Select name="status" defaultValue={foreclosure?.status ?? "PRE_FORECLOSURE"} className="h-8 text-xs">
                <StatusOptions options={foreclosureStatusEnum.options} />
              </Select>
              <Input name="defaultAmount" type="number" step="0.01" placeholder="Default amount" defaultValue={foreclosure?.defaultAmount ? Number(foreclosure.defaultAmount) : ""} className="h-8 text-xs" />
              <Input name="auctionDate" type="date" defaultValue={dateStr(foreclosure?.auctionDate)} className="h-8 text-xs" />
              <Input name="trusteeName" placeholder="Trustee name" defaultValue={foreclosure?.trusteeName ?? ""} className="h-8 text-xs" />
              <Input name="caseNumber" placeholder="Case number" defaultValue={foreclosure?.caseNumber ?? ""} className="h-8 text-xs" />
              <Button type="submit" variant="secondary" className="h-8 text-xs">
                Save
              </Button>
            </form>
          </details>

          <details className="py-3" open={!!taxSale}>
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Tax sale {taxSale && <span className="text-xs text-muted">({humanize(taxSale.status)})</span>}
            </summary>
            <form action={upsertTaxSaleAction} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Select name="status" defaultValue={taxSale?.status ?? "UPCOMING"} className="h-8 text-xs">
                <StatusOptions options={taxSaleStatusEnum.options} />
              </Select>
              <Input name="saleDate" type="date" defaultValue={dateStr(taxSale?.saleDate)} className="h-8 text-xs" />
              <Input name="saleAmount" type="number" step="0.01" placeholder="Sale amount" defaultValue={taxSale?.saleAmount ? Number(taxSale.saleAmount) : ""} className="h-8 text-xs" />
              <Input name="overbidAmount" type="number" step="0.01" placeholder="Overbid amount" defaultValue={taxSale?.overbidAmount ? Number(taxSale.overbidAmount) : ""} className="h-8 text-xs" />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Save
              </Button>
            </form>

            {taxSale && (
              <div className="mt-3 rounded-md border border-border p-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Surplus claims</p>
                <ul className="space-y-1">
                  {taxSale.surplusClaims.map((claim) => (
                    <li key={claim.id} className="flex items-center justify-between text-xs">
                      <span>
                        {humanize(claim.status)} · {money(claim.surplusAmount)}
                      </span>
                      <DeleteButton
                        action={deleteTaxSurplusClaimAction}
                        hiddenFields={{ claimId: claim.id, propertyId }}
                      />
                    </li>
                  ))}
                  {taxSale.surplusClaims.length === 0 && <li className="text-xs text-muted">No surplus claims yet.</li>}
                </ul>
                <form action={createTaxSurplusClaimAction} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="taxSaleId" value={taxSale.id} />
                  <input type="hidden" name="propertyId" value={propertyId} />
                  <Select name="status" defaultValue="NEW" className="h-8 text-xs">
                    <StatusOptions options={surplusClaimStatusEnum.options} />
                  </Select>
                  <Input name="surplusAmount" type="number" step="0.01" placeholder="Surplus amount" className="h-8 text-xs" />
                  <Button type="submit" variant="secondary" className="h-8 shrink-0 text-xs">
                    Add
                  </Button>
                </form>
              </div>
            )}
          </details>

          <details className="py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Mortgage surplus claims {mortgageSurplusClaims.length > 0 && <span className="text-xs text-muted">({mortgageSurplusClaims.length})</span>}
            </summary>
            <ul className="mt-3 space-y-1">
              {mortgageSurplusClaims.map((claim) => (
                <li key={claim.id} className="flex items-center justify-between text-xs">
                  <span>
                    {humanize(claim.status)} · {money(claim.surplusAmount)}
                  </span>
                  <DeleteButton action={deleteMortgageSurplusClaimAction} hiddenFields={{ claimId: claim.id, propertyId }} />
                </li>
              ))}
              {mortgageSurplusClaims.length === 0 && <li className="text-xs text-muted">None on record.</li>}
            </ul>
            <form action={createMortgageSurplusClaimAction} className="mt-2 flex items-center gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Select name="status" defaultValue="NEW" className="h-8 text-xs">
                <StatusOptions options={mortgageSurplusStatusEnum.options} />
              </Select>
              <Input name="surplusAmount" type="number" step="0.01" placeholder="Surplus amount" className="h-8 text-xs" />
              <Button type="submit" variant="secondary" className="h-8 shrink-0 text-xs">
                Add
              </Button>
            </form>
          </details>

          <details className="py-3" open={!!probateCase}>
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Probate case {probateCase && <span className="text-xs text-muted">({humanize(probateCase.status)})</span>}
            </summary>
            <form action={upsertProbateCaseAction} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Select name="status" defaultValue={probateCase?.status ?? "NEW"} className="h-8 text-xs">
                <StatusOptions options={probateStatusEnum.options} />
              </Select>
              <Input name="caseNumber" placeholder="Case number" defaultValue={probateCase?.caseNumber ?? ""} className="h-8 text-xs" />
              <Input name="county" placeholder="County" defaultValue={probateCase?.county ?? ""} className="h-8 text-xs" />
              <Input name="filedDate" type="date" defaultValue={dateStr(probateCase?.filedDate)} className="h-8 text-xs" />
              <Input
                name="personalRepresentativeName"
                placeholder="Personal representative"
                defaultValue={probateCase?.personalRepresentativeName ?? ""}
                className="col-span-2 h-8 text-xs"
              />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Save
              </Button>
            </form>
          </details>

          <details className="py-3" open={!!shortSale}>
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Short sale {shortSale && <span className="text-xs text-muted">({humanize(shortSale.status)})</span>}
            </summary>
            <form action={upsertShortSaleAction} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Select name="status" defaultValue={shortSale?.status ?? "NEW"} className="h-8 text-xs">
                <StatusOptions options={shortSaleStatusEnum.options} />
              </Select>
              <Input name="lenderName" placeholder="Lender name" defaultValue={shortSale?.lenderName ?? ""} className="h-8 text-xs" />
              <Input name="loanNumber" placeholder="Loan number" defaultValue={shortSale?.loanNumber ?? ""} className="h-8 text-xs" />
              <Button type="submit" variant="secondary" className="h-8 text-xs">
                Save
              </Button>
            </form>
          </details>

          <details className="py-3" open={!!creativeFinanceDeal}>
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Creative finance {creativeFinanceDeal && <span className="text-xs text-muted">({humanize(creativeFinanceDeal.structureType)})</span>}
            </summary>
            <form action={upsertCreativeFinanceDealAction} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Select name="structureType" defaultValue={creativeFinanceDeal?.structureType ?? "SUBJECT_TO"} className="h-8 text-xs">
                <StatusOptions options={creativeFinanceTypeEnum.options} />
              </Select>
              <Input
                name="monthlyPayment"
                type="number"
                step="0.01"
                placeholder="Monthly payment"
                defaultValue={creativeFinanceDeal?.monthlyPayment ? Number(creativeFinanceDeal.monthlyPayment) : ""}
                className="h-8 text-xs"
              />
              <Input name="terms" placeholder="Terms" defaultValue={creativeFinanceDeal?.terms ?? ""} className="col-span-2 h-8 text-xs" />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Save
              </Button>
            </form>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial &amp; market data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 divide-y divide-border">
          <details className="py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Liens {liens.length > 0 && <span className="text-xs text-muted">({liens.length})</span>}
            </summary>
            <ul className="mt-3 space-y-1">
              {liens.map((lien) => (
                <li key={lien.id} className="flex items-center justify-between text-xs">
                  <span>
                    {lien.holderName} · {money(lien.amount)} {lien.lienType && `· ${lien.lienType}`}
                  </span>
                  <DeleteButton action={deleteLienAction} hiddenFields={{ lienId: lien.id, propertyId }} />
                </li>
              ))}
              {liens.length === 0 && <li className="text-xs text-muted">No liens on record.</li>}
            </ul>
            <form action={createLienAction} className="mt-2 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Input name="holderName" placeholder="Holder name" required className="h-8 text-xs" />
              <Input name="amount" type="number" step="0.01" placeholder="Amount" className="h-8 text-xs" />
              <Input name="lienType" placeholder="Lien type" className="h-8 text-xs" />
              <Input name="filedDate" type="date" className="h-8 text-xs" />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Add lien
              </Button>
            </form>
          </details>

          <details className="py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Mortgages {mortgages.length > 0 && <span className="text-xs text-muted">({mortgages.length})</span>}
            </summary>
            <ul className="mt-3 space-y-1">
              {mortgages.map((mortgage) => (
                <li key={mortgage.id} className="flex items-center justify-between text-xs">
                  <span>
                    {mortgage.lenderName} · balance {money(mortgage.currentBalance)}
                  </span>
                  <DeleteButton action={deleteMortgageAction} hiddenFields={{ mortgageId: mortgage.id, propertyId }} />
                </li>
              ))}
              {mortgages.length === 0 && <li className="text-xs text-muted">No mortgages on record.</li>}
            </ul>
            <form action={createMortgageAction} className="mt-2 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Input name="lenderName" placeholder="Lender name" required className="h-8 text-xs" />
              <Input name="originalAmount" type="number" step="0.01" placeholder="Original amount" className="h-8 text-xs" />
              <Input name="currentBalance" type="number" step="0.01" placeholder="Current balance" className="h-8 text-xs" />
              <Input name="originationDate" type="date" className="h-8 text-xs" />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Add mortgage
              </Button>
            </form>
          </details>

          <details className="py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Auctions {auctions.length > 0 && <span className="text-xs text-muted">({auctions.length})</span>}
            </summary>
            <ul className="mt-3 space-y-1">
              {auctions.map((auction) => (
                <li key={auction.id} className="flex items-center justify-between text-xs">
                  <span>
                    {dateStr(auction.auctionDate)} · opening bid {money(auction.openingBid)} {auction.result && `· ${auction.result}`}
                  </span>
                  <DeleteButton action={deleteAuctionAction} hiddenFields={{ auctionId: auction.id, propertyId }} />
                </li>
              ))}
              {auctions.length === 0 && <li className="text-xs text-muted">No auctions on record.</li>}
            </ul>
            <form action={createAuctionAction} className="mt-2 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Input name="auctionDate" type="date" required className="h-8 text-xs" />
              <Input name="location" placeholder="Location" className="h-8 text-xs" />
              <Input name="openingBid" type="number" step="0.01" placeholder="Opening bid" className="h-8 text-xs" />
              <Input name="result" placeholder="Result" className="h-8 text-xs" />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Add auction
              </Button>
            </form>
          </details>

          <details className="py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Valuations {valuations.length > 0 && <span className="text-xs text-muted">({valuations.length})</span>}
            </summary>
            <ul className="mt-3 space-y-1">
              {valuations.map((valuation) => (
                <li key={valuation.id} className="flex items-center justify-between text-xs">
                  <span>
                    {valuation.source} · {money(valuation.value)} · {dateStr(valuation.asOfDate)}
                  </span>
                  <DeleteButton action={deleteValuationAction} hiddenFields={{ valuationId: valuation.id, propertyId }} />
                </li>
              ))}
              {valuations.length === 0 && <li className="text-xs text-muted">No valuations on record.</li>}
            </ul>
            <form action={createValuationAction} className="mt-2 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Input name="source" placeholder="Source (manual, avm, agent_bpo)" required className="h-8 text-xs" />
              <Input name="value" type="number" step="0.01" placeholder="Value" required className="h-8 text-xs" />
              <Input name="asOfDate" type="date" required className="col-span-2 h-8 text-xs" />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Add valuation
              </Button>
            </form>
          </details>

          <details className="py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Comparable sales {comparableSales.length > 0 && <span className="text-xs text-muted">({comparableSales.length})</span>}
            </summary>
            <ul className="mt-3 space-y-1">
              {comparableSales.map((comp) => (
                <li key={comp.id} className="flex items-center justify-between text-xs">
                  <span>
                    {comp.addressLine1} · {money(comp.soldPrice)} · {dateStr(comp.soldDate)}
                  </span>
                  <DeleteButton action={deleteComparableSaleAction} hiddenFields={{ comparableSaleId: comp.id, propertyId }} />
                </li>
              ))}
              {comparableSales.length === 0 && <li className="text-xs text-muted">No comparable sales yet.</li>}
            </ul>
            <form action={createComparableSaleAction} className="mt-2 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Input name="addressLine1" placeholder="Address" required className="col-span-2 h-8 text-xs" />
              <Input name="soldPrice" type="number" step="0.01" placeholder="Sold price" required className="h-8 text-xs" />
              <Input name="soldDate" type="date" required className="h-8 text-xs" />
              <Input name="distanceMiles" type="number" step="0.1" placeholder="Distance (mi)" className="h-8 text-xs" />
              <Input name="squareFeet" type="number" placeholder="Square feet" className="h-8 text-xs" />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Add comp
              </Button>
            </form>
          </details>

          <details className="py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Repair estimates {repairEstimates.length > 0 && <span className="text-xs text-muted">({repairEstimates.length})</span>}
            </summary>
            <ul className="mt-3 space-y-1">
              {repairEstimates.map((estimate) => (
                <li key={estimate.id} className="flex items-center justify-between text-xs">
                  <span>
                    {estimate.category} · {money(estimate.estimatedCost)}
                  </span>
                  <DeleteButton action={deleteRepairEstimateAction} hiddenFields={{ repairEstimateId: estimate.id, propertyId }} />
                </li>
              ))}
              {repairEstimates.length === 0 && <li className="text-xs text-muted">No repair estimates yet.</li>}
            </ul>
            <form action={createRepairEstimateAction} className="mt-2 grid grid-cols-2 gap-2">
              <input type="hidden" name="propertyId" value={propertyId} />
              <Input name="category" placeholder="Category (roof, HVAC, ...)" required className="h-8 text-xs" />
              <Input name="estimatedCost" type="number" step="0.01" placeholder="Estimated cost" required className="h-8 text-xs" />
              <Input name="notes" placeholder="Notes" className="col-span-2 h-8 text-xs" />
              <Button type="submit" variant="secondary" className="col-span-2 h-8 text-xs">
                Add estimate
              </Button>
            </form>
          </details>
        </CardContent>
      </Card>
    </>
  );
}
