# ScriptAlly — Standard Form Pattern ("Form 11")

This is the locked, canonical form layout for ScriptAlly. **Every form in the app uses this shell.** Only the contents vary: the header text, the corner animation/image, the fields, and the button label. The structure, colours, spacing, and components below never change.

---

## The shell — fixed structure

A single card, top to bottom:

1. **Outer card** — parchment surface `#fdfaf5` with a faint paper-grain texture, `14px` radius, soft layered shadow.
2. **Inset burgundy border** — a `1px` border in `rgba(124,58,42,0.28)`, sitting `6px` inside the card edges, `10px` radius. Frames the whole form like a mount around a print.
3. **Sage header band** — gradient `#dce0d9 → #d0d6cc`, sits inside the inset border, `8px 8px 0 0` radius, hairline sage rule along the bottom. Contains:
   - **Left:** an avatar chip + name block (see Header below)
   - **Right:** a corner motif — Lottie animation, image, or simple line SVG (varies per form)
4. **Body** — sits inside the inset border, holds the fields.
5. **Centred button** — soft pink, horizontally centred at the bottom of the body.

---

## Fixed colours (never change)

| Token | Hex | Use |
|---|---|---|
| Parchment surface | `#fdfaf5` | Card background |
| Sage band start | `#dce0d9` | Header gradient |
| Sage band end | `#d0d6cc` | Header gradient |
| Inset border | `rgba(124,58,42,0.28)` | The frame |
| Field background | `#ffffff` | Inputs, triggers |
| Field border | `#e0d5c8` | Inputs, triggers |
| Field focus border | `#8a9e88` (sage) | Focus state |
| Field focus ring | `rgba(138,158,136,0.12)` | Focus glow |
| Primary burgundy | `#7c3a2a` | Accents, chevrons, selected day |
| Button background | `#f5e2da` | The soft pink button + selected states |
| Button border | `#e8c8bc` | Button |
| Button hover bg | `#efd5ca` | Button hover |
| Label text | `#9c8878` | Field labels |
| Name text | `#2e3a2c` | Agent/header name |
| Agency / sub text | `#6a7e68` | Secondary header text |

## Fixed typography

- **Header name:** Playfair Display, 18px, weight 500, `#2e3a2c`
- **Header pre-label:** JetBrains Mono, 9px, uppercase, letter-spacing 0.08em, `#5a6e58`
- **Agency line:** Inter, 11px, weight 300, `#6a7e68`
- **Field labels:** JetBrains Mono, 10px, uppercase, letter-spacing 0.07em, `#9c8878`
- **Field values / inputs:** Inter, 13px, `#3a1c14`
- **Button:** JetBrains Mono, 11px, weight 500, letter-spacing 0.07em

## Fixed spacing

- Card radius 14px; inset border 6px inset, 10px radius
- Band padding `18px 24px 16px`, margin `6px 6px 0`
- Body padding `20px 22px 22px`, margin `0 6px 6px`
- Fields: 14px bottom margin, 9px radius, `10px 13px` padding
- Button: `11px 28px` padding, 10px radius, centred via a flex row

---

## The header (left side of band)

Always an **avatar chip + name block**:
- **Avatar chip:** 38px circle, parchment fill, `1px rgba(124,58,42,0.25)` border, initials in Playfair 14px burgundy.
- **Pre-label:** small mono caption — varies by form ("Logging a query to", "Recording a response from", "Closing your query with"...).
- **Name:** Playfair 18px.
- **Sub-line:** agency or context in 11px.

For forms not about a specific agent (e.g. manuscript, settings), the avatar may hold an icon instead of initials, and the name block holds the form title.

## The corner motif (right side of band) — THIS VARIES

The only deliberately variable visual. One of:
- **Lottie animation** (e.g. the pink-circle paper plane on the query form — circle recoloured to `#f5e2da`)
- **Static image** (background removed, recoloured to brand)
- **Simple line SVG** (single-weight `#3a1c14` stroke)

Sized ~`78–88px`, positioned `right` in the band, vertically centred, `z-index` below the header text. Each form type gets its own motif (query = plane; rejection = cross/seal; response = envelope; offer = laurel/seal; etc.).

---

## Components (build once, reuse everywhere)

### 1. Custom dropdown
Never use a native `<select>` (its option list can't be branded). Use the custom dropdown:
- Trigger styled exactly like a field, burgundy chevron that rotates 180° when open.
- Menu: parchment `#fdfaf5`, `10px` radius, soft shadow, opens with a 0.15s fade.
- Options: 7px radius, hover → white bg + burgundy text; selected → `#f5e2da` bg + burgundy + tick.
- Closes on outside click.

### 2. Custom date picker
Never use a native `<input type=date>`. Use the custom calendar popover:
- Trigger styled like a field with a burgundy calendar icon.
- Popover: parchment, Playfair month header, burgundy nav arrows, mono day-of-week row.
- Selected day = solid burgundy circle; today = sage ring; hover = pale pink.
- Month navigation; greyed adjacent-month days; closes on outside click.

### 3. The button
Soft pink (`#f5e2da` / border `#e8c8bc` / hover `#efd5ca`), JetBrains Mono, always **centred** in its own flex row.

---

## What varies per form vs what's locked

| Element | Locked | Varies |
|---|---|---|
| Card, inset border, band, body structure | ✅ | |
| All colours, typography, spacing | ✅ | |
| Dropdown & date picker components | ✅ | |
| Centred soft-pink button | ✅ (style) | label text |
| Header avatar + name block layout | ✅ | the name, pre-label, sub-line |
| Corner motif | | ✅ animation/image/SVG per form |
| Fields | | ✅ which fields, in what order |

---

## Reference implementation

The working reference is `scriptally-form11-plane.html` (the Log a Query form). Any new form is this file with the header text, corner motif, fields, and button label swapped.
