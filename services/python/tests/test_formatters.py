"""Tests for ``app.services.formatters`` — Defekt E1 (2026-05-30).

The Production-Symptom was that ct-Werte auf Slides 5/9/12 ohne
Nachkommastellen gerendert wurden (``22 CENT`` / ``28 netto ct/kWh``).
SPEC §8.3 fordert ``22,00 CENT`` / ``28,00`` — IMMER zwei
Nachkommastellen für Money-/ct-Werte, mit deutscher Locale
(Tausender-Punkt, Dezimal-Komma).

Diese Test-Suite ist die anti-regression baseline: jede zukünftige
Änderung an den Formattern muss diese Garantien einhalten.
"""

from __future__ import annotations

from decimal import Decimal

import pytest

from app.services.formatters import (
    format_cent_per_kwh,
    format_de_number,
    format_eur,
    format_integer_de,
)


class TestFormatDeNumberCore:
    """The shared core that does the en→de locale swap + quantisation."""

    @pytest.mark.parametrize(
        ("value", "decimals", "expected"),
        [
            # Float-Drift-Schutz via Decimal-Quantisation.
            (Decimal("7800.000000000004"), 2, "7.800,00"),
            (Decimal("7800.005"), 2, "7.800,01"),  # ROUND_HALF_UP
            (Decimal("7800.004"), 2, "7.800,00"),
            # Int + float pass-through.
            (1234, 2, "1.234,00"),
            (1234.56, 2, "1.234,56"),
            (1234, 0, "1.234"),
            # Edge cases.
            (0, 2, "0,00"),
            (0.0, 2, "0,00"),
            (0, 0, "0"),
        ],
    )
    def test_swaps_separators_and_quantises(
        self,
        value: Decimal | float | int,
        decimals: int,
        expected: str,
    ) -> None:
        assert format_de_number(value, decimals=decimals) == expected


class TestFormatEur:
    """Defekt E1 anti-regression — EUR-Werte IMMER mit zwei Nachkommastellen."""

    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (1234.56, "1.234,56"),
            # Integer-Input → 2 Nachkomma erzwungen.
            (1000, "1.000,00"),
            (1000.0, "1.000,00"),
            (0.5, "0,50"),
            (0, "0,00"),
            # Float-Drift gerundet (echtes Symptom aus der Pipeline).
            (Decimal("7800.000000000004"), "7.800,00"),
            # Mehrere Tausender.
            (156000, "156.000,00"),
            (1234567.89, "1.234.567,89"),
            # Negative Beträge (defensive, sollte nicht passieren — aber sauber).
            (-1234.56, "-1.234,56"),
        ],
    )
    def test_format_eur_german_locale_two_decimals(
        self, value: Decimal | float | int, expected: str
    ) -> None:
        assert format_eur(value) == expected


class TestFormatCentPerKwh:
    """Defekt E1 anti-regression — ct-Werte IMMER mit zwei Nachkommastellen.

    Production-Symptom: Slide 5 ``22 CENT``, Slide 9 ``28 netto ct/kWh``,
    Slide 12 wahlweise. Erwartet: ``22,00`` / ``28,00``.
    """

    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            # Production-Beispiele aus dem Defekt-Report.
            (22, "22,00"),
            (22.0, "22,00"),
            (28, "28,00"),
            (28.0, "28,00"),
            # Echte Nachkomma-Werte.
            (28.5, "28,50"),
            (35.0, "35,00"),
            (40.0, "40,00"),
            (45.0, "45,00"),
            # Decimal-Input (z. B. von EUR/kWh * 100).
            (Decimal("0.35"), "0,35"),
            (Decimal("20.00"), "20,00"),
            # Edge.
            (0, "0,00"),
        ],
    )
    def test_format_cent_per_kwh_two_decimals_always(
        self, value: Decimal | float | int, expected: str
    ) -> None:
        assert format_cent_per_kwh(value) == expected


class TestFormatIntegerDe:
    """Integer-Werte mit Tausendertrenner, ohne Nachkomma."""

    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (500, "500"),
            (1234, "1.234"),
            (1428, "1.428"),
            (3000000, "3.000.000"),
            (0, "0"),
            # Float-Input wird gerundet (kein "1.234,00"-Tail).
            (1234.4, "1.234"),
            (1234.5, "1.235"),  # ROUND_HALF_UP via Decimal.
            # Decimal-Input.
            (Decimal("2856"), "2.856"),
        ],
    )
    def test_format_integer_de_no_decimals(
        self, value: Decimal | float | int, expected: str
    ) -> None:
        assert format_integer_de(value) == expected


# --------------------------------------------------------------------- anti-regression


def test_anti_regression_e1_cent_values_have_two_decimals() -> None:
    """Defekt E1 (2026-05-30): CENT-Werte MÜSSEN IMMER zwei Nachkommastellen
    haben. Bricht sofort wenn jemand wieder ``f'{value}'`` ohne :.2f nutzt
    oder die Default-Decimal-Anzahl in format_cent_per_kwh ändert.
    """
    # Production-Symptome wären "22" / "28".
    assert format_cent_per_kwh(22) == "22,00"
    assert format_cent_per_kwh(28) == "28,00"
    # Generelle Garantie: jeder Wert endet auf ",XX".
    assert format_cent_per_kwh(22).endswith(",00")
    assert format_cent_per_kwh(35.0).endswith(",00")
    assert "," in format_cent_per_kwh(22)


def test_anti_regression_e1_eur_values_have_two_decimals() -> None:
    """Defekt E1 (2026-05-30): EUR-Werte MÜSSEN ebenfalls zwei
    Nachkommastellen haben — auch wenn der Wert ganzzahlig ist.
    Hardcoded gegen die Versuchung, ganzzahlige Beträge wieder ohne
    Komma zu rendern.
    """
    assert format_eur(1000) == "1.000,00"
    assert format_eur(50000) == "50.000,00"  # Pacht-Wert Slide 13.
    assert format_eur(206000) == "206.000,00"  # gesamtvorteil Slide 13.
    assert format_eur(1000).endswith(",00")
    assert format_eur(50000).endswith(",00")
    assert "," in format_eur(50000)


def test_anti_regression_e1_thousands_separator_is_dot_not_comma() -> None:
    """Deutsche Locale: Tausendertrenner ist ``.``, NICHT ``,`` — und
    Dezimaltrenner ist ``,``, NICHT ``.``. Bricht den Default-Python-Float-
    f-String-Output sofort, falls jemand den Swap vergisst.
    """
    # Million → drei Tausender-Punkte.
    result = format_eur(1234567.89)
    assert result == "1.234.567,89"
    # Punkt nur als Tausendertrenner, Komma als Dezimaltrenner.
    assert result.count(".") == 2
    assert result.count(",") == 1
    # Dezimal-Komma steht VOR den letzten beiden Ziffern.
    assert result[-3] == ","


def test_anti_regression_e1_zero_is_not_empty() -> None:
    """Defensive: 0 EUR / 0 ct / 0 kWh muss explizit ``0,00`` / ``0`` sein,
    nicht ``""`` oder ``None``. Sonst kommt das hängende ``EUR``-Suffix
    aus dem Template wieder zum Vorschein.
    """
    assert format_eur(0) == "0,00"
    assert format_cent_per_kwh(0) == "0,00"
    assert format_integer_de(0) == "0"


def test_anti_regression_e1_float_drift_does_not_leak() -> None:
    """Production-Pipeline reicht teilweise Decimal mit Float-Drift
    durch (z. B. ``Decimal('7800.000000000004')``). Der Formatter muss
    sauber quantisieren, nicht das Tail rendern.
    """
    assert format_eur(Decimal("7800.000000000004")) == "7.800,00"
    assert format_cent_per_kwh(Decimal("22.000000000003")) == "22,00"
    assert format_integer_de(Decimal("1428.0000001")) == "1.428"
