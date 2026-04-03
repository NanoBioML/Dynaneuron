from setuptools import setup, find_packages

setup(
    name="dynaneuron",
    version="0.1.0",
    author="Your Name",
    author_email="your@email.com",
    description="Dynamic Spiking Neural Network library for inverse design of nanozymes",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/dynaneuron",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "torch>=1.12.0",
        "networkx>=2.8",
        "pyvis>=0.3.0",
        "pubchempy>=1.0.4",
        "pandas>=1.4.0",
        "rdkit-pypi>=2022.3.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=3.0.0",
        ]
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Scientific/Engineering :: Chemistry",
    ],
)
