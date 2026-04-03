"""
dynaneuron/lif.py
-----------------
Vectorized Leaky Integrate-and-Fire (LIF) neuron model.

All operations are fully batched — no Python loops over individual neurons.
Supports optional learnable per-neuron tau and V_th parameters.
GPU-compatible via .to(device).
"""

import torch
import torch.nn as nn


class VectorizedLIF(nn.Module):
    """
    Vectorized Leaky Integrate-and-Fire (LIF) neuron layer.

    Implements the standard LIF update rule:
        dV/dt = (-(V - V_reset) + I_total) / tau
    discretised with Euler integration:
        V[t] = V[t-1] + (dt / tau) * (-(V[t-1] - V_reset) + I_total)

    A spike is emitted when V >= V_th, after which V is reset to V_reset.

    Parameters
    ----------
    num_neurons : int
        Number of neurons in the layer.
    tau : float
        Membrane time constant in seconds (default: 20e-3 = 20 ms).
    V_th : float
        Spike threshold (default: 1.0).
    V_reset : float
        Reset potential after spike (default: 0.0).
    dt : float
        Simulation time step in seconds (default: 1e-3 = 1 ms).
    learnable_params : bool
        If True, tau and V_th become per-neuron trainable parameters
        (stored in log-space for positivity). Otherwise registered as buffers.

    Inputs / Outputs
    ----------------
    forward(I_total, V_prev, spikes_prev) -> (V, spikes)
        I_total    : (batch, num_neurons) — injected current
        V_prev     : (batch, num_neurons) — membrane potential at t-1
        spikes_prev: (batch, num_neurons) — spike vector at t-1 (unused here,
                      kept for API compatibility with refractory extensions)
        V          : (batch, num_neurons) — updated membrane potential
        spikes     : (batch, num_neurons) — binary spike vector {0, 1}

    Example
    -------
    >>> import torch
    >>> from dynaneuron.lif import VectorizedLIF
    >>> lif = VectorizedLIF(num_neurons=4, tau=20e-3, V_th=1.0, dt=1e-3)
    >>> V = torch.zeros(8, 4)
    >>> spikes = torch.zeros(8, 4)
    >>> I = torch.ones(8, 4) * 2.0
    >>> V, spikes = lif(I, V, spikes)
    >>> print(V.shape, spikes.shape)
    torch.Size([8, 4]) torch.Size([8, 4])
    """

    def __init__(
        self,
        num_neurons: int,
        tau: float = 20e-3,
        V_th: float = 1.0,
        V_reset: float = 0.0,
        dt: float = 1e-3,
        learnable_params: bool = False,
    ):
        super().__init__()
        self.num_neurons = num_neurons
        self.V_reset = V_reset
        self.dt = dt

        log_tau = torch.log(torch.tensor(tau, dtype=torch.float32)).repeat(num_neurons)
        log_V_th = torch.log(torch.tensor(V_th, dtype=torch.float32)).repeat(num_neurons)

        if learnable_params:
            self.log_tau = nn.Parameter(log_tau)
            self.log_V_th = nn.Parameter(log_V_th)
        else:
            self.register_buffer("log_tau", log_tau)
            self.register_buffer("log_V_th", log_V_th)

    # ------------------------------------------------------------------
    @property
    def tau(self) -> torch.Tensor:
        """Per-neuron membrane time constants (always positive)."""
        return torch.exp(self.log_tau).clamp(min=1e-3)

    @property
    def V_th(self) -> torch.Tensor:
        """Per-neuron spike thresholds (always positive)."""
        return torch.exp(self.log_V_th).clamp(min=0.1)

    # ------------------------------------------------------------------
    def forward(
        self,
        I_total: torch.Tensor,
        V_prev: torch.Tensor,
        spikes_prev: torch.Tensor,
    ):
        """
        Single-step LIF update.

        Parameters
        ----------
        I_total : torch.Tensor, shape (batch, num_neurons)
        V_prev  : torch.Tensor, shape (batch, num_neurons)
        spikes_prev : torch.Tensor, shape (batch, num_neurons)

        Returns
        -------
        V      : torch.Tensor, shape (batch, num_neurons)
        spikes : torch.Tensor, shape (batch, num_neurons), values in {0.0, 1.0}
        """
        tau = self.tau.unsqueeze(0)        # (1, num_neurons) — broadcast over batch
        V_th = self.V_th.unsqueeze(0)      # (1, num_neurons)

        dV = (self.dt / tau) * (-(V_prev - self.V_reset) + I_total)
        V = V_prev + dV

        # Spike where threshold crossed
        spikes = (V >= V_th).float()

        # Reset fired neurons
        V = torch.where(
            spikes.bool(),
            torch.full_like(V, self.V_reset),
            V,
        )
        return V, spikes

    # ------------------------------------------------------------------
    def extra_repr(self) -> str:
        return (
            f"num_neurons={self.num_neurons}, "
            f"V_reset={self.V_reset}, dt={self.dt}"
        )
