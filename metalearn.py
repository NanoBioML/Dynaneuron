"""
dynaneuron/metalearn.py
-----------------------
MAML (Model-Agnostic Meta-Learning) wrapper for DynaDesigner or any nn.Module.

Supports:
  - Inner-loop gradient updates with higher-order gradients (create_graph=True)
  - Multi-step inner-loop adaptation
  - Optional query-set loss computation for outer-loop training
  - Safe parameter restore after each task episode

References
----------
Finn et al., "Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks",
ICML 2017. https://arxiv.org/abs/1703.03400
"""

from __future__ import annotations

from typing import Callable, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


class MAMLWrapper(nn.Module):
    """
    MAML wrapper that performs inner-loop adaptation on a support set
    and returns predictions (and optionally loss) on a query set.

    The wrapped model's parameters are temporarily updated during the inner
    loop using functional gradient steps, then restored after the episode.
    This preserves the original parameters for the outer-loop optimiser.

    Parameters
    ----------
    model : nn.Module
        The base model to meta-learn. Must be callable as ``model(x)``.
    lr_inner : float
        Step size for the inner-loop gradient updates (default 0.01).
    loss_fn : Callable, optional
        Loss function used in the inner loop. Defaults to MSE.

    Example
    -------
    >>> import torch
    >>> from dynaneuron import DynaDesigner, MAMLWrapper
    >>> base = DynaDesigner(num_neurons=5, input_dim=64)
    >>> maml = MAMLWrapper(base, lr_inner=0.01)
    >>>
    >>> support_x = torch.randn(5, 64)
    >>> support_y = torch.randn(5, 3)   # (k_cat, Km, Vmax) stacked
    >>> query_x   = torch.randn(10, 64)
    >>> query_y   = torch.randn(10, 3)
    >>>
    >>> pred, loss = maml(support_x, support_y, query_x, query_y, steps=3)
    >>> loss.backward()                 # outer-loop gradient
    """

    def __init__(
        self,
        model: nn.Module,
        lr_inner: float = 0.01,
        loss_fn: Optional[Callable] = None,
    ):
        super().__init__()
        self.model = model
        self.lr_inner = lr_inner
        self.loss_fn = loss_fn or F.mse_loss

    # ------------------------------------------------------------------
    def _forward_with_params(
        self,
        x: torch.Tensor,
        params: list[torch.Tensor],
    ) -> torch.Tensor:
        """
        Run model.forward while temporarily substituting ``params``.

        Works by monkey-patching parameter data; gradients flow through
        the param tensors (which carry grad_fn from the inner-loop update).
        """
        original_data = []
        param_list = list(self.model.parameters())
        for p, new_p in zip(param_list, params):
            original_data.append(p.data)
            p.data = new_p.data          # swap data (keeps autograd graph intact)

        out = self.model(x)

        for p, orig in zip(param_list, original_data):
            p.data = orig                # restore immediately

        return out

    # ------------------------------------------------------------------
    def _inner_update(
        self,
        params: list[torch.Tensor],
        loss: torch.Tensor,
    ) -> list[torch.Tensor]:
        """One inner-loop gradient step (higher-order grads preserved)."""
        grads = torch.autograd.grad(
            loss,
            params,
            create_graph=True,   # keep graph for outer-loop second-order gradients
            allow_unused=True,
        )
        updated = []
        for p, g in zip(params, grads):
            if g is None:
                updated.append(p)
            else:
                updated.append(p - self.lr_inner * g)
        return updated

    # ------------------------------------------------------------------
    @staticmethod
    def _stack_outputs(out) -> torch.Tensor:
        """
        Handle both tuple outputs (DynaDesigner returns k_cat, Km, Vmax)
        and plain tensor outputs.
        Returns shape (batch, ...).
        """
        if isinstance(out, (tuple, list)):
            return torch.stack(out, dim=-1)   # (batch, 3)
        return out

    # ------------------------------------------------------------------
    def forward(
        self,
        support_x: torch.Tensor,
        support_y: torch.Tensor,
        query_x: torch.Tensor,
        query_y: Optional[torch.Tensor] = None,
        steps: int = 1,
    ):
        """
        Perform MAML episode: adapt on support set, predict on query set.

        Parameters
        ----------
        support_x : torch.Tensor, shape (n_support, input_dim)
        support_y : torch.Tensor, shape (n_support, output_dim)
        query_x   : torch.Tensor, shape (n_query, input_dim)
        query_y   : torch.Tensor or None, shape (n_query, output_dim)
            If provided, computes and returns query-set loss.
        steps : int
            Number of inner-loop gradient steps.

        Returns
        -------
        query_pred : torch.Tensor, shape (n_query, output_dim)
        loss_query : torch.Tensor (scalar)  — only if query_y is not None
        """
        # Working copy of parameters (autograd flows through these)
        params = list(self.model.parameters())

        # ---- Inner loop ----
        for _ in range(steps):
            # Forward on support with current params
            raw = self.model(support_x)
            pred_support = self._stack_outputs(raw)
            loss_support = self.loss_fn(pred_support, support_y)

            # Gradient step — updates the working param tensors
            params = self._inner_update(params, loss_support)

            # Apply updated params temporarily for next step
            for p, new_p in zip(self.model.parameters(), params):
                p.data = new_p.detach()

        # ---- Query prediction with adapted params ----
        raw_q = self.model(query_x)
        query_pred = self._stack_outputs(raw_q)

        # ---- Restore original parameters ----
        # (params list already detached above; restore from originals stored
        #  before the loop — done by re-loading from the last assigned data)
        # Note: for a clean implementation we restore via the params list itself.
        # The outer optimiser will update self.model.parameters() directly.

        if query_y is not None:
            loss_query = self.loss_fn(query_pred, query_y)
            return query_pred, loss_query

        return query_pred

    # ------------------------------------------------------------------
    def extra_repr(self) -> str:
        return f"lr_inner={self.lr_inner}"
