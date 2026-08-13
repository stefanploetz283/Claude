"use server";

import { requireAdmin } from "@/lib/rbac";
import { geocodeAddress } from "@/lib/fahrtenrechner/geocode";

/** Geocoding-Vorschau für den Neuzuteilungs-Assistenten - schlägt eine Adresse nach, ohne etwas zu speichern. */
export async function previewGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  await requireAdmin();
  return geocodeAddress(address);
}
