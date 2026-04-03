# dynaneuron

**Dynamic Spiking Neural Network library for inverse design of nanozymes**

`dynaneuron` combines biologically-inspired spiking neural networks (SNNs) with physics-informed layers to predict and design nanozyme catalytic properties (k_cat, Km, Vmax) from molecular fingerprints.

---

## Features

- ⚡ **Vectorized LIF neurons** with learnable parameters and GPU support
- 🧠 **Dynamic spike graphs** with structural plasticity (pruning & growing)
- ⚗️ **Physics layer** — Arrhenius kinetics + pH correction
- 🔁 **MAML-based meta-learning** for few-shot adaptation
- 🔬 **PubChem & RDKit integration** for molecular feature extraction
- 📊 **Interactive graph visualization** via PyVis

---

## Installation

```bash
git clone https://github.com/yourusername/dynaneuron.git
cd dynaneuron
pip install -e .
```

Or directly from PyPI (when published):

```bash
pip install dynaneuron
```

---

## Quick Start

```python
import torch
from dynaneuron import DynaDesigner

# Initialize model
model = DynaDesigner(num_neurons=5, input_dim=128, T=310.0, pH=4.5)

# Move to GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)

# Forward pass: batch of 32 molecular fingerprints (dim=128)
x = torch.randn(32, 128).to(device)
k_cat, Km, Vmax = model(x)

print(f"k_cat shape: {k_cat.shape}")   # (32,)
print(f"Km shape:    {Km.shape}")       # (32,)
print(f"Vmax shape:  {Vmax.shape}")     # (32,)
```

---

## Module Overview

| Module | Class/Function | Description |
|--------|---------------|-------------|
| `lif.py` | `VectorizedLIF` | Leaky Integrate-and-Fire neurons (batched, GPU) |
| `graph.py` | `VectorizedSpikeGraph` | Recurrent spike graph with plasticity |
| `physics.py` | `PhysicsLayer` | Arrhenius + Michaelis-Menten + pH physics |
| `metalearn.py` | `MAMLWrapper` | MAML few-shot meta-learning wrapper |
| `visualize.py` | `visualize_graph` | Interactive PyVis graph export |
| `data.py` | `NanozymeDataLoader` | PubChem / RDKit / CSV data pipeline |

---

## Example: Data Loading

```python
from dynaneuron import NanozymeDataLoader

loader = NanozymeDataLoader(csv_path="nanozymes.csv", use_pubchem=True)
features = loader.prepare_features(
    material_names=["Fe3O4", "CeO2"],
    smiles_list=["[Fe+2].[Fe+3]", "[Ce+4]"]
)
print(features.shape)  # (2, 1028)
```

---

## Example: Meta-Learning

```python
from dynaneuron import DynaDesigner, MAMLWrapper

base_model = DynaDesigner(num_neurons=8, input_dim=128)
maml = MAMLWrapper(base_model, lr_inner=0.01)

support_x = torch.randn(5, 128)
support_y = torch.randn(5, 3)   # k_cat, Km, Vmax
query_x   = torch.randn(10, 128)

pred, loss = maml(support_x, support_y, query_x, query_y=torch.randn(10, 3))
```

---

## Requirements

See `requirements.txt`.

---

## License

MIT
