import { redirect } from "next/navigation";

/** Root page — redirects immediately to the dashboard. */
export default function HomePage() {
  redirect("/issues");
}
