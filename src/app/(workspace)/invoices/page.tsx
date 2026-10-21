import { RecordsPage } from "@/components/domain/records";
export const metadata = { title: "Invoices" };
export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string }> }) { return <RecordsPage key={(await searchParams).search || ""} entity="invoices" initialSearch={(await searchParams).search?.slice(0, 200)} />; }
