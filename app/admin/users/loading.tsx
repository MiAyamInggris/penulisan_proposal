import { ListPageSkeleton } from "@/components/list-skeleton";

export default function Loading() {
  return <ListPageSkeleton filterCount={2} rows={8} />;
}
