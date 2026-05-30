"""German-locale number formatters used during PPTX context construction.

Defekt E1 (2026-05-30) — until this module landed, ct- and EUR-Werte
auf den Slides 5/9/12 wurden ohne Nachkommastellen gerendert
(``22 CENT``, ``28 netto ct/kWh``). SPEC §8.3 fordert deutsche
Zahlen-Konvention: Tausender-Punkt, Dezimal-Komma, IMMER zwei
Nachkommastellen für Money-/ct-Werte. Original-Template hatte z. B.
``20,00 CENT`` — die Formatter müssen das exakt reproduzieren.

The public API is three typed functions:

- :func:`format_eur` for Euro-Beträge — always two decimals.
- :func:`format_cent_per_kwh` for ct-Werte (CENT, ct/kWh) — always two decimals.
- :func:`format_integer_de` for ganzzahlige Werte (kWh, Module, m²) — no decimals.

The shared core, :func:`format_de_number`, swaps the en-locale
thousands ``,`` and decimal ``.`` for the German ``.`` / ``,``.
Quantisation uses :class:`decimal.Decimal` so float drift like
``7800.000000000004`` rounds to ``7.800,00`` instead of leaking an
artefact tail into the customer-facing PPTX.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal


def format_de_number(value: Decimal | float | int, decimals: int = 2) -> str:
    """Format a number in German locale with `.` thousands and `,` decimal.

    Always produces exactly ``decimals`` Nachkommastellen.

    Examples:
        >>> format_de_number(1234.56, decimals=2)
        '1.234,56'
        >>> format_de_number(1000, decimals=2)
        '1.000,00'
        >>> format_de_number(1234, decimals=0)
        '1.234'
        >>> format_de_number(Decimal("7800.000000000004"), decimals=2)
        '7.800,00'
    """
    # Normalise everything to Decimal so quantisation + ROUND_HALF_UP
    # apply uniformly (Python's f-string formatter on float uses banker's
    # rounding — surprising for German users who expect "kaufmännisches
    # Runden"). ``Decimal(str(float))`` is the standard idiom to convert
    # a float to its shortest-repr decimal representation; ``Decimal(int)``
    # is exact; ``Decimal(Decimal)`` is a no-op.
    if isinstance(value, Decimal):
        dec = value
    elif isinstance(value, int):
        dec = Decimal(value)
    else:
        dec = Decimal(str(value))

    quant = Decimal("1." + "0" * decimals) if decimals > 0 else Decimal("1")
    dec = dec.quantize(quant, rounding=ROUND_HALF_UP)
    # Float conversion is safe — we've already rounded to the digits we
    # render, so any IEEE-754 noise lies beyond the displayed precision.
    numeric: float = float(dec)

    formatted = f"{numeric:,.{decimals}f}"
    # Swap: en-locale ``1,234.56`` → de-locale ``1.234,56``.
    # Use an intermediate sentinel that can never collide with the
    # numeric output to avoid double-swap mishaps.
    return formatted.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def format_eur(value: Decimal | float | int) -> str:
    """German-locale Euro amount with IMMER zwei Nachkommastellen.

    Examples:
        >>> format_eur(1234.56)
        '1.234,56'
        >>> format_eur(1000)
        '1.000,00'
        >>> format_eur(0)
        '0,00'
    """
    return format_de_number(value, decimals=2)


def format_cent_per_kwh(value: Decimal | float | int) -> str:
    """German-locale ct/kWh-Wert mit IMMER zwei Nachkommastellen.

    Defekt E1 (2026-05-30): das war der ganze Punkt der Übung.
    Production zeigte ``22 CENT`` / ``28 netto ct/kWh`` — diese
    Funktion erzwingt ``22,00`` / ``28,00``.

    Examples:
        >>> format_cent_per_kwh(22)
        '22,00'
        >>> format_cent_per_kwh(28.5)
        '28,50'
        >>> format_cent_per_kwh(Decimal("0.35"))
        '0,35'
    """
    return format_de_number(value, decimals=2)


def format_integer_de(value: Decimal | float | int) -> str:
    """German-locale integer mit Tausendertrenner ``.`` — KEINE Nachkommastellen.

    Used for kWh-Werte, Modul-Anzahl, m², Hektar — also für integer-CO2-Werte.

    Examples:
        >>> format_integer_de(500)
        '500'
        >>> format_integer_de(1234)
        '1.234'
        >>> format_integer_de(3000000)
        '3.000.000'
    """
    return format_de_number(value, decimals=0)


__all__ = [
    "format_cent_per_kwh",
    "format_de_number",
    "format_eur",
    "format_integer_de",
]
