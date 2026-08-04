/**
 * Klienten, die vor der Trennung in street/postalCodeCity angelegt wurden, haben die
 * Adresse nur im alten kombinierten Feld ("Straße Hausnr, PLZ Ort"). Für die Anzeige
 * wird das Muster automatisch aufgesplittet, ohne die Datenbank zu verändern.
 */
export function resolveClientAddress(client: {
  street: string | null;
  postalCodeCity: string | null;
  address: string | null;
}): { street: string | null; postalCodeCity: string | null } {
  if (client.street || client.postalCodeCity) {
    return { street: client.street, postalCodeCity: client.postalCodeCity };
  }
  if (!client.address) {
    return { street: null, postalCodeCity: null };
  }
  const match = client.address.match(/^(.*?),\s*(\d{5}\s+.+)$/);
  if (match) {
    return { street: match[1].trim(), postalCodeCity: match[2].trim() };
  }
  return { street: client.address, postalCodeCity: null };
}
