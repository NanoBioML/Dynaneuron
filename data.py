"""
dynaneuron/data.py
------------------
Data loading and molecular feature extraction for nanozyme datasets.

Supports three feature sources (combined into a single tensor):
  1. RDKit Morgan fingerprints from SMILES strings
  2. PubChem compound properties fetched by CID
  3. Tabular CSV data

Optional dependencies: rdkit, pubchempy, pandas
Graceful fallbacks are provided when these are not installed.
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import torch
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional imports
# ---------------------------------------------------------------------------
try:
    import pandas as pd
    _PANDAS = True
except ImportError:
    _PANDAS = False

try:
    import pubchempy as pcp
    _PUBCHEM = True
except ImportError:
    pcp = None
    _PUBCHEM = False

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, DataStructs
    _RDKIT = True
except ImportError:
    _RDKIT = False


# ---------------------------------------------------------------------------
class NanozymeDataLoader:
    """
    Flexible data loader for nanozyme catalytic property prediction.

    Can combine:
      - Morgan fingerprints (via RDKit + SMILES)
      - PubChem numerical descriptors (MolecularWeight, XLogP, …)
      - Columns from a user-provided CSV

    Parameters
    ----------
    csv_path : str, optional
        Path to a CSV file with nanozyme data. Expected columns:
        at minimum "smiles" and/or "cid", plus optional target columns.
    use_pubchem : bool
        Whether to fetch descriptors from PubChem (requires pubchempy).

    Example
    -------
    >>> loader = NanozymeDataLoader(csv_path="data/nanozymes.csv")
    >>> features = loader.prepare_features(
    ...     material_names=["Fe3O4", "CeO2"],
    ...     smiles_list=["[Fe+2].[Fe+3].[O-2]", "[Ce+4].[O-2]"]
    ... )
    >>> print(features.shape)   # (2, n_bits + n_pubchem_feats)
    """

    # PubChem numerical properties to fetch
    PUBCHEM_PROPS = [
        "MolecularWeight",
        "XLogP",
        "TPSA",
        "HBondDonorCount",
        "HBondAcceptorCount",
        "RotatableBondCount",
        "HeavyAtomCount",
    ]

    def __init__(
        self,
        csv_path: Optional[str] = None,
        use_pubchem: bool = True,
    ):
        self.use_pubchem = use_pubchem and _PUBCHEM
        self.data: Optional[object] = None

        if not _PUBCHEM and use_pubchem:
            logger.warning(
                "pubchempy not installed; PubChem features disabled. "
                "pip install pubchempy"
            )
        if not _RDKIT:
            logger.warning(
                "RDKit not installed; fingerprints will be random. "
                "pip install rdkit-pypi"
            )

        if csv_path is not None:
            if not _PANDAS:
                raise ImportError("pandas is required to load CSV. pip install pandas")
            self.data = pd.read_csv(csv_path)
            logger.info(f"Loaded CSV: {csv_path} — {len(self.data)} rows")

    # ------------------------------------------------------------------
    def fetch_pubchem_features(self, cid: int) -> np.ndarray:
        """
        Fetch numerical descriptors for a PubChem compound by CID.

        Parameters
        ----------
        cid : int
            PubChem Compound ID.

        Returns
        -------
        np.ndarray, shape (len(PUBCHEM_PROPS),)
            NaN for missing properties.
        """
        if not self.use_pubchem:
            return np.zeros(len(self.PUBCHEM_PROPS))

        try:
            compound = pcp.Compound.from_cid(cid)
            feats = []
            for prop in self.PUBCHEM_PROPS:
                val = getattr(compound, prop.lower(), None)
                feats.append(float(val) if val is not None else float("nan"))
            return np.array(feats, dtype=np.float32)
        except Exception as e:
            logger.warning(f"PubChem fetch failed for CID={cid}: {e}")
            return np.full(len(self.PUBCHEM_PROPS), float("nan"), dtype=np.float32)

    # ------------------------------------------------------------------
    def compute_fingerprint(
        self, smiles: str, n_bits: int = 1024, radius: int = 2
    ) -> np.ndarray:
        """
        Compute Morgan (circular) fingerprint from a SMILES string.

        Falls back to a random binary vector if RDKit is unavailable.

        Parameters
        ----------
        smiles : str
        n_bits : int
            Fingerprint length (default 1024).
        radius : int
            Morgan radius (default 2, equivalent to ECFP4).

        Returns
        -------
        np.ndarray, shape (n_bits,), dtype float32
        """
        if not _RDKIT or smiles is None or smiles == "":
            logger.debug("RDKit unavailable or empty SMILES — using random fingerprint.")
            rng = np.random.default_rng(abs(hash(smiles or "")) % (2**32))
            return rng.integers(0, 2, size=n_bits).astype(np.float32)

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            logger.warning(f"RDKit could not parse SMILES: {smiles!r}")
            return np.zeros(n_bits, dtype=np.float32)

        fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius=radius, nBits=n_bits)
        arr = np.zeros(n_bits, dtype=np.float32)
        DataStructs.ConvertToNumpyArray(fp, arr)
        return arr

    # ------------------------------------------------------------------
    def prepare_features(
        self,
        material_names: Optional[List[str]] = None,
        smiles_list: Optional[List[str]] = None,
        cid_list: Optional[List[int]] = None,
        n_bits: int = 1024,
    ) -> torch.Tensor:
        """
        Build a feature tensor for a list of nanozyme materials.

        Feature vector per material = [fingerprint | pubchem_feats (optional)]

        Parameters
        ----------
        material_names : list of str, optional
            Human-readable names (used for logging only).
        smiles_list : list of str, optional
            SMILES strings for fingerprint computation.
        cid_list : list of int, optional
            PubChem CIDs for descriptor fetch (one per material).
        n_bits : int
            Morgan fingerprint length.

        Returns
        -------
        torch.Tensor, shape (n_materials, feature_dim)
        """
        n = 0
        if smiles_list is not None:
            n = len(smiles_list)
        elif cid_list is not None:
            n = len(cid_list)
        elif material_names is not None:
            n = len(material_names)
        else:
            raise ValueError("Provide at least one of smiles_list, cid_list, material_names.")

        all_feats = []

        for i in range(n):
            name = material_names[i] if material_names else f"material_{i}"
            smiles = smiles_list[i] if smiles_list else None
            cid = cid_list[i] if cid_list else None

            # 1. Fingerprint
            fp = self.compute_fingerprint(smiles, n_bits=n_bits)

            # 2. PubChem descriptors
            if self.use_pubchem and cid is not None:
                pc_feats = self.fetch_pubchem_features(cid)
            else:
                pc_feats = np.array([], dtype=np.float32)

            feat = np.concatenate([fp, pc_feats])
            all_feats.append(feat)
            logger.debug(f"{name}: feature_dim={feat.shape[0]}")

        features = np.array(all_feats, dtype=np.float32)

        # Replace NaN with 0
        features = np.nan_to_num(features, nan=0.0)

        return torch.from_numpy(features)

    # ------------------------------------------------------------------
    def get_targets(
        self,
        target_columns: List[str] = ("k_cat", "Km", "Vmax"),
    ) -> Optional[torch.Tensor]:
        """
        Extract target values from the loaded CSV.

        Parameters
        ----------
        target_columns : list of str

        Returns
        -------
        torch.Tensor, shape (n_rows, len(target_columns)) or None
        """
        if self.data is None:
            return None
        cols = [c for c in target_columns if c in self.data.columns]
        if not cols:
            logger.warning(f"None of {target_columns} found in CSV columns.")
            return None
        arr = self.data[cols].values.astype(np.float32)
        return torch.from_numpy(arr)
