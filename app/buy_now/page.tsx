// app/buy_now/page.tsx
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function BuyNowPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id || typeof id !== "string") {
    redirect("/current-listings");
  }

  redirect(`/place_bid?id=${encodeURIComponent(id)}`);
}
