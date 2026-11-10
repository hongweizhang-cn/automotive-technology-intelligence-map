# Automotive Technology Intelligence Map

An interactive, bilingual knowledge map for exploring automotive vehicle systems, ECUs, communication networks, software, hardware, standards, and industry participants.

## Project Introduction

ATIM is a local-first MVP for automotive software engineers, E/E architects, and technology leaders. It combines an explorable reference architecture with a shared, editable knowledge base. It is not a production-vehicle configuration database.

## Project Vision

Build an evolvable automotive technology knowledge graph that helps users follow relationships from vehicle architecture down to systems, controllers, networks, semiconductors, software technologies, standards, and industry organizations.

## Key Features

- Interactive React Flow architecture map with a custom vehicle outline, pan/zoom, category layers, search, typed directional relationship labels, selectable relationship-type filters, adjacent-node highlighting, relationship details, and step-by-step system/ECU exploration.
- Six propulsion reference architectures: ICE, BEV, HEV, PHEV, EREV, and FCEV. Powertrain topology is kept separate from the selectable E/E architecture.
- Technology Explorer with five automotive engineering domains, bilingual search, status-aware technical profiles, typed relationship traversal, source details, architecture-map navigation, favorites, and note-taking.
- Architecture Comparison for selecting two to four propulsion types or E/E architectures, with grouped/collapsible dimensions and table/card views. It uses recorded systems, ECUs, topology, networks, and optional bilingual comparison profiles; unavailable and inapplicable data are distinct.
- Industry directory for representative organizations, explicitly labeled as general capability rather than confirmed supplier relationships.
- Qualitative Technology Radar; its groupings are directional themes, not market forecasts.
- Data Management for local entity creation, editing, deletion guards, typed relationships, multiple evidence sources, independent review/verification states, JSON import/export, and change history.
- Vehicle architecture record management, including propulsion/E/E combinations and system/ECU membership. Each propulsion type must retain an approved reference architecture.
- Local favorites and per-entity learning notes.
- Chinese and English interface and entity content.
- Global entity search across bilingual names, IDs, and descriptions, with entity type, propulsion, and E/E architecture filters.
- A dynamic data quality summary for duplicate records, missing bilingual information, invalid/dangling relations, unverified sources, and Agent review state.

## Supported Vehicle Architectures

Each propulsion type has an illustrative reference topology and a different set of applicable systems and ECUs. E/E architecture is an independent setting with Distributed, Domain, Zonal, and Centralized Computing options.

| Propulsion | Reference coverage |
| --- | --- |
| ICE | Engine management, fuel, ignition, transmission, aftertreatment, body, chassis, ADAS, infotainment, and network systems |
| BEV | Battery, high-voltage distribution, charging, electric drive, energy, body, chassis, ADAS, and network systems |
| HEV / PHEV | Engine and electric drive, battery, hybrid control, and applicable charging systems |
| EREV | Separate wheel-traction electric-drive and engine-generator range-extender paths |
| FCEV | Fuel-cell, hydrogen storage/supply, air supply, battery, and electric-drive reference systems |

These are generic reference architectures and do not describe the actual configuration of a named production vehicle. Battery pack, BDU, contactor/pre-charge, sensing, and distribution content describes functional boundaries; physical integration varies by design. Domain, zonal, and centralized-computing nodes marked logical are topology illustrations, not claims about a specific ECU count, location, or production design. The map layout changes with the selected E/E organization; its grouping does not encode vehicle mounting locations.

## Technology Stack

- React, TypeScript, Vite
- Tailwind CSS 4 and project-specific CSS
- `@xyflow/react` for the interactive architecture graph
- Lucide React for icons
- i18next / react-i18next for bilingual UI
- JSON/TypeScript seed data and browser `localStorage`

## Project Structure

```text
src/
  components/       Architecture map and entity detail panel
  data/             Initial automotive reference dataset
  pages/            Technology Explorer, Architecture Comparison, and Data Management
  services/         Local persistence, history, import validation, comparison, search, and quality checks
  types.ts          Shared entity and architecture types
  i18n.ts           English and Chinese UI resources
  App.tsx           App shell and remaining feature views
  styles.css        Responsive industrial dark theme
```

## How to Run

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Verify a production bundle with:

```bash
npm run typecheck
npm run build
npm test
```

The Vitest suite covers reference architecture coverage, relationship integrity and invalid targets, version 1 migration and version 2 JSON round-tripping, localStorage reads/writes, Agent review enforcement, independent review/source-verification states, architecture comparison accuracy, bilingual search filters, data quality checks, and language switching.

## Data Management

Open **Data Management** to search and filter entities, add or edit bilingual records and typed relationships, manage technology domains and detail fields, evidence sources (including publication date), confidence, content-review and source-verification states, or inspect change history. The Vehicle Architectures tab manages reference topology records and their system/ECU membership. Approved entities are shown in the architecture map; Technology Explorer also exposes pending-review knowledge with its status visible. Entity deletion is blocked when another entity or a vehicle architecture references it.

JSON export downloads the current version 2 data. Import accepts version 1 and version 2, validates required fields, duplicate IDs, and entity/architecture references before replacing the current data. Version 1 relationships are retained as generic links with explicitly unspecified semantics; missing metadata is migrated without inventing evidence. Failed imports leave the existing dataset unchanged. Existing version 1 local data is migrated in place when it can be saved; browser history, favorites, and notes remain in their separate storage keys.

Application data, change history, favorites, and learning notes are stored in this browser only. Clearing browser storage removes local changes. No account, backend, or cloud sync is included.

## Data Quality and Review

Seed architectures are illustrative reference data, not production configurations. The company directory describes representative organizations and general capabilities only; it does not assert vehicle-specific supply relationships. New technology content is marked **Pending Review** and **Unverified**; its evidence sources record title, URL, publisher, publication date when known, access time, and notes. Content review, confidence, and source verification are separate signals; an Approved review state does not establish that a claim has been externally verified. Some requested topics remain intentionally blank where a reliable, accessible source was not available.

Architecture Comparison reflects only current local architecture records and explicitly typed links. Optional bilingual comparison profiles can record engineering dimensions and explicitly mark them Available, Not Applicable, or Not Available. Available entries inherit the architecture record's review and source-verification metadata; missing dimensions remain Not Available and are not inferred. Profiles are generic reference descriptions, not production-vehicle configurations. No new technical claims or citations are seeded without verification.

New records start as Draft and Unverified. Users can move records through Draft, Pending Review, Approved, and Rejected. Agent-created records cannot be directly marked Approved. Only Approved entities are surfaced in the map and explorer. Review is a local workflow and does not provide multi-user attribution or approval controls. Generic legacy relationships remain labeled as semantically unspecified until edited; the application does not infer a precise relation type from an ID link.

## Roadmap

- Expand automated browser interaction and responsive-layout tests.
- Add architecture-level editing and richer entity history/restore.
- Improve graph layout and add guided multi-hop relationship path exploration.
- Add persistence adapters for a future REST API or database.

## Screenshots

Screenshots are not available yet. Capture the architecture map, Technology Explorer, and Data Management pages here when ready.
