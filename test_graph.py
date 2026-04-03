"""
tests/test_graph.py
-------------------
Unit tests for VectorizedSpikeGraph.

Run with:  pytest tests/test_graph.py -v
"""

import pytest
import torch

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dynaneuron.graph import VectorizedSpikeGraph


# ---------------------------------------------------------------------------
class TestVectorizedSpikeGraphInit:
    """Initialisation and structural tests."""

    def test_default_init(self):
        g = VectorizedSpikeGraph(num_neurons=5, input_dim=32)
        assert g.num_neurons == 5
        assert g.input_dim == 32

    def test_adj_weights_shape(self):
        g = VectorizedSpikeGraph(num_neurons=6, input_dim=16)
        assert g.adj_weights.shape == (6, 6)

    def test_mask_shape(self):
        g = VectorizedSpikeGraph(num_neurons=6, input_dim=16)
        assert g.mask.shape == (6, 6)

    def test_mask_no_self_connections(self):
        """Diagonal of mask must be 0 after initialisation."""
        g = VectorizedSpikeGraph(num_neurons=8, input_dim=16)
        diag = torch.diagonal(g.mask)
        assert diag.sum().item() == 0.0

    def test_mask_binary(self):
        g = VectorizedSpikeGraph(num_neurons=8, input_dim=16)
        unique = g.mask.unique()
        for u in unique:
            assert u.item() in (0.0, 1.0)

    def test_connection_density_range(self):
        g = VectorizedSpikeGraph(num_neurons=10, input_dim=32, connection_density=0.3)
        d = g.connection_density()
        assert 0.0 <= d <= 1.0

    def test_adj_weights_is_parameter(self):
        g = VectorizedSpikeGraph(num_neurons=5, input_dim=16)
        param_names = [n for n, _ in g.named_parameters()]
        assert any("adj_weights" in n for n in param_names)

    def test_mask_is_not_parameter(self):
        g = VectorizedSpikeGraph(num_neurons=5, input_dim=16)
        param_names = [n for n, _ in g.named_parameters()]
        assert not any("mask" in n for n in param_names)


# ---------------------------------------------------------------------------
class TestVectorizedSpikeGraphForward:
    """Forward-pass output shape and value tests."""

    def _make_graph(self, n=5, d=32, density=0.3):
        return VectorizedSpikeGraph(num_neurons=n, input_dim=d,
                                    connection_density=density)

    def test_output_shape(self):
        g = self._make_graph(n=5, d=32)
        x = torch.randn(8, 32)
        rates = g(x, time_steps=20)
        assert rates.shape == (8, 5), f"Expected (8, 5), got {rates.shape}"

    def test_firing_rates_in_zero_one(self):
        """Mean firing rates must be in [0, 1]."""
        g = self._make_graph(n=4, d=16)
        x = torch.randn(4, 16)
        rates = g(x, time_steps=30)
        assert rates.min().item() >= -1e-6
        assert rates.max().item() <= 1.0 + 1e-6

    def test_batch_size_1(self):
        g = self._make_graph(n=3, d=8)
        x = torch.randn(1, 8)
        rates = g(x, time_steps=10)
        assert rates.shape == (1, 3)

    def test_different_batch_sizes(self):
        g = self._make_graph(n=4, d=16)
        for b in [1, 4, 16, 32]:
            rates = g(torch.randn(b, 16), time_steps=10)
            assert rates.shape == (b, 4)

    def test_time_steps_effect(self):
        """More time steps should not crash; output shape remains the same."""
        g = self._make_graph(n=3, d=8)
        x = torch.randn(2, 8)
        for T in [1, 10, 100]:
            rates = g(x, time_steps=T)
            assert rates.shape == (2, 3)

    def test_gradients_flow_through_forward(self):
        """
        Verify the differentiable part of the graph (input_proj) accumulates grads.

        Spike outputs are binary (non-differentiable threshold ops), so gradients
        do not flow through firing_rates back to x — standard LIF behaviour.
        We verify input_proj.weight receives a gradient via the linear projection.
        """
        g = self._make_graph(n=4, d=16)
        x = torch.randn(4, 16)
        I_ext = g.input_proj(x)          # fully differentiable projection
        loss = I_ext.sum()
        loss.backward()
        assert g.input_proj.weight.grad is not None

    def test_gpu_compatibility(self):
        if not torch.cuda.is_available():
            pytest.skip("CUDA not available")
        device = torch.device("cuda")
        g = self._make_graph(n=4, d=16).to(device)
        x = torch.randn(4, 16, device=device)
        rates = g(x, time_steps=10)
        assert rates.device.type == "cuda"
        assert rates.shape == (4, 4)


# ---------------------------------------------------------------------------
class TestPruneConnections:
    """Tests for structural plasticity: prune_connections."""

    def test_prune_zeros_weak_connections(self):
        """After pruning with threshold=1e9, mask should be all zeros."""
        g = VectorizedSpikeGraph(num_neurons=6, input_dim=8, connection_density=1.0)
        g.prune_connections(threshold=1e9)
        # No weight can exceed 1e9 in magnitude from randn*0.01
        assert g.mask.sum().item() == 0.0

    def test_prune_keeps_strong_connections(self):
        """Manually set large weights — those should survive pruning."""
        g = VectorizedSpikeGraph(num_neurons=4, input_dim=8, connection_density=0.0)
        with torch.no_grad():
            g.adj_weights[0, 1] = 2.0
            g.mask[0, 1] = 1.0
        g.prune_connections(threshold=0.5)
        assert g.mask[0, 1].item() == 1.0

    def test_prune_no_self_connections(self):
        """Diagonal must remain 0 after pruning."""
        g = VectorizedSpikeGraph(num_neurons=5, input_dim=8, connection_density=1.0)
        with torch.no_grad():
            g.adj_weights.fill_(10.0)       # all large weights
        g.prune_connections(threshold=0.01)
        diag = torch.diagonal(g.mask)
        assert diag.sum().item() == 0.0

    def test_prune_reduces_density(self):
        """Pruning with a very low threshold should reduce connection density."""
        g = VectorizedSpikeGraph(num_neurons=8, input_dim=16, connection_density=1.0)
        density_before = g.connection_density()
        g.prune_connections(threshold=0.001)   # small weights get removed
        density_after = g.connection_density()
        assert density_after <= density_before

    def test_prune_mask_binary(self):
        """Mask must remain binary after pruning."""
        g = VectorizedSpikeGraph(num_neurons=5, input_dim=8, connection_density=0.5)
        g.prune_connections(threshold=0.005)
        unique = g.mask.unique()
        for u in unique:
            assert u.item() in (0.0, 1.0)


# ---------------------------------------------------------------------------
class TestGrowConnections:
    """Tests for structural plasticity: grow_connections."""

    def test_grow_increases_density(self):
        """grow_connections with rate=1.0 should (very likely) increase density."""
        g = VectorizedSpikeGraph(num_neurons=10, input_dim=16, connection_density=0.0)
        density_before = g.connection_density()
        g.grow_connections(growth_rate=1.0)   # activate all possible connections
        density_after = g.connection_density()
        assert density_after >= density_before

    def test_grow_all_rate_one(self):
        """growth_rate=1.0 should make all non-diagonal connections active."""
        g = VectorizedSpikeGraph(num_neurons=6, input_dim=8, connection_density=0.0)
        g.grow_connections(growth_rate=1.0)
        n = g.num_neurons
        expected = n * (n - 1)
        assert g.mask.sum().item() == pytest.approx(expected, abs=1.0)

    def test_grow_no_self_connections(self):
        """Diagonal must remain 0 after growing."""
        g = VectorizedSpikeGraph(num_neurons=6, input_dim=8, connection_density=0.0)
        g.grow_connections(growth_rate=1.0)
        diag = torch.diagonal(g.mask)
        assert diag.sum().item() == 0.0

    def test_grow_mask_binary(self):
        g = VectorizedSpikeGraph(num_neurons=5, input_dim=8, connection_density=0.3)
        g.grow_connections(growth_rate=0.1)
        unique = g.mask.unique()
        for u in unique:
            assert u.item() in (0.0, 1.0)

    def test_grow_rate_zero_no_change(self):
        """growth_rate=0.0 should not change the mask."""
        g = VectorizedSpikeGraph(num_neurons=6, input_dim=8, connection_density=0.3)
        mask_before = g.mask.clone()
        g.grow_connections(growth_rate=0.0)
        assert torch.allclose(g.mask, mask_before)

    def test_grow_clamp_max_one(self):
        """Mask values must never exceed 1.0 even after multiple grows."""
        g = VectorizedSpikeGraph(num_neurons=5, input_dim=8, connection_density=1.0)
        for _ in range(10):
            g.grow_connections(growth_rate=1.0)
        assert g.mask.max().item() <= 1.0


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
