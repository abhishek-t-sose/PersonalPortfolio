/**
 * knowledge.js — Comprehensive structured knowledge base for client-side RAG
 * Multi-chunk per paper: abstract, methods, findings, specifics
 * Updated from uploaded PDFs and web-fetched abstracts
 */

const KNOWLEDGE_BASE = [
  // ===============================
  // IDENTITY & CONTACT
  // ===============================
  {
    id: "bio-1",
    category: "bio",
    keywords: ["who", "about", "abhishek", "sose", "name", "introduce", "background", "summary"],
    content: "Abhishek Tejrao Sose is a Postdoctoral Researcher at the University of Maryland, College Park. He is a computational-experimental materials scientist specializing in AI-enabled, autonomous materials discovery, spanning molecular simulations to robot-assisted synthesis. He has expertise in MD, DFT/AIMD, machine learning, and machine-learned interatomic potentials (MLIPs), with a strong focus on Bayesian uncertainty quantification and closed-loop optimization. He currently develops AI-guided, self-driving laboratory workflows for predictive design and synthesis of composite aerogels.",
    metadata: { priority: 10 }
  },
  {
    id: "overview-work",
    category: "bio",
    keywords: ["work", "works", "working", "field", "fields", "area", "areas", "specialize", "specializes",
      "specialty", "focus", "focuses", "study", "studies", "expertise", "topics", "domain", "does", "research",
      "science", "scientist", "overview", "summary", "explain", "describe"],
    content: "Abhishek's work sits at the intersection of computational materials science and AI-driven automation, and breaks down into four connected pillars. (1) Bayesian Uncertainty Quantification (BUQ) for force fields: developing all-atom and coarse-grained interatomic potentials (e.g. CG-EAM models for Pd, Au, Ag, Cu, Pt) that come with calibrated uncertainty on both parameters and predicted properties, using Particle Swarm Optimization plus Bayesian posterior sampling (ESS, AIES, Metropolis-Hastings). (2) Metal-organic frameworks (MOFs): simulation-driven design for hydrogen storage, drug delivery, and gas separation, using GCMC, NEMD, and PSO-genetic-algorithm searches over huge functional-group design spaces. (3) Machine learning for materials discovery: GPR, random forests, 3D-CNNs, stacked ensembles, and LLMs applied to green-solvent selection, high-entropy alloy design, tribology, and polymer property prediction. (4) Autonomous, AI-guided experimentation: his current postdoctoral focus at UMD is self-driving laboratory workflows — combining predictive/generative modeling with robot-assisted synthesis — to design composite aerogels and all-natural plastic substitutes with multiple tuned properties at once. Across all of this, the throughline is propagating uncertainty honestly from quantum mechanics through molecular dynamics to the experimental bench, rather than treating simulation outputs as exact.",
    metadata: { priority: 10 }
  },
  {
    id: "contact-1",
    category: "contact",
    keywords: ["contact", "email", "reach", "collaborate", "collaboration", "hire", "hiring"],
    content: "You can reach Abhishek at atsose@umd.edu. He is based in the Washington, DC metro area. His LinkedIn is linkedin.com/in/abhisheksose, Google Scholar profile is at scholar.google.ca (user: PnaArzMAAAAJ), GitHub: github.com/abhishek-t-sose, and ORCID: 0000-0002-0001-6999.",
    metadata: { priority: 9 }
  },
  {
    id: "location-1",
    category: "contact",
    keywords: ["where", "live", "location", "based", "city", "state", "country", "washington", "dc", "maryland"],
    content: "Abhishek is based in the Washington, DC metro area. He works at the University of Maryland, College Park, MD.",
    metadata: { priority: 9 }
  },

  // ===============================
  // EDUCATION
  // ===============================
  {
    id: "edu-1",
    category: "education",
    keywords: ["education", "degree", "phd", "doctoral", "study", "university", "school", "virginia", "tech", "deshmukh", "thesis"],
    content: "Abhishek earned his Ph.D. in Chemical Engineering from Virginia Tech (2018-2023) under Dr. Sanket A. Deshmukh in the Computational Design of Hybrid Materials Group. His thesis was 'Advancing Computational Material Design & Model Development Using Data-Driven Approaches.' His doctoral work spanned Bayesian UQ of force fields, MOF design for drug delivery and gas storage, 2D hybrid materials, and ML for tribology.",
    metadata: { priority: 8 }
  },
  {
    id: "edu-2",
    category: "education",
    keywords: ["undergraduate", "bachelors", "btech", "iit", "bombay", "india", "electrical", "minor"],
    content: "Abhishek completed his B.Tech. in Chemical Engineering with a Minor in Electrical Engineering from IIT Bombay, Mumbai, India (2013-2017). Undergraduate projects included 3D printed scaffolds for tissue growth at Loughborough University UK (designed 7,500 structures in AutoCAD), leading Project Biosynth biodiesel production with a 250L pilot plant, and coal gasification process design in ASPEN Plus.",
    metadata: { priority: 8 }
  },

  // ===============================
  // CURRENT RESEARCH (UMD)
  // ===============================
  {
    id: "research-umd-1",
    category: "research",
    keywords: ["current", "work", "now", "research", "postdoc", "umd", "maryland", "aerogel", "po-yen", "chen", "biomaterial", "sustainable", "composite"],
    content: "At the University of Maryland (2025-present), Abhishek works with Prof. Po-Yen Chen on accelerated development of bio-materials with multi-property tuning via ML/AI and modeling. He optimizes composite aerogel composition comprising Montmorillonite, Carbon nanofibers, SiO2 nanofibers, and Carboxymethylcellulose using Support Vector Regressor. He developed a predictive model integrated with U-Net based Generative AI to synthesize SEM images of desired aerogels. Finite Element Method (FEM) is used to accelerate prediction of thermal, acoustic, and mechanical properties.",
    metadata: { priority: 10 }
  },
  {
    id: "research-umd-2",
    category: "research",
    keywords: ["self-driving", "lab", "robot", "autonomous", "automation", "plastic", "substitutes", "natural", "inverse", "design"],
    content: "Abhishek is co-developing a robotics and machine learning integrated workflow for discovering all-natural plastic substitutes (Nature Protocols, under review 2026). This work integrates AI-ML driven robotic experiments with computational screening to close the loop between virtual discovery and physical synthesis. He also designed a robust framework for inverse-design of composite aerogels for multi-property optimization.",
    metadata: { priority: 9 }
  },

  // ===============================
  // GEORGIA TECH RESEARCH
  // ===============================
  {
    id: "research-gt-1",
    category: "research",
    keywords: ["georgia", "tech", "ramprasad", "polymer", "lithium", "ion", "conductivity", "active", "learning", "mlff", "deepmd", "allegro"],
    content: "At Georgia Tech (2024-2025) with Prof. Rampi Ramprasad: (1) Developed Li-ion conductivity prediction model using 6,042 MD-simulated and 170 experimental polymers with active learning. (2) Trained Machine-Learned Interatomic Potentials (MLIPs) using AIMD across 100K-2,500K, benchmarking DeepMD-kit against Allegro and SO3LR — achieving ~250x improved stability and ~10x higher accuracy in bulk polymer MD. (3) Extracted polymer mechanical properties from ~2.4 million articles using LLaMA and GPT-4.0. (4) NEMD simulations for gas diffusion (CO2, CH4, O2, N2) in 14 polymeric materials.",
    metadata: { priority: 8 }
  },
  {
    id: "research-gt-2",
    category: "research",
    keywords: ["llm", "large", "language", "model", "gpt", "llama", "extraction", "nlp", "text", "mining", "polymer", "genome", "fine", "tuning", "icl"],
    content: "At Georgia Tech, Abhishek utilized LLaMA and GPT-4.0 for informatics-ready data extraction of polymer mechanical properties (Tensile strength, Young's Modulus, Elongation at break) from ~2.4 million full-text articles. He applied Polymer Genome (PG) fingerprinting for ML predictive models, and developed In-context Learned (ICL) and Fine-tuned models of GPT-3.5 and LLaMA for GSK-based Green Solvent prediction.",
    metadata: { priority: 8 }
  },

  // ===============================
  // RESEARCH INTERESTS
  // ===============================
  {
    id: "interest-1",
    category: "interests",
    keywords: ["interest", "generative", "ai", "llm", "rag", "agent", "retrieval", "augmented"],
    content: "Abhishek's research interests include Generative AI for Science: fine-tuning LLMs, building AI agents, and Retrieval Augmented Generation (RAG) for accelerated scientific discovery.",
    metadata: { priority: 7 }
  },
  {
    id: "interest-2",
    category: "interests",
    keywords: ["interest", "force", "field", "forcefield", "coarse", "grained", "protein", "mlip", "machine", "learning", "potential"],
    content: "Abhishek works on Machine Learning Force Fields (MLIPs) and Coarse-Grained MD Force Fields with Bayesian uncertainty awareness. He benchmarked DeepMD-kit vs Allegro/SO3LR for polymers and developed CG EAM potentials for FCC metals.",
    metadata: { priority: 7 }
  },
  {
    id: "interest-3",
    category: "interests",
    keywords: ["interest", "bayesian", "uncertainty", "quantification", "buq", "gcmc", "monte", "carlo", "sampling"],
    content: "Abhishek has deep expertise in Bayesian Uncertainty Quantification (BUQ) for MD force fields, having published two JCTC papers on BUQ. He uses PEUQSE and ZEUS software, and teaches PEUQSE workshops. He also works with Grand Canonical Monte Carlo (GCMC) for materials discovery.",
    metadata: { priority: 7 }
  },
  {
    id: "interest-4",
    category: "interests",
    keywords: ["interest", "dft", "density", "functional", "theory", "aimd", "ab", "initio", "multi", "scale", "quantum"],
    content: "Multi-scale modeling from DFT and AIMD for materials design. Abhishek has trained MLIPs using AIMD simulations across 100K-2,500K temperature ranges for polymer systems.",
    metadata: { priority: 7 }
  },

  // ===============================
  // PUB: Green Solvents (Adv. Sci. 2025) — DETAILED
  // ===============================
  {
    id: "pub-green-overview",
    category: "publications",
    keywords: ["green", "solvent", "machine", "learning", "advanced", "science", "ramprasad", "gsk", "sustainability", "database", "2025"],
    content: "Publication (2025): 'Machine Learning for Green Solvents: Assessment, Selection and Substitution' — R Datta, J Nistane, AT Sose, H Sahu, R Ramprasad — Advanced Science. DOI: 10.1002/advs.202516851. Presents a data-driven pipeline for assessing solvent sustainability and identifying greener drop-in substitutes for hazardous solvents. Abhishek trained some of the language models used in this work.",
    metadata: { priority: 7, year: 2025, journal: "Advanced Science", doi: "10.1002/advs.202516851" }
  },
  {
    id: "pub-green-methods",
    category: "publications",
    keywords: ["green", "solvent", "gpr", "gpt", "fine", "tune", "icl", "context", "learning", "morgan", "fingerprint", "gscore"],
    content: "Green Solvents paper methods: Three models were trained on the GSK Solvent Sustainability Guide (154 solvents) to predict the composite G-score (1-10 scale, higher=greener): (1) Gaussian Process Regression (GPR) using Morgan fingerprints (1024-bit, radius 2) via PolymRize platform; (2) Fine-tuned GPT-3.5 Turbo (10 epochs); (3) In-context learning (ICL) with GPT-3.5 Turbo using few-shot examples. G-score = geometric mean of Waste x Environment x Health x Safety. Hansen Solubility Parameters (HSP) used to find solubility-compatible alternatives with RED < 1.",
    metadata: { priority: 6, year: 2025, journal: "Advanced Science" }
  },
  {
    id: "pub-green-results",
    category: "publications",
    keywords: ["green", "solvent", "rmse", "pearson", "greensolventdb", "10189", "performance", "accuracy", "result"],
    content: "Green Solvents paper results: GPR marginally outperformed LLMs. LOOCV GPR achieved RMSE=0.82, MAE=0.65 (~15% accuracy), Pearson r=0.76. GPR was used to evaluate 10,189 solvents, creating GreenSolventDB — the largest public green solvent database. Seven outliers (o1-o7) identified with unique chemical profiles. Fragment Z-score analysis: esters (Z=45.77) and alcohols (Z=19.81) enriched in green solvents; halogenated groups (Z=-25.97) underrepresented in green solvents.",
    metadata: { priority: 6, year: 2025, journal: "Advanced Science" }
  },
  {
    id: "pub-green-casestudies",
    category: "publications",
    keywords: ["benzene", "diethyl", "ether", "toluene", "replacement", "substitute", "hazardous", "green", "alternative"],
    content: "Green Solvents case studies: Benzene (carcinogen, G-score 4.68) — pipeline identified toluene (G-score 5.96, RED 0.4) as known replacement, plus novel 1,4-diethylbenzene (G-score 6.32, RED 0.4). 629 total greener alternatives found. Diethyl ether (flammable, G-score 4.813) — MTBE (G-score 5.173, RED 0.39) and DGDE (G-score 5.858, RED 0.792) identified. 1,520 alternatives found. Pipeline proposed replacements for 29 undesirable GSK SSG solvents total. Data available at github.com/Ramprasad-Group/green_solvents.",
    metadata: { priority: 6, year: 2025, journal: "Advanced Science" }
  },

  // ===============================
  // PUB: Drug Adsorption in MOFs (RSC Adv. 2021) — DETAILED
  // ===============================
  {
    id: "pub-drug-overview",
    category: "publications",
    keywords: ["drug", "adsorption", "mof", "solvent", "rsc", "2021", "ethanol", "award"],
    content: "Publication (2021): 'Modelling drug adsorption in metal-organic frameworks: the role of solvent' — AT Sose*, HD Cornell* (co-first) et al. — RSC Advances. Won Outstanding Student Paper Award for Computational & Theoretical Chemistry. Combined computational (GCMC) and experimental study of drug adsorption in biocompatible MOFs in the presence and absence of ethanol.",
    metadata: { priority: 7, year: 2021, journal: "RSC Advances" }
  },
  {
    id: "pub-drug-methods",
    category: "publications",
    keywords: ["drug", "mof", "gcmc", "hkust", "uio", "mil", "5fu", "ibuprofen", "hydroxyurea", "method", "simulation"],
    content: "Drug adsorption paper methods: GCMC simulations studied three drugs — 5-fluorouracil (5-FU), ibuprofen (IBU), and hydroxyurea (HU) — in three biocompatible MOFs: UiO-AZB (light-responsive, surface area 3692/1959 m2/g calc/exp), HKUST-1 (CuBTC, 2365/1830 m2/g), and NH2-MIL-53(Al) (1395/725 m2/g). Simulations at 300K, 1 atm, with and without ethanol. Two-component GCMC (drug + ethanol) with 1,500,000 steps. Pressure range 10^-12 to 10^6 Pa for adsorption isotherms.",
    metadata: { priority: 6, year: 2021, journal: "RSC Advances" }
  },
  {
    id: "pub-drug-results",
    category: "publications",
    keywords: ["drug", "mof", "uptake", "result", "finding", "solvent", "overestimate", "interface", "electrostatic"],
    content: "Drug adsorption key findings: Without ethanol, drug uptake was massively overestimated (e.g., 5-FU in HKUST-1: 886.9 vs 174.7 mg/g with ethanol vs 150+/-10 mg/g experimental). With ethanol, drugs adsorb at the MOF-solvent interface, not in pore centers. Ethanol occupies the core of MOF pores. Uptake trend: HU > 5-FU > IBU (smaller molecules adsorbed more). At low pressures (<10^-4 Pa), drug-MOF electrostatic interactions dominate regardless of solvent. NH2-MIL-53 starts adsorbing drugs at lowest pressure due to small pores and strong -NH2 electrostatic interactions.",
    metadata: { priority: 6, year: 2021, journal: "RSC Advances" }
  },
  {
    id: "pub-drug-specifics",
    category: "publications",
    keywords: ["drug", "uio-azb", "pore", "size", "adsorption", "isotherm", "pressure", "host", "adsorbate", "energy"],
    content: "Drug adsorption specifics: UiO-AZB pore sizes 10.8, 11.9, 13.7 Angstroms. IBU in UiO-AZB exterior pores accounted for 109.15 mg/g (~40% lower than experiment, attributed to carboxylic-zirconium defect site interactions). Host-adsorbate energy (UHA) decreased with drug size in all MOFs. At high pressure: UHA trend HU+ethanol < 5-FU+ethanol < IBU+ethanol. RDF analysis showed Cu metal binds strongly to O1 of 5-FU at 2.89 Angstroms, and hydroxyl groups of IBU bind to copper sites.",
    metadata: { priority: 5, year: 2021, journal: "RSC Advances" }
  },

  // ===============================
  // PUB: MOFs for H2 (JCTC 2023) — DETAILED
  // ===============================
  {
    id: "pub-h2-overview",
    category: "publications",
    keywords: ["mof", "hydrogen", "h2", "adsorption", "data", "driven", "discovery", "storage", "energy", "2023", "irmof"],
    content: "Publication (2023): 'Data Driven Discovery of MOFs for Hydrogen Gas Adsorption' — S Singh*, AT Sose* (co-first), F Wang, KK Bejagam, SA Deshmukh — JCTC. Developed a hybrid PSO-GA framework integrated with GCMC simulations and an in-house C++ MOF structure generation code to design functionalized IRMOF-10 for enhanced H2 storage at cryogenic conditions (77K).",
    metadata: { priority: 7, year: 2023, journal: "JCTC" }
  },
  {
    id: "pub-h2-methods",
    category: "publications",
    keywords: ["pso", "genetic", "algorithm", "gcmc", "irmof", "functionalization", "linker", "bpdc", "functional", "group", "optimization"],
    content: "H2 MOF paper methods: PSO-integrated GA optimized functional groups on IRMOF-10's BPDC linker (24 functionalization sites, 20 candidate functional groups including H). Design space ~10^37 MOFs; only 13,824 explored across two optimization cycles (108 epochs). 16 particles with 8 children each. GCMC with LAMMPS using UFF force field, 3-site H2 model (sigma=0.296nm, epsilon/k=34.2K), EQeq charges. 2,000 GCMC steps for screening, 500,000 for validation. In-house C++ code for MOF assembly and functionalization.",
    metadata: { priority: 6, year: 2023, journal: "JCTC" }
  },
  {
    id: "pub-h2-results",
    category: "publications",
    keywords: ["h2", "adsorption", "result", "volumetric", "gravimetric", "deliverable", "capacity", "best", "structure"],
    content: "H2 MOF key results: Best functionalized IRMOF-10 achieved 25.76 g/L volumetric and 37.09 mg/g gravimetric adsorption at 1 bar, 77K — approximately 6x higher than bare IRMOF-10 (4.15 g/L, 1.8 mg/g). Deliverable capacity (40 to 1 bar): up to 23.0 g/L. Optimal 'sweet spot': void fraction 0.67-0.71, mass 17,500-20,000 Da, volumetric surface area 1,750-2,100 m2/cm3. Isotherms show linear increase 0.1-1 bar, plateau at ~45 g/L above 40 bar.",
    metadata: { priority: 6, year: 2023, journal: "JCTC" }
  },
  {
    id: "pub-h2-design-rules",
    category: "publications",
    keywords: ["h2", "functional", "group", "phenylacetylene", "penta", "diene", "heptatriene", "dodecahexaene", "unsaturated", "carbon", "design", "rule"],
    content: "H2 MOF design rules: (1) Unsaturated carbon functional groups (phenylacetylene, penta-1,3-diene, 1,3,5-Heptatriene, methyl) enhance H2 adsorption due to high specific surface area and stronger interactions via increased electron density. (2) Top sites: 24, 3, 14, 1, 11 — close to metal node corners for enhanced H2 entrapment. (3) Best combination: 1,3,5-Heptatriene at site 2, phenylacetylene at site 4, Dodecahexaene at site 11, phenylacetylene at site 16, penta-1,3-diene at site 20. 28.5% of top 200 MOFs had this configuration.",
    metadata: { priority: 6, year: 2023, journal: "JCTC" }
  },
  {
    id: "pub-h2-ml",
    category: "publications",
    keywords: ["h2", "machine", "learning", "random", "forest", "lgbm", "cnn", "3d", "mlp", "stacked", "ensemble", "prediction"],
    content: "H2 MOF ML models: Five models trained on 12,878 hMOFs with 29 input descriptors (24 functional group sites + mass + VF + VF1 + VF2 + SA). Random Forest: R2=0.634, MAPE=5.26%. LGBM: R2=0.680, MAPE=4.79%. MLP: R2=0.540, MAPE=5.98%. Stacked Ensemble (RF+LGBM+MLP→MLP): R2=0.670, MAPE=4.89%. 3D-CNN (best): R2=0.910, MAPE=0.017% — captured both spatial and chemical features via voxelized 70x70x70 grids with atom-type labels. CNN used 5 Conv3D layers (32→512 channels) with ELU activation.",
    metadata: { priority: 6, year: 2023, journal: "JCTC" }
  },

  // ===============================
  // PUB: ML Tribology Review (PCCP 2023) — DETAILED
  // ===============================
  {
    id: "pub-trib-overview",
    category: "publications",
    keywords: ["tribology", "review", "machine", "learning", "pccp", "friction", "wear", "lubricant", "2023"],
    content: "Publication (2023): 'A Review of Recent Advances and Applications of Machine Learning in Tribology' — AT Sose, SY Joshi, LK Kunche, F Wang, SA Deshmukh — PCCP (36 pages). First comprehensive review combining ML with both experimental and molecular simulation studies in tribology. Covers lubricant design, composite materials (PMC, MMC, CMC), emerging materials, and computational nanotribology.",
    metadata: { priority: 7, year: 2023, journal: "PCCP" }
  },
  {
    id: "pub-trib-methods",
    category: "publications",
    keywords: ["tribology", "ann", "neural", "network", "svm", "random", "forest", "decision", "tree", "anfis", "elm", "taguchi", "anova"],
    content: "Tribology review ML methods covered: ANN (most widely used — BPNN, RNN, RBFNN), PCA-based ANN, ART-2 neural networks, Extreme Learning Machine (ELM), ANFIS, Decision Trees, Random Forests, SVM, Monte-Carlo-based ANN, Improved Bat Algorithm ANN, NSGA-II and GA optimization with ANN surrogates. ANOVA for statistical analysis. Taguchi DOE for experiment design. Key finding: ANN excels on small datasets and nonlinear relationships; RF handles high variability well.",
    metadata: { priority: 6, year: 2023, journal: "PCCP" }
  },
  {
    id: "pub-trib-materials",
    category: "publications",
    keywords: ["tribology", "polymer", "composite", "peek", "ptfe", "metal", "aluminum", "ceramic", "mxene", "glyco", "lubricant", "oil"],
    content: "Tribology review materials covered: Oil-based lubricants (PFPE, vegetable oils, diesel blends), PMCs (PEEK, PTFE, PPS, epoxy with carbon/glass fiber, TiO2), MMCs (aluminum alloys with SiC, B4C, Al2O3, CNT, graphene, fly ash, RHA), CMCs (C/SiC, Si3N4-SiC, Al2O3-graphene). Emerging materials: Glycomaterials (starch-oil bio-lubricants from renewable sources) and MXenes (Ti3C2 reduced CoF 4x and wear 10x vs uncoated copper).",
    metadata: { priority: 6, year: 2023, journal: "PCCP" }
  },
  {
    id: "pub-trib-simulations",
    category: "publications",
    keywords: ["tribology", "molecular", "dynamics", "md", "nemd", "reactive", "rmd", "rebo", "reaxff", "nanotribology", "graphene", "superlubricity"],
    content: "Tribology review computational methods: Classical MD (lubricant interfacial layers, CG MD for boundary lubrication), Reactive MD with REBO/AIREBO/ReaxFF (tribochemistry of diamond/DLC/carbon surfaces, tungsten-carbide friction, silica-water wear), NEMD (shear-thinning of alkanes, rheology). Key study: Berman et al. (Science 2015) used AIREBO to discover macroscale superlubricity via graphene nanoscroll formation with diamond nanoparticles on DLC. Only 4 papers had combined ML with MD simulations in tribology at the time of review.",
    metadata: { priority: 6, year: 2023, journal: "PCCP" }
  },

  // ===============================
  // PUB: Water Confined (J Mater Sci 2022) — DETAILED
  // ===============================
  {
    id: "pub-water-overview",
    category: "publications",
    keywords: ["water", "confined", "graphene", "boron", "nitride", "mos2", "2d", "hybrid", "layered", "2022"],
    content: "Publication (2022): 'Investigation of structure & dynamics of water confined between hybrid layered materials of graphene, BN, & MoS2' — AT Sose, E Mohammadi, F Wang, SA Deshmukh — J. Mater. Sci. Used all-atom MD simulations (LAMMPS, SPC/Fw water, 7000 water molecules, 10ns NPT at 300K) to study water confined between novel layered hybrid 2D materials at slit widths of 8.5, 12.5, and 15.5 Angstroms.",
    metadata: { priority: 7, year: 2022, journal: "Journal of Materials Science" }
  },
  {
    id: "pub-water-results",
    category: "publications",
    keywords: ["water", "confined", "flexible", "rigid", "hydrophilic", "hydrophobic", "expel", "adhere", "ordering", "layer"],
    content: "Water confinement key findings: Flexible hybrid sheets expelled ALL confined water within 0.25 ns due to stronger inter-sheet interactions vs water — sheets adhered to each other. Pure GR-GR-GR also expelled water (hydrophobic), but BN-BN-BN and MoS2-MoS2-MoS2 retained water (hydrophilic). For rigid sheets: BN-MoS2 interface showed sharpest, highest z-density peaks = most ordered water monolayer. Ordering trend: BN-MoS2 > MoS2-GR > BN-GR. GR-BN-MoS2 hybrid formed the most prominent layered water structure overall. Water diffusion: BN-BN-BN lowest (2.133e-9 m2/s), GR-GR-GR highest (2.450e-9 m2/s), bulk water 2.72e-9 m2/s.",
    metadata: { priority: 6, year: 2022, journal: "Journal of Materials Science" }
  },
  {
    id: "pub-water-analysis",
    category: "publications",
    keywords: ["water", "rdf", "tetrahedral", "voronoi", "asphericity", "orientation", "oh", "bond", "msd", "residence", "time"],
    content: "Water confinement analyses: RDF showed BN-GR strongest structural correlation (peak at 3.85A) vs MoS2-BN and GR-MoS2 (~4.5A). Orientational Tetrahedral Order (OTO): confined water Q~0.49, deviating from bulk Q=0.6686. Voronoi Asphericity: BN-MoS2 confined water showed highest asphericity = well-organized layered structure. O-H bond orientation: hydrophilic sheets (BN, MoS2) favor O-H bonds parallel to surface (80-100 degrees); hydrophobic GR has H pointing toward/away from sheet (10-30 and 150-170 degrees). Residence time: water between BN-MoS2 had least decay = most stable confinement.",
    metadata: { priority: 5, year: 2022, journal: "Journal of Materials Science" }
  },

  // ===============================
  // PUB: BUQ Sampling Algorithms (JCTC 2024) — DETAILED
  // ===============================
  {
    id: "pub-buq24-overview",
    category: "publications",
    keywords: ["sampling", "algorithm", "bayesian", "uncertainty", "force", "field", "jctc", "2024", "gold", "eam"],
    content: "Publication (2024): 'Evaluation of Sampling Algorithms Used for Bayesian Uncertainty Quantification of Molecular Dynamics Force Fields' — AT Sose, T Gustke, F Wang, G Anand, S Pasupuleti, A Savara, SA Deshmukh — JCTC. DOI: 10.1021/acs.jctc.4c00130. Open Access (CC-BY 4.0). Equal contribution: A.T.S. and T.G.",
    metadata: { priority: 7, year: 2024, journal: "JCTC", doi: "10.1021/acs.jctc.4c00130" }
  },
  {
    id: "pub-buq24-methods",
    category: "publications",
    keywords: ["buq", "ess", "aies", "metropolis", "hastings", "gradient", "search", "urs", "peuqse", "pso", "eam", "14", "parameter"],
    content: "BUQ sampling paper methods: Studied 5 sampling algorithms — Ensemble Slice Sampling (ESS), Affine-Invariant Ensemble Sampling (AIES), Metropolis-Hastings (MH), Gradient Search (GS), and Uniform Random Sampler (URS) — for Bayesian UQ of 14 EAM force field parameters for gold. PSO used for initial preoptimized starting point. AIES and ESS run with 56 walkers for 8M and 1.6M samples. PEUQSE software for Bayesian inference. Code on GitHub: github.com/Deshmukh-Group/BUQ_all-atom_gold.",
    metadata: { priority: 6, year: 2024, journal: "JCTC" }
  },
  {
    id: "pub-buq24-results",
    category: "publications",
    keywords: ["buq", "sampling", "result", "ess", "aies", "superior", "accuracy", "tighter", "bounds", "posterior"],
    content: "BUQ sampling key results: ESS and AIES demonstrated superior performance — more accurate parameter and property estimations with tighter uncertainty bounds — compared to MH, GS, and URS. These methods should be preferred for BUQ of MD force fields. Bimodal posterior distributions found for some parameters, providing physical insights. Convergence verified via ACT graphs and Geweke indices. The study established best practices for Bayesian UQ in computational materials science.",
    metadata: { priority: 6, year: 2024, journal: "JCTC" }
  },

  // ===============================
  // PUB: CG EAM (JCTC 2025)
  // ===============================
  {
    id: "pub-cgeam-overview",
    category: "publications",
    keywords: ["cg", "eam", "coarse", "grained", "embedded", "atom", "metal", "metals", "pd", "au", "ag", "cu", "pt",
      "palladium", "gold", "silver", "copper", "platinum", "fcc", "mapping", "8:1", "bead"],
    content: "Publication (2025): 'Development and Bayesian Uncertainty Quantification of Coarse-Grained Models of Metals Based on Embedded Atom Method Potentials' — AT Sose, T Gustke, K Bejagam, F Wang, A Savara, SA Deshmukh — J. Chem. Theory Comput. 2025, 21, 12481-12496. DOI: 10.1021/acs.jctc.5c01322. Developed the first uncertainty-aware coarse-grained (CG) Embedded Atom Method (EAM) potentials for five face-centered cubic (FCC) metals: palladium (Pd), gold (Au), silver (Ag), copper (Cu), and platinum (Pt). Each metal uses an 8:1 CG mapping scheme where eight metal atoms are represented by one CG bead (a 2x2x2 all-atom unit cell maps to one CG unit cell), preserving FCC lattice symmetry while giving roughly an 8-fold reduction in particle count for faster simulations. Code and the final EAM potential files are on GitHub at Deshmukh-Group/CG-EAM-Metals-BUQ.",
    metadata: { priority: 8, year: 2025, journal: "J. Chem. Theory Comput.", doi: "10.1021/acs.jctc.5c01322" }
  },
  {
    id: "pub-cgeam-methods",
    category: "publications",
    keywords: ["cg", "eam", "parameters", "pso", "particle", "swarm", "optimization", "gpr", "gaussian", "process",
      "regression", "sobol", "ess", "ensemble", "slice", "sampling", "lammps", "workflow", "14", "fourteen"],
    content: "Methods: each metal's CG EAM potential has 14 tunable parameters (rho_e, alpha, beta, A, B, lambda, kappa, Fn3, F2, Fe, eta, rho_m, the lattice constant Lc, and fe) governing the embedding-energy and pairwise-interaction terms. The workflow has four stages. (1) Particle Swarm Optimization (128 particles, at least 100 epochs) coupled with CG MD in LAMMPS optimizes the 14 parameters against 10 target properties, reaching agreement within 5% of experimental/DFT values. (2) The optimized parameters are perturbed with Sobol sequences at five levels (0.25%, 0.5%, 1%, 2%, 4%; 1,000 samples each, 5,000 total) to generate a training set of parameter-property pairs from further CG MD runs. (3) A Gaussian Process Regression (GPR) surrogate is trained per property, selecting among six kernels (RBF, Exponential, Matern 3/2, Matern 5/2, RBF+RBF, Cosine) via 5-fold cross-validation. (4) Bayesian Uncertainty Quantification refines the parameters using Ensemble Slice Sampling (56 walkers, 2,000,000 posterior samples), with the prior a bounded uniform distribution over a 4% perturbation of the PSO-optimized values. The 10 evaluated properties are cohesive energy, density, elastic constants C11/C12/C44, bulk modulus, Poisson's ratio, and surface tensions on the (100), (110), and (111) planes.",
    metadata: { priority: 8, year: 2025, journal: "J. Chem. Theory Comput." }
  },
  {
    id: "pub-cgeam-results",
    category: "publications",
    keywords: ["cg", "eam", "r2", "accuracy", "gpr", "surface", "tension", "true", "tightened", "bulk", "modulus",
      "coverage", "probability", "classification"],
    content: "Key results: GPR surrogates achieved R-squared values of roughly 0.9-0.999 across most property/metal combinations. Weaker fits (R-squared below 0.80) occurred for surface tension at the (111) plane for Au, Pd, Cu, and Pt; surface tension at (100) for Cu and Pt; and Poisson's ratio for Pt — these were excluded from the Bayesian refinement step to avoid injecting extra instability, consistent with EAM potentials' known tendency to underestimate surface energies. Using a coverage-probability diagnostic and a True-Tightened / True-Unchanged / True-Loosened classification scheme (introduced in the authors' prior JCTC 2024 paper), the bulk modulus was classified True-Tightened for all five metals, as was C44; C11 and C12 were True-Tightened for all metals except Ag and Cu. Poisson's ratio was generally True-Loosened across most metals, meaning Bayesian refinement widened rather than narrowed its uncertainty relative to the experimental target.",
    metadata: { priority: 8, year: 2025, journal: "J. Chem. Theory Comput." }
  },
  {
    id: "pub-cgeam-sensitivity",
    category: "publications",
    keywords: ["cg", "eam", "sobol", "sensitivity", "lattice", "constant", "kappa", "rho_e", "fe", "correlation",
      "bimodal", "silver", "posterior", "distribution"],
    content: "Sensitivity findings (first-order Sobol indices): most properties across all five metals were most sensitive to the lattice constant (Lc), the scaled equilibrium bond distance between CG beads. For every metal except platinum, the second most sensitive parameter was rho_e (a coarse-grained proxy for local electron density). Cohesive energy specifically was most sensitive to Fe (the high-electron-density embedding coefficient) and B (the pairwise attraction coefficient) across all metals. Platinum was the outlier: most of its properties were dominated by kappa, the cutoff parameter for the short-range repulsive term, rather than by rho_e. Silver's posterior distributions were notably bimodal (two distinct high-probability parameter solutions, or 'modes') for several parameters and properties, indicating a rougher potential-energy surface with multiple competing local minima compared to the other four metals; corner plots in the paper mark these as Mode 1 and Mode 2 with separate robust parameter ranges reported for each.",
    metadata: { priority: 7, year: 2025, journal: "J. Chem. Theory Comput." }
  },

  // ===============================
  // PUB: JACS MOF Drug Release (2025)
  // ===============================
  {
    id: "pub-jacs",
    category: "publications",
    keywords: ["mof", "drug", "release", "photoactivated", "jacs", "cornell", "cancer", "light", "uio", "azb", "azobenzene", "2025"],
    content: "Publication (2025): 'Photoactivated Multivariate Metal-Organic Frameworks for On-Demand Drug Release: The Role of Host-Guest Interactions' — HD Cornell*, AT Sose* (co-first) et al. — JACS. DOI: 10.1021/jacs.4c15222. Developed visible-light-responsive UiO-AZB MOFs with azobenzene-functionalized linkers for targeted anti-cancer drug delivery. Light triggers conformational change in azobenzene, enabling on-demand controlled drug release. Combined computational (MD/GCMC) and experimental studies to understand host-guest interactions driving the photoactivated release mechanism.",
    metadata: { priority: 7, year: 2025, journal: "JACS", doi: "10.1021/jacs.4c15222" }
  },

  // ===============================
  // PUB: FeNiCrCoCu MPEAs (npj 2025)
  // ===============================
  {
    id: "pub-mpea-overview",
    category: "publications",
    keywords: ["mpea", "alloy", "inverse", "design", "explainable", "ai", "npj", "fenicrcocu", "shap", "2025", "bulk", "modulus"],
    content: "Publication (2025): 'Experimentally Validated Inverse Design of FeNiCrCoCu MPEAs' — F Wang, A Iwanicki, AT Sose et al. — npj Computational Materials. DOI: 10.1038/s41524-025-01600-x. 4,596 accesses, 8 citations. Developed stacked ensemble ML (SEML) model and CNN with evolutionary algorithms to identify new FeNiCrCoCu multi-principal element alloy compositions with high bulk modulus and unstable stacking fault energies (USFE). Synthesized compositions confirmed single-phase FCC structures with Young's moduli in qualitative agreement with predictions.",
    metadata: { priority: 7, year: 2025, journal: "npj Computational Materials", doi: "10.1038/s41524-025-01600-x" }
  },
  {
    id: "pub-mpea-details",
    category: "publications",
    keywords: ["mpea", "shap", "cnn", "stacked", "ensemble", "elemental", "concentration", "mechanical", "property", "clustering"],
    content: "MPEA paper details: SHAP analysis of the SEML model revealed relationship between elemental concentration and USFE. SHAP analysis of CNN models uncovered correlations between local clustering of MPEA elements and mechanical properties. Computational workflow can be expanded to different elemental compositions and materials beyond MPEAs.",
    metadata: { priority: 6, year: 2025, journal: "npj Computational Materials" }
  },

  // ===============================
  // PUB: MoS2-Water (J Phys Chem C 2022)
  // ===============================
  {
    id: "pub-mos2-overview",
    category: "publications",
    keywords: ["mos2", "molybdenum", "disulfide", "water", "interaction", "parameters", "interfacial", "2022"],
    content: "Publication (2022): 'Determination of Accurate Interaction Parameters between the Molybdenum Disulfide and Water to Investigate Their Interfacial Properties' — AT Sose, E Mohammadi, PF Achari, SA Deshmukh — The Journal of Physical Chemistry C, 126(4), 2013-2022. MoS2 is attractive for energy storage, sensing, and lubricant applications, but its performance is sensitive to environmental humidity, so accurately modeling the MoS2-water interface matters for device design.",
    metadata: { priority: 6, year: 2022, journal: "J. Phys. Chem. C" }
  },
  {
    id: "pub-mos2-methods",
    category: "publications",
    keywords: ["mos2", "stillinger", "weber", "sw", "potential", "forcefield", "force", "field", "pso", "particle",
      "swarm", "optimization", "nonbonded", "parameters", "water", "model", "tip3p", "spc"],
    content: "Methods: MoS2 was represented using the Stillinger-Weber (SW) potential rather than a simple pairwise Lennard-Jones form. The paper develops precise nonbonded cross-interactions between this SW-parameterized MoS2 and three different water models. Force-field parameter development was accelerated by integrating Particle Swarm Optimization (PSO) directly with molecular dynamics (MD) simulations, tuning the cross-interaction parameters against two independent targets simultaneously: the experimentally measured macroscopic water contact angle on MoS2, and water-MoS2 binding energies obtained from quantum mechanical (DFT-level) calculations.",
    metadata: { priority: 6, year: 2022, journal: "J. Phys. Chem. C" }
  },
  {
    id: "pub-mos2-results",
    category: "publications",
    keywords: ["mos2", "contact", "angle", "wettability", "hydrophobic", "results", "binding", "energy", "accuracy"],
    content: "Key results: the PSO-optimized cross-interaction parameters reproduced a macroscopic water contact angle of approximately 63-70 degrees on MoS2, in good agreement with experimentally reported values in the literature. Because the parameters were fit against both contact angle and quantum-mechanical binding energies simultaneously (rather than either alone), the resulting force field is intended to be more transferable across the different water models tested than parameters fit to a single target. These validated cross-interaction parameters enable more reliable MD simulations of MoS2 wetting, interfacial water structure, and dynamics under varying humidity — relevant to MoS2 use in electronics, catalysis, and sensing.",
    metadata: { priority: 6, year: 2022, journal: "J. Phys. Chem. C" }
  },

  // ===============================
  // PUB: MOF Membranes (ACS Appl. Nano 2022)
  // ===============================
  {
    id: "pub-membrane",
    category: "publications",
    keywords: ["nemd", "mof", "membrane", "h2", "ch4", "separation", "gas", "dual", "force", "2022"],
    content: "Publication (2022): 'Dual-Force Zone NEMD Simulations on Nanoporous MOF Membranes for Separation of H2/CH4 Mixtures' — F Wang, AT Sose, SK Singh, SA Deshmukh — ACS Applied Nanomaterials. Used dual-force zone non-equilibrium MD (DFZ-NEMD) to investigate gas transport and separation through nanoporous MOF membranes. Evaluated permeability and selectivity of H2/CH4 mixtures through polymer-MOF mixed matrix membranes.",
    metadata: { priority: 6, year: 2022, journal: "ACS Applied Nanomaterials" }
  },

  // ===============================
  // PUB: AEM Polymers (J Mat Informatics 2025)
  // ===============================
  {
    id: "pub-aem",
    category: "publications",
    keywords: ["fluorine", "free", "polymer", "anion", "exchange", "membrane", "aem", "2025", "sustainable"],
    content: "Publication (2025): 'AI-Driven Design of Fluorine-Free Polymers for Sustainable and High-Performance Anion Exchange Membranes' — W Schertzer, S Shukla, AT Sose, R Rafiq, MA Otmi, J Sampath, RP Lively, R Ramprasad — Journal of Materials Informatics.",
    metadata: { priority: 6, year: 2025, journal: "Journal of Materials Informatics" }
  },

  // ===============================
  // PUB: Nature Review Materials & Nature Protocols (2026)
  // ===============================
  {
    id: "pub-nrm",
    category: "publications",
    keywords: ["thermal", "shock", "catalyst", "nature", "review", "materials", "hu", "liangbing", "2026"],
    content: "Publication (Submitted 2026): 'Thermal-shock catalysts: principles, materials design, and catalytic performance' — T Li, F Bu, AT Sose et al. — Nature Review Materials.",
    metadata: { priority: 6, year: 2026, journal: "Nature Review Materials" }
  },
  {
    id: "pub-np",
    category: "publications",
    keywords: ["robot", "plastic", "substitutes", "natural", "nature", "protocol", "li", "chen", "2026"],
    content: "Publication (Under Review 2026): 'A robotics and machine learning integrated workflow for discovering all-natural plastic substitutes' — Y Li*, AT Sose* (co-first author), T Chen, PY Chen — Nature Protocols.",
    metadata: { priority: 6, year: 2026, journal: "Nature Protocols" }
  },

  // ===============================
  // PUB: Microcontact Printing (2019) & 2017 papers
  // ===============================
  {
    id: "pub-stamp",
    category: "publications",
    keywords: ["stamp", "microcontact", "printing", "lithography", "scientific", "reports", "iit", "2019"],
    content: "Publication (2019): 'Low Cost and Lithography-Free Stamp Fabrication for Microcontact Printing' — A Khadpekar, M Khan, AT Sose, A Majumder — Nature Scientific Reports.",
    metadata: { priority: 5, year: 2019, journal: "Nature Scientific Reports" }
  },
  {
    id: "pub-2017",
    category: "publications",
    keywords: ["2017", "oil", "heavy", "metal", "sludge", "sewage", "early", "undergraduate"],
    content: "Early publications (2017): 'Oil industry–Analysis, effects and removal of heavy metals' — AT Sose, SJ Kulkarni, MT Sose (Int. J. Eng. Sci. Res. Technol). 'Characterization of Sludge and Design of Activated Sludge Process for Sewage Treatment' — SJ Kulkarni, AT Sose, MT Sose (IOSR J. Environ. Sci.).",
    metadata: { priority: 4, year: 2017 }
  },

  // ===============================
  // SKILLS
  // ===============================
  {
    id: "skills-1",
    category: "skills",
    keywords: ["skills", "software", "tools", "programming", "python", "code", "language", "lammps", "vasp", "gromacs", "namd", "raspa", "gaussian"],
    content: "Technical skills: Simulation — LAMMPS, NAMD, VASP, Gaussian, CHARMM-GUI, GROMACS, RASPA 2.0. ML — PyTorch, TensorFlow, JAX, Keras, Bayesian Inference (PEUQSE, ZEUS). Programming — Python, C++, Bash, Fortran, TCL, SQL. Modeling — NEMD, Free Energy Calculations, AIMD, Monte Carlo, Steered MD, DFT.",
    metadata: { priority: 7 }
  },

  // ===============================
  // AWARDS, MENTORING, CONFERENCES, HPC, IMPACT
  // ===============================
  {
    id: "awards-1",
    category: "awards",
    keywords: ["award", "honor", "prize", "recognition", "best", "outstanding"],
    content: "Awards: (1) Outstanding Student Paper Award, Computational & Theoretical Chemistry, RSC Advances (2022). (2) 2nd place best talk, Carbon Nanomaterials, AIChE (2022). (3) 3rd place best talk, Inorganic Materials, AIChE (2022). (4) Best Poster, MII Technical Conference (2022). (5) GPSS Graduate Travel Award for AIChE 2022.",
    metadata: { priority: 7 }
  },
  {
    id: "mentoring-1",
    category: "mentoring",
    keywords: ["mentor", "teach", "student", "advise", "supervise", "instructor", "peuqse"],
    content: "Mentored 2 Ph.D. students and multiple undergraduates at Virginia Tech in BUQ and force field development. At Georgia Tech, led an undergraduate in multi-task ML. Instructor for PEUQSE software at ACS Fall 2022. At IIT Bombay, mentored 30 students in biodiesel production.",
    metadata: { priority: 6 }
  },
  {
    id: "conf-1",
    category: "conferences",
    keywords: ["conference", "talk", "presentation", "oral", "poster", "aiche", "acs", "mrs"],
    content: "12 conference presentations: AIChE Annual Meeting (2020, 2022 — multiple oral talks), ACS Fall Meeting (2022 — talks + PEUQSE workshop instruction), MRS Fall Meeting (2020, 2021), ChEGSA Symposium (2022). Topics: MOFs, CG modeling, BUQ, water confinement, CNNs, polymer-MOF compatibility, CO2 adsorption.",
    metadata: { priority: 6 }
  },
  {
    id: "hpc-1",
    category: "computing",
    keywords: ["hpc", "computing", "supercomputer", "nersc", "cluster", "core", "hours"],
    content: "Secured ~3 million core hours on NERSC; utilized 12+ million core hours across NERSC, Virginia Tech ARC, Georgia Tech PACE, and San Diego Supercomputing Center.",
    metadata: { priority: 5 }
  },
  {
    id: "impact-1",
    category: "impact",
    keywords: ["citation", "impact", "publication", "count", "paper", "how", "many", "first", "author"],
    content: "17 peer-reviewed articles (including 2 under review/submitted in 2026). 8 first-author, 4 co-first-author. 331 total citations. Contributed to securing NSF CAREER award for Ph.D. advisor through preliminary data generation.",
    metadata: { priority: 7 }
  },
  {
    id: "future-1",
    category: "career",
    keywords: ["faculty", "professor", "job", "market", "hire", "position", "group", "lab", "future", "plan", "goal"],
    content: "Abhishek is on the academic job market for faculty positions. Plans to establish a research group focusing on AI-driven materials discovery, autonomous self-driving laboratories, and multi-scale computational materials design — from DFT through MD/FEA to robotic experimental verification.",
    metadata: { priority: 8 }
  },

  // ===============================
  // CROSS-CUTTING RESEARCH THEMES
  // ===============================
  {
    id: "theme-mof",
    category: "research",
    keywords: ["mof", "metal", "organic", "framework", "porous", "adsorption", "drug", "delivery", "gas", "storage", "carbon", "capture"],
    content: "MOF expertise across 4 applications: (1) Drug delivery — light-responsive UiO-AZB for anti-cancer drugs (JACS 2025), solvent effects on drug adsorption (RSC Advances 2021, Outstanding Paper Award). (2) H2 storage — functionalized IRMOF-10 with 6x enhanced adsorption via PSO-GA (JCTC 2023). (3) Gas separation — H2/CH4 via NEMD on MOF membranes (ACS Appl. Nano 2022). (4) CO2 capture — identified 19 amine groups enhancing CO2 adsorption. Methods: GCMC, NEMD, UFF, steered MD.",
    metadata: { priority: 8 }
  },
  {
    id: "theme-buq",
    category: "research",
    keywords: ["bayesian", "uncertainty", "quantification", "buq", "force", "field", "parameter", "pso", "optimization", "peuqse"],
    content: "BUQ is central to Abhishek's research: JCTC 2024 evaluated 5 sampling algorithms for all-atom gold EAM (ESS and AIES best); JCTC 2025 developed CG EAM for 5 FCC metals with BUQ. Both use PSO for initial parameters then Bayesian inference via PEUQSE. He teaches PEUQSE workshops and contributed to his advisor's NSF CAREER award on this topic.",
    metadata: { priority: 8 }
  },
  {
    id: "theme-2d",
    category: "research",
    keywords: ["graphene", "boron", "nitride", "mos2", "2d", "material", "hybrid", "nanosheet", "water", "interface"],
    content: "2D materials work: Novel hybrid layered graphene/BN/MoS2 with water confinement (J. Mater. Sci. 2022) — BN-MoS2 interface promotes ordered water. MoS2-water parameters via PSO (J. Phys. Chem. C 2022). Deep learning (CNN) for confined water structure prediction. Group contributions to graphene-water and BN-water force fields.",
    metadata: { priority: 7 }
  },
  {
    id: "theme-ml",
    category: "research",
    keywords: ["machine", "learning", "materials", "discovery", "accelerated", "design", "data", "driven", "informatics"],
    content: "ML for materials spans: green solvents (GPR+LLMs for 10,189 solvents, Adv. Sci. 2025), alloys (stacked ensemble+SHAP for MPEAs, npj 2025), MOFs (RF/LGBM/3D-CNN, JCTC 2023), tribology (comprehensive ML review, PCCP 2023), polymers (Li-ion conductivity for 6,042 polymers, MLIPs benchmarking). Techniques: GPR, RF, SVM, CNN, MLP, GBM, stacked ensembles, LLMs (GPT-3.5, LLaMA), Bayesian inference.",
    metadata: { priority: 8 }
  }
];
