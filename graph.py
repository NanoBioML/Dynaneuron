"""
dynaneuron/graph.py
-------------------
Vectorized recurrent spiking graph with structural plasticity.

The graph projects external input through a linear layer, then recurrently
passes spikes through a masked weight matrix for `time_steps` iterations.
Structural plasticity is supported via prune_connections() and grow_connections().
"""

import torch
import torch.nn as nn

from .lif import VectorizedLIF


class VectorizedSpikeGraph(nn.Module):
    """
    Recurrent spiking graph with dynamic structural plasticity.

    Architecture:
        1. Linear projection:  (batch, input_dim) -> (batch, num_neurons)
        2. Recurrent loop for `time_steps` steps:
               I_internal = spikes @ W_eff.T          # recurrent current
               I_total    = I_ext + I_internal
               V, spikes  = LIF(I_total, V, spikes)
        3. Output: mean firing rate over time        (batch, num_neurons)

    Parameters
    ----------
    num_neurons : int
        Number of spiking neurons.
    input_dim : int
        Dimensionality of external input features.
    connection_density : float
        Initial fraction of non-self connections that are active (0–1).

    Example
    -------
    >>> import torch
    >>> from dynaneuron.graph import VectorizedSpikeGraph
    >>> g = VectorizedSpikeGraph(num_neurons=8, input_dim=64)
    >>> x = torch.randn(16, 64)
    >>> rates = g(x, time_steps=30)
    >>> print(rates.shape)   # (16, 8)
    torch.Size([16, 8])
    """

    def __init__(
        self,
        num_neurons: int,
        input_dim: int,
        connection_density: float = 0.3,
    ):
        super().__init__()
        self.num_neurons = num_neurons
        self.input_dim = input_dim

        # External-input projection
        self.input_proj = nn.Linear(input_dim, num_neurons)

        # Recurrent weight matrix (learnable)
        self.adj_weights = nn.Parameter(
            torch.randn(num_neurons, num_neurons) * 0.01
        )

        # Binary connectivity mask (not learnable — managed by plasticity methods)
        mask = (torch.rand(num_neurons, num_neurons) < connection_density).float()
        mask.fill_diagonal_(0.0)  # no self-connections
        self.register_buffer("mask", mask)

        # LIF layer
        self.lif = VectorizedLIF(num_neurons)

    # ------------------------------------------------------------------
    def forward(self, external_inputs: torch.Tensor, time_steps: int = 50):
        """
        Run the spiking graph for `time_steps` and return mean firing rates.

        Parameters
        ----------
        external_inputs : torch.Tensor, shape (batch, input_dim)
        time_steps : int
            Number of simulation steps.

        Returns
        -------
        firing_rates : torch.Tensor, shape (batch, num_neurons)
            Mean spike count per neuron across time.
        """
        batch_size = external_inputs.shape[0]
        device = external_inputs.device

        # Project external input once — same for all time steps
        I_ext = self.input_proj(external_inputs)          # (batch, num_neurons)

        # Initialise state
        V = torch.zeros(batch_size, self.num_neurons, device=device)
        spikes = torch.zeros(batch_size, self.num_neurons, device=device)

        spike_history = []
        effective_weights = self.adj_weights * self.mask  # (num_neurons, num_neurons)

        for _ in range(time_steps):
            # Recurrent current: (batch, num_neurons) @ (num_neurons, num_neurons)
            I_internal = torch.matmul(spikes, effective_weights.T)
            I_total = I_ext + I_internal
            V, spikes = self.lif(I_total, V, spikes)
            spike_history.append(spikes)

        # Stack: (time_steps, batch, num_neurons) -> mean over time
        firing_rates = torch.stack(spike_history, dim=0).mean(dim=0)  # (batch, num_neurons)
        return firing_rates

    # ------------------------------------------------------------------
    def prune_connections(self, threshold: float = 0.05):
        """
        Remove weak connections from the mask.

        Any connection with |weight| <= threshold is masked out.

        Parameters
        ----------
        threshold : float
            Absolute weight magnitude below which connections are removed.
        """
        with torch.no_grad():
            new_mask = (self.adj_weights.abs() > threshold).float()
            new_mask.fill_diagonal_(0.0)
            self.mask.data = new_mask

    # ------------------------------------------------------------------
    def grow_connections(self, growth_rate: float = 0.01):
        """
        Randomly add new connections to the graph.

        Each currently absent connection is activated with probability
        `growth_rate`.

        Parameters
        ----------
        growth_rate : float
            Probability of activating each absent connection per call.
        """
        with torch.no_grad():
            new_conn = (torch.rand_like(self.mask) < growth_rate).float()
            new_mask = (self.mask + new_conn).clamp(0.0, 1.0)
            new_mask.fill_diagonal_(0.0)
            self.mask.data = new_mask

    # ------------------------------------------------------------------
    def connection_density(self) -> float:
        """Return current fraction of active non-self connections."""
        n = self.num_neurons
        total = n * (n - 1)
        return float(self.mask.sum().item()) / total if total > 0 else 0.0

    # ------------------------------------------------------------------
    def extra_repr(self) -> str:
        return (
            f"num_neurons={self.num_neurons}, "
            f"input_dim={self.input_dim}, "
            f"density={self.connection_density():.3f}"
        )
