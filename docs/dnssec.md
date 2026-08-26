# DNSSEC for `decocms.com`

DNS answers for `demo-storefront.decocms.com` are unauthenticated: a resolver
cannot tell a genuine answer from a forged one, which leaves the hostname open
to spoofing and cache poisoning. DNSSEC fixes this by signing the zone, but it
is a **zone setting in the DNS provider**, not application code — nothing in
this repository controls it (same situation as
[`email-authentication.md`](./email-authentication.md)). This file is the
runbook.

## Current state (checked 2026-08-26)

| Query | Result |
|---|---|
| `DNSKEY demo-storefront.decocms.com` (`do=1`) | `AD: false`, no answer |
| `DNSKEY decocms.com` (`do=1`) | `AD: false`, no answer |
| `DS decocms.com` at `.com` | no DS record (NSEC3 proof of absence) |

Reproduce without `dig`:

```sh
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=demo-storefront.decocms.com&type=DNSKEY&do=1'
```

`"AD": false` plus an empty `Answer` means the zone is not signed. Note the
`.com` DS lookup is the decisive one: without a DS record at the parent there is
no chain of trust even if the zone itself carried DNSKEYs.

The zone is on Cloudflare (`dave.ns.cloudflare.com`), so signing happens in the
Cloudflare DNS panel for `decocms.com`; the DS record is published at the
registrar of `decocms.com`.

## Before you start

- `decocms.com` is shared by many hosts and subdomains beyond
  `demo-storefront`. Enabling DNSSEC signs the **whole zone** — announce it to
  the other teams using the zone first.
- Publishing a wrong or stale DS record breaks resolution for the entire domain
  (`SERVFAIL` everywhere, not a partial outage). Copy the DS values verbatim
  from Cloudflare; never hand-type them.
- Do not change nameservers, and do not disable DNSSEC at Cloudflare, while a DS
  record is published at the registrar. Always remove the DS record first and
  wait for the parent TTL to expire, or the domain goes dark.

## Steps

### 1. Enable signing at Cloudflare

Cloudflare dashboard → zone `decocms.com` → **DNS** → **Settings** → **DNSSEC** →
*Enable DNSSEC*. Cloudflare generates the keys (it is a live-signing provider —
there is no KSK/ZSK material for us to hold or rotate) and shows the DS record.
Status will read *Pending* until the DS record exists at the parent.

### 2. Copy the DS record

Cloudflare shows these fields — record all of them:

| Field | Example shape |
|---|---|
| Key tag | `2371` |
| Algorithm | `13` (ECDSA Curve P-256 with SHA-256) |
| Digest type | `2` (SHA-256) |
| Digest | 64 hex chars |
| DS record | `decocms.com. 3600 IN DS 2371 13 2 <digest>` |

### 3. Publish the DS record at the registrar

Registrar panel for `decocms.com` → DNSSEC / *Add DS record*. Paste the four
fields, or the whole DS line if the registrar accepts it. Some registrars ask
for a DNSKEY instead of a DS — if so, use the *"Enable DNSSEC (DNSKEY)"* variant
Cloudflare offers on the same screen rather than converting it yourself.

Exactly one DS record for the current key. Remove any leftover DS records from
previous providers.

### 4. Wait and confirm

Cloudflare flips DNSSEC status to **Active** once it sees the DS at the parent.
`.com` publishes zone changes within ~15 minutes, but resolver caches and the
900s `.com` negative TTL mean full propagation can take a few hours. Do not
consider the task done before the checks below pass.

## Verify

```sh
# 1. Parent has the DS record
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=decocms.com&type=DS&do=1'

# 2. Answers are authenticated — expect "AD": true
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=demo-storefront.decocms.com&type=DNSKEY&do=1'
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=demo-storefront.decocms.com&type=A&do=1'
```

With `dig`:

```sh
dig +dnssec decocms.com DNSKEY      # expect RRSIG alongside the DNSKEYs
dig +dnssec demo-storefront.decocms.com   # expect RRSIG + "flags: ... ad"
```

Then run the full chain-of-trust check at
<https://dnssec-analyzer.verisignlabs.com/?domain=decocms.com> and confirm every
step is green (root → `com` → `decocms.com`).

`AD: true` on a `do=1` query is the acceptance criterion. A `SERVFAIL` on any of
the above after enabling means the DS record does not match the live key —
remove the DS at the registrar immediately to restore resolution, then redo
step 2.

## Log

| Date | Action | DS key tag | Validated with |
|---|---|---|---|
| 2026-08-26 | Audited: zone unsigned, no DS at `.com` | — | `cloudflare-dns.com` DoH, `do=1` |
| _(pending)_ | Enable DNSSEC at Cloudflare + publish DS | | |

Append a row here when the change is applied, so the next audit can tell an
unsigned zone from a broken chain.
