"""
dynaneuron
==========
Dynamic Spiking Neural Network library for inverse design of nanozymes.

Public API
----------
DynaDesigner       — top-level model (graph + physics)
VectorizedLIF      — spiking neuron layer
VectorizedSpikeGraph — recurrent spiking graph
PhysicsLayer       — Arrhenius + pH physics projection
MAMLWrapper        — MAML few-shot meta-learning wrapper
visualize_graph    — interactive PyVis HTML export
NanozymeDataLoader — molecular feature extraction pipeline

Example
-------
>>> import torch
>>> from dynaneuron import DynaDesigner
>>> model = DynaDesigner(num_neurons=5, input_dim=128, T=310.0, pH=4.5)
>>> k_cat, Km, Vmax = model(torch.randn(32, 128))
>>> print(k_cat.shape, Km.shape, Vmax.shape)
torch.Size([32]) torch.Size([32]) torch.Size([32])
"""

__version__ = "0.1.0"
__author__ = "dynaneuron contributors"

import torch
import torch.nn as nn

from .lif import VectorizedLIF
from .graph import VectorizedSpikeGraph
from .physics import PhysicsLayer
from .metalearn import MAMLWrapper
from .visualize import visualize_graph
from .data import NanozymeDataLoader


__all__ = [
    "DynaDesigner",
    "VectorizedLIF",
    "VectorizedSpikeGraph",
    "PhysicsLayer",
    "MAMLWrapper",
    "visualize_graph",
    "NanozymeDataLoader",
]


# ---------------------------------------------------------------------------
class DynaDesigner(nn.Module):
    """
    End-to-end inverse nanozyme design model.

    Pipeline:
        x (molecular fingerprints)
        └─► VectorizedSpikeGraph  →  firing_rates  (batch, num_neurons)
            └─► PhysicsLayer      →  k_cat, Km, Vmax  (batch,)

    Parameters
    ----------
    num_neurons : int
        Number of spiking neurons in the recurrent graph.
    input_dim : int
        Dimensionality of input molecular feature vectors.
    T : float
        Temperature in Kelvin (default 310.0 K = 37 °C).
    pH : float
        Reaction pH (default 7.4).
    enzyme_conc : float
        Total enzyme concentration [M] (default 1 µM = 1e-6).
    connection_density : float
        Initial synaptic connection density in the graph (default 0.3).

    Example
    -------
    >>> import torch
    >>> from dynaneuron import DynaDesigner
    >>> device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    >>> model = DynaDesigner(num_neurons=8, input_dim=1024, T=310.0, pH=4.5)
    >>> model = model.to(device)
    >>> x = torch.randn(16, 1024).to(device)
    >>> k_cat, Km, Vmax = model(x, time_steps=50)
    """

    def __init__(
        self,
        num_neurons: int,
        input_dim: int,
        T: float = 310.0,
        pH: float = 7.4,
        enzyme_conc: float = 1e-6,
        connection_density: float = 0.3,
    ):
        super().__init__()
        self.graph = VectorizedSpikeGraph(
            num_neurons=num_neurons,
            input_dim=input_dim,
            connection_density=connection_density,
        )
        self.physics = PhysicsLayer(
            num_experts=num_neurons,
            T=T,
            pH=pH,
            enzyme_conc=enzyme_conc,
        )

    def forward(
        self,
        x: torch.Tensor,
        time_steps: int = 50,
    ):
        """
        Parameters
        ----------
        x : torch.Tensor, shape (batch, input_dim)
        time_steps : int

        Returns
        -------
        k_cat : torch.Tensor, shape (batch,)
        Km    : torch.Tensor, shape (batch,)
        Vmax  : torch.Tensor, shape (batch,)
        """
        firing_rates = self.graph(x, time_steps=time_steps)
        k_cat, Km, Vmax = self.physics(firing_rates)
        return k_cat, Km, Vmax

    def extra_repr(self) -> str:
        return (
            f"num_neurons={self.graph.num_neurons}, "
            f"input_dim={self.graph.input_dim}"
        )
