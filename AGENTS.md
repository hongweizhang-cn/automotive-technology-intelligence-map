# ATIM — Agent Guidelines & Project Operating Principles

> **Automotive Technology Intelligence Map (ATIM)**
> Local Project Path: `D:\github\hongweizhang-cn\automotive-technology-intelligence-map`
> Target Audience: Automotive software engineers, E/E architects, and systems researchers.

This document defines the core principles, domain models, technical constraints, and operating procedures for AI agents collaborating on the ATIM project. Every collaborating agent must read and adhere to these guidelines.

---

## 1. Project Mission & Identity

ATIM is an interactive, bilingual automotive technology knowledge graph. It is **not** a generic encyclopedia or marketing infographic, and **not** a production-vehicle build configurator.

Its core purpose is:
**To help automotive software and systems engineers build a structured, end-to-end understanding of modern vehicle systems, E/E architectures, software platforms, hardware components, in-vehicle networks, standards, and industry ecosystems through interactive exploration.**

### Exploration Hierarchy
```
Vehicle / Propulsion Topology
  └── Vehicle Systems (e.g., Battery, Braking, ADAS)
        └── Subsystems & Hardware Assemblies (e.g., BDU, Pack)
              └── Electronic Control Units (ECUs) / Controllers
                    ├── Semiconductors & Hardware Components
                    ├── Sensors & Actuators
                    ├── In-Vehicle Networks & Buses (CAN FD, LIN, Ethernet)
                    ├── Communication Protocols (SOME/IP, DoIP, UDS)
                    ├── Software Platforms & Frameworks (AUTOSAR, SOA, SDV)
                    └── Standards & Specifications (ISO 26262, ISO 21434)
```

---

## 2. Core Business Concepts & Dimensions

### 2.1 Six Propulsion Architectures
The system models six powertrain types:
- **ICE** — Internal Combustion Engine
- **BEV** — Battery Electric Vehicle
- **HEV** — Hybrid Electric Vehicle
- **PHEV** — Plug-in Hybrid Electric Vehicle
- **EREV** — Extended-Range Electric Vehicle
- **FCEV** — Fuel Cell Electric Vehicle

Each powertrain has an illustrative reference topology, distinct system sets, and relevant ECUs. Switching powertrains must cleanly update visible systems, controllers, and relationships.

### 2.2 Four E/E Architectures
E/E Architecture is a distinct architectural dimension from propulsion:
- **Distributed Architecture** — Traditional dedicated ECUs per function
- **Domain Architecture** — Domain Controllers (Powertrain, Body, ADAS, Cockpit)
- **Zonal Architecture** — Zonal Controllers (Front, Rear, etc.) with centralized computing
- **Centralized Computing Architecture** — Central compute brain with vehicle-wide abstraction

*Note on current implementation:* In the current data model, each architecture record pairs one propulsion type with an E/E type. Complete runtime decoupling into an orthogonal matrix is a planned short-term goal.

### 2.3 Knowledge Organization: Entities vs. Relationships vs. Hierarchy
- **Entity**: A distinct node in the knowledge graph belonging to one of 9 categories (`system`, `ecu`, `sensor`, `actuator`, `hardware`, `network`, `technology`, `standard`, `company`).
- **Relationship**: Explicit, typed directional links between entities (15 types: `related_to`, `contains`, `part_of`, `controls`, `monitors`, `communicates_with`, `connected_to`, `powered_by`, `distributes_power_to`, `depends_on`, `implements`, `uses`, `integrates`, `transports`, `defines`).
- **Hierarchy Handling (Three Distinct Contexts)**:
  1. *Human-Maintained & Stored Hierarchy*: Explicit `parentId` and `hierarchyType` (`composition` | `subsystem`) stored on entities or defined in imported JSON are respected and preserved.
  2. *Automatic Runtime Derivation*: During data loading and validation, if an entity has no `parentId`, the system automatically derives `parentId` and `hierarchyType` from explicit `contains` (`composition`) or `part_of` (`subsystem`) relations.
  3. *Legacy Data Migration*: Unspecified legacy links (`relatesTo`) migrate to `related_to` without fabricating hierarchical links, while existing legacy `parentId` fields are preserved.
  *Agent Rule*: Agents must **never** infer, guess, or fabricate parent-child relationships from entity naming, visual convenience, or intuitive assumptions. Any agent-introduced hierarchy must be grounded in verified engineering relations.
- **Cross-cutting Attributes**: Technologies like Functional Safety (ISO 26262), Cybersecurity (ISO/SAE 21434), and Diagnostics (UDS/DoIP) cross multiple domains and should be surfaced via badges/metadata without flattening their entity status.

---

## 3. Technology Stack

- **Framework**: React 19 + TypeScript (~5.9)
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 + custom CSS (`src/styles.css`)
- **Graph Visualization**: `@xyflow/react` (React Flow 12)
- **Graph Layout Engine**: `elkjs` (~0.12, dynamically imported via `import('elkjs/lib/elk.bundled.js')`)
- **Icons**: `lucide-react`
- **Internationalization**: `i18next` + `react-i18next`
- **Testing**: Vitest 5 (unit tests for data services, helpers, and comparisons)
- **Storage**: Browser `localStorage` (local-first; no backend, no cloud database)

---

## 4. Non-Negotiable Operational Principles

> [!CAUTION]
> The following rules are absolute. Any modification violating these rules is considered a critical defect.

1. **Preserve Identifiers**: Never delete or rename existing Entity IDs or Relationship IDs. ID stability is required for user bookmarks, notes, and references.
2. **Never Clear `localStorage`**: User favorites, study notes, review statuses, and custom edits must never be wiped or reset during updates.
3. **Data Protection Over Aesthetics**: Never delete or prune underlying data to make a diagram or UI layout look simpler. Visual filtering must happen at the view layer.
4. **No Fabricated Information**: Unverified claims must not be presented as facts. Distinguish between *Reference Architecture*, *Industry Typical Solution*, and *Production Vehicle Configuration*.
5. **No Guessed Relationships**: Do not create relationships simply because two concepts often appear together in literature. Every link must represent a verified engineering relationship with citations where feasible.
6. **Agent Review Gating**: Any data ingested or generated by an Agent must be flagged with `createdBy: 'Agent'`, `reviewStatus: 'Pending Review'`, `verificationStatus: 'Unverified'`, and `confidence: 'Unverified'`. Agent data **cannot** be auto-approved without human confirmation.
7. **Schema Migration Compatibility**: Any schema update must include backward-compatible migration logic (`version` increment, migration handlers in `dataService.ts`, and fallback defaults).
8. **No Unauthorized Git Actions**: Agents must never execute `git commit`, `git push`, `git reset --hard`, or `git clean -fd` unless specifically instructed by the user.

---

## 5. UI / UX Design Principles

- **Clarity over Information Density**: The goal is comprehensibility, not rendering maximum nodes and edges on screen.
- **Stable Layouts**: Filter toggles, hover actions, and node selection must not trigger unexpected layout re-computations or viewport jumps.
- **Explicit Relationship Semantics**: Group edges by category (Communication, Control, Dependency, Power Flow, Network) with consistent visual styles.
- **Preserve Focus Context**: When focusing a node, highlight only true 1-degree neighbors; dim other elements cleanly; provide one-click "Clear Focus".
- **Responsive Layout**: Maintain panel usability across desktop and tablet screen sizes without breaking map viewport controls.

---

## 6. Internationalization (i18n) Rules

- **Default Language**: English (`en`).
- **Supported Languages**: English (`en`) and Simplified Chinese (`zh`).
- **Persistence**: Persisted in `localStorage` under `atim-language`.
- **No Hardcoded UI Strings**: All new user-facing text must be registered in `src/i18n.ts` or passed through bilingual `LocalizedText` (`{ zh: string, en: string }`).
- **Technical Terminology**: Recognized automotive terms (e.g., *Automotive Ethernet*, *SOME/IP*, *Domain Controller*, *AUTOSAR*, *BMS*, *VCU*) may remain in English within Chinese text when standard industry practice dictates.

---

## 7. Development & Verification Workflow

### 7.1 Environment Setup (Windows / PowerShell)
Always use `npm.cmd` rather than `npm` due to PowerShell script execution policies:
```powershell
npm.cmd run typecheck    # TypeScript verification (must pass with 0 errors)
npm.cmd test             # Vitest unit test suite (must pass 28/28 tests)
npm.cmd run build        # Production bundle build verification
npm.cmd run dev          # Local development server
```

### 7.2 Command Chaining Rule
In the Windows PowerShell sandbox, chain dependent commands with `;` (semicolon), not `&&`:
```powershell
Set-Location D:\github\hongweizhang-cn\automotive-technology-intelligence-map; npm.cmd test
```

### 7.3 Step-by-Step Change Discipline
1. **Understand**: Read existing files and inspect data flows before designing modifications.
2. **Plan**: Identify the minimal, cleanest change set that meets the objective without side effects.
3. **Implement**: Keep changes modular and adhere to existing styling and typing patterns.
4. **Verify**: Run `typecheck`, `test`, and `build` to verify zero regressions.
5. **Report**: Clearly summarize modified files, verification results, and any architectural observations.
