"""
dynaneuron/physics.py
---------------------
Physics-informed layer mapping firing rates to nanozyme kinetic parameters.

Uses:
  - Arrhenius equation for k_cat (temperature-dependent catalytic rate)
  - Michaelis-Menten approximation for Km via free-energy (dG)
  - pH-dependent activity factor via two ionisation pKa constants

All parameters are predicted by learned linear projections on top of the
firing-rate representation, then sigmoid-scaled into physically meaningful ranges.
"""

import torch
import torch.nn as nn


class PhysicsLayer(nn.Module):
    """
    Physics-informed projection from neural firing rates to enzyme kinetics.

    Outputs
    -------
    k_cat : (batch,) — catalytic rate constant [s^-1], via Arrhenius
    Km    : (batch,) — Michaelis constant [M], via free-energy relation
    Vmax  : (batch,) — maximum reaction velocity [M/s]

    Physical model
    --------------
    Arrhenius:
        k_cat = A * exp(-Ea / (R * T))
    Free-energy Km:
        Km = exp(dG / (R * T))
    pH factor (bell-shaped activity):
        pH_factor = 1 / (1 + 10^(pKa1 - pH) + 10^(pH - pKa2))
    Vmax:
        Vmax = k_cat * [E]_total * pH_factor

    Parameter ranges (sigmoid-scaled)
    ----------------------------------
    Ea   : 20 – 150 kJ/mol
    logA : 6  – 12  (log10)
    dG   : -50 – 10 kJ/mol
    pKa1 : 2  – 10
    pKa2 : 2  – 10

    Parameters
    ----------
    num_experts : int
        Input size (number of neurons / firing-rate features).
    T : float
        Temperature in Kelvin (default 310 K = 37 °C).
    pH : float
        Reaction pH (default 7.4).
    enzyme_conc : float
        Total enzyme concentration [M] (default 1 µM).

    Example
    -------
    >>> import torch
    >>> from dynaneuron.physics import PhysicsLayer
    >>> layer = PhysicsLayer(num_experts=8, T=310.0, pH=4.5)
    >>> rates = torch.rand(16, 8)          # firing rates (batch=16, neurons=8)
    >>> k_cat, Km, Vmax = layer(rates)
    >>> print(k_cat.shape, Km.shape, Vmax.shape)
    torch.Size([16]) torch.Size([16]) torch.Size([16])
    """

    # Physical constant
    R_kJ = 8.314e-3  # kJ / (mol · K)

    def __init__(
        self,
        num_experts: int,
        T: float = 310.0,
        pH: float = 7.4,
        enzyme_conc: float = 1e-6,
    ):
        super().__init__()
        self.num_experts = num_experts
        self.T = T
        self.pH = pH
        self.enzyme_conc = enzyme_conc

        # Learned projections (num_experts -> 1 scalar per sample)
        self.Ea_proj   = nn.Linear(num_experts, 1)
        self.logA_proj = nn.Linear(num_experts, 1)
        self.dG_proj   = nn.Linear(num_experts, 1)
        self.pKa1_proj = nn.Linear(num_experts, 1)
        self.pKa2_proj = nn.Linear(num_experts, 1)

        # Physical parameter ranges
        self.Ea_min,   self.Ea_max   = 20.0,  150.0
        self.logA_min, self.logA_max = 6.0,   12.0
        self.dG_min,   self.dG_max   = -50.0, 10.0
        self.pKa_min,  self.pKa_max  = 2.0,   10.0

    # ------------------------------------------------------------------
    @staticmethod
    def _scale(raw: torch.Tensor, lo: float, hi: float) -> torch.Tensor:
        """Sigmoid-scale raw projection into [lo, hi]."""
        return lo + (hi - lo) * torch.sigmoid(raw)

    # ------------------------------------------------------------------
    def forward(self, firing_rates: torch.Tensor):
        """
        Parameters
        ----------
        firing_rates : torch.Tensor, shape (batch, num_experts)

        Returns
        -------
        k_cat : torch.Tensor, shape (batch,)
        Km    : torch.Tensor, shape (batch,)
        Vmax  : torch.Tensor, shape (batch,)
        """
        RT = self.R_kJ * self.T  # scalar

        # --- Activation energy [kJ/mol] ---
        Ea = self._scale(self.Ea_proj(firing_rates), self.Ea_min, self.Ea_max)
        # --- Pre-exponential factor (log10) ---
        logA = self._scale(self.logA_proj(firing_rates), self.logA_min, self.logA_max)
        A = 10.0 ** logA
        # --- Free energy of binding [kJ/mol] ---
        dG = self._scale(self.dG_proj(firing_rates), self.dG_min, self.dG_max)

        # --- Arrhenius k_cat ---
        k_cat = A * torch.exp(-Ea / RT)  # (batch, 1)

        # --- Km from free energy ---
        Km = torch.exp(dG / RT)          # (batch, 1)

        # --- pH-dependent activity factor ---
        pKa1 = self._scale(self.pKa1_proj(firing_rates), self.pKa_min, self.pKa_max)
        pKa2 = self._scale(self.pKa2_proj(firing_rates), self.pKa_min, self.pKa_max)
        pH_factor = 1.0 / (
            1.0
            + 10.0 ** (pKa1 - self.pH)
            + 10.0 ** (self.pH - pKa2)
        )                                # (batch, 1)

        # --- Vmax ---
        Vmax = k_cat * self.enzyme_conc * pH_factor  # (batch, 1)

        return k_cat.squeeze(-1), Km.squeeze(-1), Vmax.squeeze(-1)

    # ------------------------------------------------------------------
    def extra_repr(self) -> str:
        return (
            f"num_experts={self.num_experts}, "
            f"T={self.T} K, pH={self.pH}, "
            f"enzyme_conc={self.enzyme_conc:.2e} M"
        )
