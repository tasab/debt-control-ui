# Client rules

## Currencies in the UI

Currency selectors show **the code only** — `UAH`, `USD`, `EUR`. A flag emoji
next to the code is fine; the full name ("Гривня", "US Dollar") is not, unless
explicitly asked for in a specific place.

**Why:** the code is what people call the currency at work, and it is the same
string in the input, in the list and in the amount next to it. The full name
doubles the row width, gets truncated mid-word on a phone, and tells nothing new
to someone who sees these four or five currencies every day.

## Placeholders

**Every input gets a placeholder.** Write it as a bare example of what goes in
the field ("ivan@example.com", "Каса на Хрещатику"), not as a repeat of the
label and not prefixed with "напр." — the grey text already reads as an
example.

**Amount fields are the exception: their placeholder is a bare `0`** (the
`AmountInput` default). The owner asked for it — an example like "1 500" read
as a hint of how much to enter. Never `0.00`: amount fields take whole numbers
only.

## Amounts are whole numbers

`AmountInput` accepts integers only (`whole` defaults to `true`) — nobody in this
business enters kopecks. Exchange rates and percentages are not amounts and keep
their decimals.

Two fields need no placeholder, because the browser already fills the space:
native pickers (`type="date"`, `type="time"`) and read-only fields that always
carry a value.
