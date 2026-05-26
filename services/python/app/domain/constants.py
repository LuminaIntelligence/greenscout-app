"""T-031 — Physical and financial constants for PV feasibility calculations.

Mirror of ``src/lib/calculations/constants.ts``. Both files MUST export
identical numeric values under identical key names — parity is enforced
by the T-034 fixture suite.

Sources tracked in ``docs/calc-sources.md``. The Mischwald factor is
provisional pending GreenScout confirmation — see ``DECISIONS.md``
"CO2 Mischwald-Faktor provisional".
"""

from typing import Final

#: kg CO2 avoided per kWh of PV electricity (German grid mix baseline).
CO2_KG_PER_KWH_PV: Final[float] = 0.474

#: Hectares of managed mixed forest required to sequester one tonne of
#: CO2 per year. PROVISIONAL — value pending GreenScout confirmation,
#: see docs/calc-sources.md.
CO2_HA_MISCHWALD_PER_T_PER_YEAR: Final[float] = 0.0177

#: UEFA standard pitch reference: 1 ha approx 1.28 football fields.
FOOTBALL_FIELDS_PER_HA: Final[float] = 1.28

#: Default lease payment EUR/kWp (SPEC §4.5 default).
DEFAULT_PACHT_EUR_PER_KWP: Final[int] = 100

#: Default lease contract duration in years (SPEC §4.5 / EEG-aligned).
DEFAULT_VERTRAGSLAUFZEIT_JAHRE: Final[int] = 20

#: Default Netzstrompreis-Sensitivität (ct/kWh) for the Wizard Step 5
#: mini-table. Per DECISIONS.md "Wizard step layout fixed".
#:
#: NOTE: these are ct/kWh values for documentation; the schema and
#: calculation modules expect EUR/kWh (35 ct == 0.35 EUR/kWh).
DEFAULT_SENSITIVITY_CT_KWH: Final[tuple[int, int, int]] = (35, 40, 45)
