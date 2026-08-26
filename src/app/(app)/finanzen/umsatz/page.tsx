import { redirect } from "next/navigation";

// Das Umsatz-Cockpit ist im Betriebswirtschaftlichen Cockpit aufgegangen (Quote/Kosten/Umsatz/
// Auslastungsrisiko gemeinsam statt getrennter Tools, siehe /finanzen/cockpit).
export default function UmsatzCockpitRedirectPage() {
  redirect("/finanzen/cockpit");
}
