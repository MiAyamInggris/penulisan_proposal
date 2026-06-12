import { ListPageSkeleton } from "@/components/list-skeleton";

export default function Loading() {
  return <ListPageSkeleton filterCount={3} rows={6} />;
}
