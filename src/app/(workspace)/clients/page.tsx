import { RecordsPage } from "@/components/domain/records";
export const metadata = { title: "Clients" };
export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string }> }) { return <RecordsPage key={(await searchParams).search || ""} entity="clients" initialSearch={(await searchParams).search?.slice(0, 200)} />; }
