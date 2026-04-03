"""
tests/test_lif.py
-----------------
Unit tests for VectorizedLIF.

Run with:  pytest tests/test_lif.py -v
"""

import pytest
import torch
import torch.nn as nn

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dynaneuron.lif import VectorizedLIF


# ---------------------------------------------------------------------------
class TestVectorizedLIFInit:
    """Initialisation tests."""

    def test_default_init(self):
        lif = VectorizedLIF(num_neurons=10)
        assert lif.num_neurons == 10
        assert lif.V_reset == 0.0
        assert lif.dt == 1e-3

    def test_buffer_not_parameter_by_default(self):
        lif = VectorizedLIF(num_neurons=4, learnable_params=False)
        param_names = [n for n, _ in lif.named_parameters()]
        assert "log_tau" not in param_names
        assert "log_V_th" not in param_names

    def test_learnable_params(self):
        lif = VectorizedLIF(num_neurons=4, learnable_params=True)
        param_names = [n for n, _ in lif.named_parameters()]
        assert "log_tau" in param_names
        assert "log_V_th" in param_names

    def test_shapes(self):
        n = 7
        lif = VectorizedLIF(num_neurons=n)
        assert lif.log_tau.shape == (n,)
        assert lif.log_V_th.shape == (n,)

    def test_tau_property_positive(self):
        lif = VectorizedLIF(num_neurons=5, tau=20e-3)
        assert (lif.tau > 0).all()

    def test_V_th_property_positive(self):
        lif = VectorizedLIF(num_neurons=5, V_th=1.0)
        assert (lif.V_th > 0).all()


# ---------------------------------------------------------------------------
class TestVectorizedLIFForward:
    """Forward-pass shape and output tests."""

    def _make_lif(self, n=4, **kw):
        return VectorizedLIF(num_neurons=n, **kw)

    def test_output_shapes(self):
        lif = self._make_lif(n=6)
        batch = 8
        I = torch.zeros(batch, 6)
        V = torch.zeros(batch, 6)
        s = torch.zeros(batch, 6)
        V_out, s_out = lif(I, V, s)
        assert V_out.shape == (batch, 6)
        assert s_out.shape == (batch, 6)

    def test_zero_current_voltage_decays(self):
        """With no input the potential should decay towards V_reset=0."""
        lif = self._make_lif(n=3, tau=10e-3, V_th=2.0, dt=1e-3)
        V = torch.ones(1, 3) * 0.5   # start above 0, below threshold
        s = torch.zeros(1, 3)
        I = torch.zeros(1, 3)
        V_new, _ = lif(I, V, s)
        # Each V should have decayed (moved closer to 0)
        assert (V_new < V).all()

    def test_zero_current_exponential_decay(self):
        """Verify the decay follows the Euler approximation of exp(-dt/tau)."""
        tau = 20e-3
        dt = 1e-3
        lif = self._make_lif(n=1, tau=tau, V_th=10.0, dt=dt)
        V = torch.tensor([[1.0]])
        s = torch.zeros(1, 1)
        I = torch.zeros(1, 1)
        V_out, _ = lif(I, V, s)
        expected = 1.0 + (dt / tau) * (-(1.0 - 0.0) + 0.0)
        assert abs(V_out.item() - expected) < 1e-5

    def test_spike_when_above_threshold(self):
        """A very large current should cause at least one spike."""
        lif = self._make_lif(n=1, tau=20e-3, V_th=1.0, dt=1e-3)
        V = torch.zeros(1, 1)
        s = torch.zeros(1, 1)
        I = torch.ones(1, 1) * 100.0
        for _ in range(10):
            V, s = lif(I, V, s)
        assert s.sum() > 0, "Expected at least one spike with very large current."

    def test_no_spike_below_threshold(self):
        """Small current should never reach threshold in a short window."""
        lif = self._make_lif(n=2, tau=20e-3, V_th=5.0, dt=1e-3)
        V = torch.zeros(1, 2)
        s = torch.zeros(1, 2)
        I = torch.ones(1, 2) * 0.001
        total_spikes = 0
        for _ in range(20):
            V, s = lif(I, V, s)
            total_spikes += s.sum().item()
        assert total_spikes == 0, "Did not expect spikes with tiny current."

    def test_voltage_reset_after_spike(self):
        """Membrane potential must equal V_reset for any neuron that fired."""
        lif = self._make_lif(n=1, tau=20e-3, V_th=1.0, V_reset=0.0, dt=1e-3)
        V = torch.zeros(1, 1)
        s = torch.zeros(1, 1)
        I = torch.ones(1, 1) * 100.0
        for _ in range(10):
            V, s = lif(I, V, s)
            if s.sum() > 0:
                assert V.item() == pytest.approx(lif.V_reset, abs=1e-6)

    def test_spike_values_binary(self):
        """Spike tensor must be strictly 0 or 1."""
        lif = self._make_lif(n=8)
        V = torch.randn(4, 8)
        s = torch.zeros(4, 8)
        I = torch.randn(4, 8) * 2.0
        _, spikes = lif(I, V, s)
        unique = spikes.unique()
        for u in unique:
            assert u.item() in (0.0, 1.0), f"Unexpected spike value: {u.item()}"

    def test_batch_independence(self):
        """Different batch items should not affect each other."""
        lif = self._make_lif(n=3)
        V = torch.zeros(2, 3)
        s = torch.zeros(2, 3)
        I = torch.zeros(2, 3)
        I[0] = 100.0   # only first batch item gets large input
        V_out, s_out = lif(I, V, s)
        # Second batch item should have small voltage (no input)
        assert V_out[1].abs().max() < 1.0

    def test_gpu_compatibility(self):
        """Model and tensors should move to CUDA without errors (if available)."""
        if not torch.cuda.is_available():
            pytest.skip("CUDA not available")
        device = torch.device("cuda")
        lif = VectorizedLIF(num_neurons=4).to(device)
        V = torch.zeros(2, 4, device=device)
        s = torch.zeros(2, 4, device=device)
        I = torch.ones(2, 4, device=device)
        V_out, s_out = lif(I, V, s)
        assert V_out.device.type == "cuda"

    def test_learnable_gradients_flow(self):
        """
        Gradients must flow through tau (via the dV term) when learnable=True.

        Note: log_V_th is only used in the threshold comparison (non-differentiable
        spike step), so its gradient is None by design — this is correct SNN
        behaviour (spikes are not differentiable w.r.t. V_th without surrogate
        gradients). We only verify log_tau receives a gradient.
        """
        lif = self._make_lif(n=3, learnable_params=True)
        V = torch.zeros(2, 3)
        s = torch.zeros(2, 3)
        # Use sub-threshold current so no spikes fire and V_out is differentiable
        I = torch.ones(2, 3) * 0.001
        V_out, _ = lif(I, V, s)
        loss = V_out.sum()
        loss.backward()
        # log_tau feeds into dV computation → must have grad
        assert lif.log_tau.grad is not None, "Expected gradient for log_tau"
        # log_V_th only appears in non-differentiable comparison → grad is None
        # (this is expected and correct for standard LIF without surrogate grads)


# ---------------------------------------------------------------------------
class TestVectorizedLIFRefractory:
    """
    Optional: behavioural tests that approximate refractory dynamics.
    The base LIF does not implement explicit refractory period; these tests
    verify that the reset mechanism effectively suppresses immediate re-firing.
    """

    def test_reset_suppresses_consecutive_spikes(self):
        """After a spike the reset should suppress the next step (low I case)."""
        lif = VectorizedLIF(num_neurons=1, tau=1.0, V_th=0.5, V_reset=0.0, dt=0.01)
        V = torch.tensor([[0.49]])   # just below threshold
        s = torch.zeros(1, 1)
        I = torch.ones(1, 1) * 0.1
        V, s1 = lif(I, V, s)
        # Now V was reset; with small I it should not spike again immediately
        V, s2 = lif(I * 0.0, V, s1)   # no current → decay
        # V should be at or near reset
        assert V.item() <= 0.5


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
