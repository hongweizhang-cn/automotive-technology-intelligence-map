# ATIM Development Roadmap

> **Automotive Technology Intelligence Map**
> Status: Living Document (Advisory Roadmap)
> Note: This roadmap outlines recommended engineering directions and does not constitute pre-approved feature commitments.

---

## 1. Current Foundation (Completed through Phase 2.5)

The project currently has a stable, verified local-first foundation:

- **Interactive Vehicle Architecture Map**:
  - React Flow canvas with custom node cards and group containers.
  - Three specialized map views: System Structure, Relationship View, and Full Graph.
  - Asynchronous ELK.js layered layout engine with orthogonal edge routing.
  - Bidirectional 1-degree neighbor discovery with focus and dimming.
  - Breadcrumb-guided step-by-step hierarchical exploration.
  - Category and relationship-type filtering with interactive color-coded legends.
- **Six Powertrain Reference Architectures**:
  - Seed configurations for ICE, BEV, HEV, PHEV, EREV, and FCEV.
  - Distinct system allocations, ECU scopes, and illustrative topologies.
- **Four E/E Topology Visualizations**:
  - Distributed, Domain, Zonal, and Centralized Computing controller sets.
- **Technology Explorer**:
  - Domain filtering across vehicle communication, software architecture, Ethernet, diagnostics, and SDV.
  - Full-text bilingual search, technical specifications, and cross-cutting attribute tags.
  - Interactive multi-hop graph exploration starting from any selected technology.
- **Architecture Comparison Engine**:
  - Side-by-side evaluation across 22 technical dimensions (12 propulsion, 10 E/E).
  - Synchronized table view and responsive card view.
  - Explicit provenance and verification status indicators per data cell.
- **Local Data Governance & Management**:
  - Full CRUD for entities, relationships, architectures, and evidence sources.
  - Version 1 to Version 2 schema migration and JSON import/export.
  - Strict validation engine with referential integrity, cycle detection, and ID format checks.
  - Agent data protection (Agent-created data is restricted to `Pending Review` / `Unverified`).
  - Automated data quality audit dashboard and 500-entry change history log.
- **Bilingual Interface**:
  - English and Simplified Chinese support with persistent user preference.
- **Automated Verification**:
  - TypeScript strict typing (zero compiler errors).
  - 28 unit tests covering data services, migrations, layout helpers, and comparison rules.

---

## 2. Short-term Improvements (Advisory Proposals — Unapproved)

> [!IMPORTANT]
> The items in this section are **advisory recommendations** based on architectural analysis. They are **not active development tasks** and **have not been approved for implementation**. Any development must await explicit user authorization.

### 2.1 Decouple E/E Architecture from Propulsion Data Model
- **Problem**: Currently, each `Architecture` object stores a single `eeArchitecture` field. In the UI, switching E/E architecture dynamically alters the controllers of that single record rather than querying an orthogonal matrix.
- **Action (Proposed)**:
  - Refactor data model so that E/E architectures and propulsion systems are independent dimensions.
  - Define clear composition rules: `VehicleConfiguration = PropulsionType × EEArchitecture`.
  - Maintain backward compatibility for existing exported v2 JSON files.

### 2.2 Data-Driven Technology Radar
- **Problem**: The Radar view currently classifies technologies into three hardcoded groups (`Established`, `Evolving`, `Emerging`) using static entity ID lists in `src/App.tsx`.
- **Action (Proposed)**:
  - Add an optional `maturityGroup` (`'established' | 'evolving' | 'emerging'`) to `TechnologyDetails` in `src/types.ts`.
  - Update seed data and `DataManagement.tsx` to allow editing technology maturity.
  - Update `RadarPage` to dynamically group entities by this field instead of hardcoded lists.

### 2.3 Modularize App.tsx
- **Problem**: `IndustryPage`, `RadarPage`, and `LearningPage` are declared inline inside `src/App.tsx`, causing the file to exceed 490 lines and mixing concerns.
- **Action**:
  - Extract `IndustryPage` into `src/pages/IndustryPage.tsx`.
  - Extract `RadarPage` into `src/pages/RadarPage.tsx`.
  - Extract `LearningPage` into `src/pages/LearningPage.tsx`.

### 2.4 Layout Stability & Visual Ergonomics
- **Problem**: ELK layout re-calculates when `expandedIds` changes, which can cause unexpected shifts in node positions during step-by-step exploration.
- **Action**:
  - Cache initial node positions for fixed parent nodes during sub-graph expansion.
  - Evaluate transition animations or position pinning to preserve mental map stability.
  - Perform visual verification in real browsers across standard desktop display resolutions.

### 2.5 i18n Standardization
- **Problem**: Codebase currently mixes `t('key')` dictionary lookups with component-level `t(zh, en)` ternary helpers.
- **Action**:
  - Unify all UI strings into centralized dictionary files (`src/locales/en.json`, `src/locales/zh.json`).
  - Replace inline ternary language checks with typed translation keys.

### 2.6 Test Coverage Expansion
- **Problem**: Unit tests cover core services and data logic, but component rendering and user interaction flows lack automated tests.
- **Action**:
  - Add `@testing-library/react` tests for key component behaviors (node selection, filter toggling, import error display).

---

## 3. Long-term Vision

### 3.1 Advanced Automotive Technology Knowledge Graph
- Multi-hop relationship path finding (e.g., "Find all network paths between Wheel Speed Sensor and ESP ECU").
- Domain ontology alignment with standard automotive frameworks (AUTOSAR Classic/Adaptive, COVESA, SOAFEE).
- Interactive sub-graph extraction and visual export (SVG / high-resolution PNG).

### 3.2 Dynamic Technology Radar
- Temporal tracking of automotive technology maturity over time (historical milestones and projected adoption).
- Categorization by automotive domains (Chassis, Powertrain, ADAS/AD, Cockpit, Connectivity, Body).
- Interactive radar chart visualization (concentric blips with quadrant filtering).

### 3.3 Industry & Ecosystem Intelligence
- Structured supply chain relationship mapping (OEM ↔ Tier 1 ↔ Tier 2 ↔ Semiconductor Provider).
- Platform sourcing maps (identifying which Tier-1 platforms or chips are used across production vehicles).
- Technology adoption tracking by major automotive manufacturers.

### 3.4 AI-Assisted Intelligence Collection Pipeline
- Structured ingestion pipeline for technical standards, whitepapers, and conference publications.
- Automated knowledge extraction with strict human-in-the-loop review staging.
- Evidence snippet attribution with automated citation verification.

### 3.5 Personal Learning & Engineering Study Center
- Guided learning pathways for engineers transitioning to automotive software (e.g., "From Traditional CAN to SOME/IP and SDV").
- Rich-text study notebooks linked directly to graph nodes.
- Engineering concept self-assessment and knowledge verification checks.

### 3.6 Scalable Data Storage & Backend Architecture
- Optional cloud/server persistence adapter for team collaboration.
- Version-controlled graph storage (Git-like branch/merge for automotive architecture models).
- Role-based review and publication workflows for multi-engineer environments.
