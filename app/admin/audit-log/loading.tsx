import { ListPageSkeleton } from "@/components/list-skeleton";

export default function Loading() {
  return <ListPageSkeleton filterCount={5} rows={8} />;
}
