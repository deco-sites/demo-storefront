# Email authentication (SPF, DKIM, DMARC)

The storefront domain has no SPF, DKIM or DMARC records, so anyone can forge
`From:` addresses on it and legitimate store mail lands in spam. These are DNS
records, not application code — nothing in this repo sends email today
(`src/actions/newsletter/subscribe.ts` only writes a cookie), so the fix is
applied in the DNS zone that serves the storefront hostname.

This file is the runbook: what to publish now, and how to find the DKIM
selector once a mail provider is in place.

## Current state (checked 2026-08-05, `demo-storefront.decocms.com`)

| Query | Result |
|---|---|
| `TXT demo-storefront.decocms.com` | none (no SPF) |
| `TXT _dmarc.demo-storefront.decocms.com` | NXDOMAIN |
| `MX demo-storefront.decocms.com` | none |
| `TXT <selector>._domainkey.…` (`resend`, `google`, `default`, `s1`, `s2`, `k1`, `selector1`, `selector2`, `mail`, `dkim`) | NXDOMAIN for all |

The zone is on Cloudflare (`dave.ns.cloudflare.com`), so the records below go in
the Cloudflare DNS panel for `decocms.com` with the `demo-storefront` prefix.

Reproduce any of these checks without `dig`:

```sh
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=demo-storefront.decocms.com&type=TXT'
```

## Case A — the domain sends no email (current situation)

Publish a **null SPF** and a **reject DMARC**. This is the strongest and
cheapest posture: it tells receivers that nothing may send as this domain.

| Type | Name | Value |
|---|---|---|
| TXT | `demo-storefront` | `v=spf1 -all` |
| TXT | `_dmarc.demo-storefront` | `v=DMARC1; p=reject; rua=mailto:dmarc@decocms.com; aspf=s; adkim=s` |
| TXT | `*._domainkey.demo-storefront` | `v=DKIM1; p=` |

The wildcard `_domainkey` record with an empty `p=` is the DKIM equivalent of
`-all`: it declares every selector revoked. Delete it before onboarding a real
provider — it would otherwise shadow the provider's selector lookups.

DKIM has no "no selector" form other than that, which is why the task asks for
a selector: **a selector only exists once a sending provider issues a keypair.**
There is nothing to discover until Case B.

## Case B — the domain does send email

Do this when the newsletter action (or transactional mail: order confirmation,
password reset) is wired to a real provider.

### 1. Find the selector

The selector is assigned by the provider, not chosen by you. In order of
reliability:

1. **Provider dashboard.** Every provider shows the exact records to publish on
   its domain-verification screen. Known defaults:

   | Provider | Selector(s) | Record type |
   |---|---|---|
   | Resend | `resend` (or `<region>._domainkey`) | TXT |
   | SendGrid | `s1`, `s2` | CNAME → `sN.domainkey.uXXXX.wlYYY.sendgrid.net` |
   | Mailgun | `mailo`, `krs`, or `smtp` | TXT |
   | Amazon SES | three rotating tokens | CNAME → `<token>.dkim.amazonses.com` |
   | Postmark | `<hash>pm` | CNAME |
   | Google Workspace | `google` | TXT |
   | Microsoft 365 | `selector1`, `selector2` | CNAME → `…_domainkey.<tenant>.onmicrosoft.com` |
   | Klaviyo | `kl`, `kl2` | CNAME |
   | Mailchimp | `k1`, `k2` | CNAME |

2. **Read a real message.** Send one mail from the provider to any inbox, open
   the raw source, and read the `DKIM-Signature` header. `s=` is the selector
   and `d=` is the signing domain:

   ```
   DKIM-Signature: v=1; a=rsa-sha256; d=demo-storefront.decocms.com; s=resend; ...
   ```

   This is the authoritative answer — it is what receivers actually look up.

3. **Probe candidates over DNS.** Only works for selectors already published:

   ```sh
   for s in resend s1 s2 google selector1 selector2 k1 k2 default mail dkim smtp mailo krs pm; do
     r=$(curl -s -H 'accept: application/dns-json' \
       "https://cloudflare-dns.com/dns-query?name=$s._domainkey.demo-storefront.decocms.com&type=TXT" \
       | grep -o '"Status":[0-9]*')
     [ "$r" = '"Status":0' ] && echo "found selector: $s"
   done
   ```

   A `Status: 0` with an `Answer` array means the selector resolves; `Status: 3`
   (NXDOMAIN) means it does not exist. There is no way to enumerate selectors —
   DNS does not support listing subdomains — so probing can only confirm a
   guess, never discover an unknown one. Use step 1 or 2 for that.

### 2. Publish the records

Replace the Case A records with, using Resend as the example:

| Type | Name | Value |
|---|---|---|
| TXT | `demo-storefront` | `v=spf1 include:amazonses.com -all` (provider's own include) |
| TXT | `resend._domainkey.demo-storefront` | `v=DKIM1; k=rsa; p=<public key from provider>` |
| TXT | `_dmarc.demo-storefront` | `v=DMARC1; p=none; rua=mailto:dmarc@decocms.com; pct=100` |

Notes:

- Keep exactly **one** SPF TXT record. Two `v=spf1` records is a permanent
  failure (`permerror`); merge additional senders as extra `include:` terms, and
  stay under the 10-lookup limit.
- Copy the DKIM `p=` value verbatim. Cloudflare splits long TXT values into
  256-char strings automatically; don't add quotes or line breaks yourself.
- Start DMARC at `p=none` so reports flow without dropping mail, read the
  aggregate reports at `rua`, then ramp `p=quarantine` → `p=reject` once SPF and
  DKIM both align for all legitimate sources.
- The `From:` domain must match the DKIM `d=` domain for alignment. If mail is
  sent as `@decocms.com`, the records belong on the apex zone, not on the
  `demo-storefront` subdomain.

### 3. Verify

```sh
# SPF / DMARC / DKIM present
for q in demo-storefront.decocms.com _dmarc.demo-storefront.decocms.com \
         resend._domainkey.demo-storefront.decocms.com; do
  echo "== $q"
  curl -s -H 'accept: application/dns-json' \
    "https://cloudflare-dns.com/dns-query?name=$q&type=TXT"
  echo
done
```

Then send a test message and confirm the receiving side reports
`spf=pass`, `dkim=pass` and `dmarc=pass` in `Authentication-Results`.
