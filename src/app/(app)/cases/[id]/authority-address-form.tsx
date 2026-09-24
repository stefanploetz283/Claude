"use client";

import { useActionState } from "react";
import { updateCaseAuthorityFields } from "../actions";
import { inputCls, labelCls, buttonOutlineCls } from "../case-ui";

export function AuthorityAddressForm({
  caseId,
  authority,
  authorityStreet,
  authorityPostalCodeCity,
}: {
  caseId: string;
  authority: string;
  authorityStreet: string | null;
  authorityPostalCodeCity: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateCaseAuthorityFields, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5 text-sm">
        <span className={labelCls}>Zuständiges Jugendamt/Auftraggeber (ASD)</span>
        <input name="authority" defaultValue={authority} required className={`w-full ${inputCls}`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className={labelCls}>Rechnungsadresse: Straße</span>
        <input name="authorityStreet" defaultValue={authorityStreet ?? ""} placeholder="Musterstraße 12" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className={labelCls}>Rechnungsadresse: PLZ / Ort</span>
        <input
          name="authorityPostalCodeCity"
          defaultValue={authorityPostalCodeCity ?? ""}
          placeholder="12345 Musterstadt"
          className={inputCls}
        />
      </label>
      <button type="submit" disabled={pending} className={buttonOutlineCls}>
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
