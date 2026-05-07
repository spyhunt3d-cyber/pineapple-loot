import { redirect } from "next/navigation";

// Root redirects to the loot table — the primary public view
export default function HomePage() {
  redirect("/loot-table");
}
