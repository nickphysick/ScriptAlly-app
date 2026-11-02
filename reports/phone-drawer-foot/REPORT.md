# Phone drawer: shorter privacy line, "See what it does" at the foot (2 Nov 2026)

## What changed (phone hero only; desktop unchanged)
- **The note** is now "We only email you about your invite. Privacy" (`HERO_PRIVACY_SHORT`), in Source Sans 3 at 12.5px, white at 50%, with Privacy underlined. The link goes where it did. The founding ticket further down keeps `FOUNDING_NOTE`.
  - `FoundingSignup` takes a `note` prop, defaulting to `FOUNDING_NOTE`, so the desktop hero and the ticket are untouched.
- **"See what it does ⌄"** moved to the drawer's foot, 22px under the sign-up, centred. It still scrolls to the Birds-eye heading.
- **The grab line is removed.** The drawer's bottom padding is 26px, and the form sits 18px under the QueryHawk panel.

## Measured at 390×844
| | Without the count | With the count |
|---|---|---|
| Panel → form | 18 | 18 |
| Button → note | **12** | 39.6 (the places line between) |
| Places line → note | — | **8** |
| Note → "See what it does" | 22 | 22 |
| "See what it does" → drawer foot | 26 | 26 |

Birds-eye heading bottom: 791 on a 390×844 screen without the count, about 813 with it. Both are in the first screen.

## One trade-off
**On phones the places line now takes no space until its count arrives.** It used to hold an invisible box of its own height so nothing moved when the count loaded. Your brief puts the note 12px under the button when there's no count, so that box is gone on phones. When the count lands, the drawer grows by about 32px and everything below shifts down once. Desktop still reserves its box.

## Locks
- **PRIV-5:** on the phone hero, a Privacy link sits within 80px below the submit button, with and without the count (8 / 40px measured), and the note reads the new line word for word. It was red on a592f328 (the old copy) and red under `PRIV5` (the link removed).
- **LW-7:** the item order now ends with the sign-up, then the link. The drawer still sizes to its content, and the heading and rule are in the first screen at 390×844 and 411×915. Red on a592f328 under the new order.
- **LW-1:** passes (Privacy is still the only route link).
- **Copy lock:** `HERO_PRIVACY_SHORT` word for word, and `FOUNDING_NOTE` unchanged.

## Pictures
`phone-{375x667,390x844,411x915}-{nocount,count}.png`. The "count" shots use a served count of 13 of 50.
