"""
dynaneuron/visualize.py
-----------------------
Interactive visualization utilities for the spiking graph.

Requires: networkx, pyvis
Install:  pip install networkx pyvis
"""

from __future__ import annotations

from typing import Optional, List

import torch


# ---------------------------------------------------------------------------
# Optional imports — graceful fallback if not installed
# ---------------------------------------------------------------------------
try:
    import networkx as nx
    _NX_AVAILABLE = True
except ImportError:
    _NX_AVAILABLE = False

try:
    from pyvis.network import Network
    _PYVIS_AVAILABLE = True
except ImportError:
    _PYVIS_AVAILABLE = False


# ---------------------------------------------------------------------------
def visualize_graph(
    adj_weights: torch.Tensor,
    mask: torch.Tensor,
    neuron_labels: Optional[List[str]] = None,
    filename: str = "graph.html",
    weight_scale: float = 10.0,
    min_weight_display: float = 0.01,
    height: str = "600px",
    width: str = "100%",
) -> Optional[str]:
    """
    Export the spiking graph as an interactive HTML file using PyVis.

    Nodes represent neurons; directed edges represent active synaptic
    connections. Edge width is proportional to |weight|.

    Parameters
    ----------
    adj_weights : torch.Tensor, shape (num_neurons, num_neurons)
        Raw (unmasked) weight matrix.
    mask : torch.Tensor, shape (num_neurons, num_neurons)
        Binary connectivity mask (1 = active connection).
    neuron_labels : list of str, optional
        Display labels for each neuron. Defaults to "N0", "N1", …
    filename : str
        Output HTML file path (default "graph.html").
    weight_scale : float
        Multiplier for edge visual width (default 10.0).
    min_weight_display : float
        Edges with |weight| below this value are not drawn (default 0.01).
    height : str
        Canvas height for PyVis (default "600px").
    width : str
        Canvas width for PyVis (default "100%").

    Returns
    -------
    str or None
        The output filename on success, None if dependencies are missing.

    Raises
    ------
    ImportError
        If networkx or pyvis are not installed.

    Example
    -------
    >>> import torch
    >>> from dynaneuron import VectorizedSpikeGraph, visualize_graph
    >>> g = VectorizedSpikeGraph(num_neurons=6, input_dim=32)
    >>> visualize_graph(g.adj_weights, g.mask, filename="my_graph.html")
    """
    if not _NX_AVAILABLE:
        raise ImportError(
            "networkx is required for graph visualization. "
            "Install with: pip install networkx"
        )
    if not _PYVIS_AVAILABLE:
        raise ImportError(
            "pyvis is required for graph visualization. "
            "Install with: pip install pyvis"
        )

    adj = adj_weights.detach().cpu().numpy()
    m   = mask.detach().cpu().numpy()
    n   = adj.shape[0]

    if neuron_labels is None:
        neuron_labels = [f"N{i}" for i in range(n)]

    # ---- Build NetworkX DiGraph ----
    G = nx.DiGraph()
    for i in range(n):
        G.add_node(i, label=neuron_labels[i], title=neuron_labels[i])

    for i in range(n):
        for j in range(n):
            if m[i, j] > 0 and abs(adj[i, j]) > min_weight_display:
                w = float(abs(adj[i, j]))
                color = "#e74c3c" if adj[i, j] > 0 else "#3498db"  # red=exc, blue=inh
                G.add_edge(i, j, value=w, color=color, title=f"w={adj[i,j]:.4f}")

    # ---- PyVis Network ----
    net = Network(height=height, width=width, directed=True, bgcolor="#1a1a2e")
    net.from_nx(G)

    # Scale edge widths
    for edge in net.edges:
        edge["width"] = edge.get("value", 0.0) * weight_scale

    # Node styling
    for node in net.nodes:
        node.update(
            {
                "color": "#f39c12",
                "font": {"color": "white", "size": 14},
                "size": 20,
            }
        )

    net.set_options("""
    {
      "physics": {
        "forceAtlas2Based": {
          "gravitationalConstant": -50,
          "springLength": 100
        },
        "minVelocity": 0.75,
        "solver": "forceAtlas2Based"
      }
    }
    """)

    net.show(filename)
    return filename


# ---------------------------------------------------------------------------
def plot_spike_raster(
    spike_history: list,
    neuron_labels: Optional[List[str]] = None,
    dt: float = 1e-3,
):
    """
    Plot a spike raster using matplotlib (if available).

    Parameters
    ----------
    spike_history : list of torch.Tensor
        Each element has shape (batch, num_neurons); first batch item is plotted.
    neuron_labels : list of str, optional
    dt : float
        Time step in seconds, used for x-axis scaling.

    Example
    -------
    >>> plot_spike_raster(spike_history, dt=1e-3)
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib is required for raster plots. pip install matplotlib")
        return

    spikes = torch.stack(spike_history, dim=0)  # (T, batch, N)
    spikes_b0 = spikes[:, 0, :].cpu().numpy()   # first batch item
    T, N = spikes_b0.shape
    times = [t * dt * 1e3 for t in range(T)]    # ms

    if neuron_labels is None:
        neuron_labels = [f"N{i}" for i in range(N)]

    fig, ax = plt.subplots(figsize=(12, 4))
    for n_idx in range(N):
        t_spikes = [times[t] for t in range(T) if spikes_b0[t, n_idx] > 0]
        ax.scatter(t_spikes, [n_idx] * len(t_spikes), s=4, color="black")

    ax.set_xlabel("Time (ms)")
    ax.set_ylabel("Neuron")
    ax.set_yticks(range(N))
    ax.set_yticklabels(neuron_labels)
    ax.set_title("Spike Raster")
    plt.tight_layout()
    plt.show()
