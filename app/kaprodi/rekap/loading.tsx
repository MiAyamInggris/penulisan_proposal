import { ListPageSkeleton } from "@/components/list-skeleton";

export default function Loading() {
  return <ListPageSkeleton filterCount={1} rows={6} />;
}
