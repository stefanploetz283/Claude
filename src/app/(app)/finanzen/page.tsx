import { redirect } from "next/navigation";

export default function FinanzenRedirect() {
  redirect("/finanzen/rechnungen");
}
