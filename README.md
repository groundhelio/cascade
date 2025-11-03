
# **The Cascading Effect**

### *Mapping the Human Impact of Democratic Unrest*

---

## **Overview**

**The Cascading Effect** is an interactive visualization project that models how democratic unrest — such as *maandamano* (mass protests) — ripples through a nation’s systems and people’s lives.

It begins with a simple spark — protests in the streets — and visualizes how that spark triggers chain reactions across governance, economy, infrastructure, community stability, family life, and child wellbeing.

The project’s purpose is to **make complexity visible** — showing how macro-level political events translate into micro-level human experiences.

---

## **Core Concept**

The system represents the nation as a **living causal graph**:

* **Root:** the triggering event (e.g., “Riots for Democracy”).
* **Branches:** systemic domains — Politics, Economy, Infrastructure, Social Cohesion, Family Stability, etc.
* **Leaves:** tangible human outcomes — hunger, school closure, trauma, migration.
* **Feedback loops:** micro effects that re-ignite macro tensions (e.g., youth unemployment → renewed protests).

Every node is *alive*: it stores data, memory logs, and AI-generated insights about its evolving state.

---

## **New Feature — Cascading Severity Radar**

To quantify disruption, we’ve added a **Severity Radar View**, built with **amCharts JS v5**.

### What It Shows

A dynamic radar (spider) chart that measures how deeply unrest affects nine key domains:

1. Governance Stability
2. Economic Function
3. Infrastructure & Mobility
4. Public Safety & Security
5. Social Cohesion
6. Family Stability
7. Child & Youth Wellbeing
8. Health & Humanitarian Access
9. Information & Expression Freedom

Each axis runs from *0 = Stable* to *10 = Critical Collapse*.
Multiple layers can compare **Institutional Stress** vs. **Human Impact**, or show evolution over time.

### Why It Matters

The radar condenses thousands of cascading signals into a single visual pulse — making it easy to see where intervention is most urgent and where resilience is holding.

---

## **Visualization Layer**

All project visualizations now use **amCharts JS**, chosen for its clean modern design, responsive layout, and animation quality.
This upgrade ensures consistency across:

* The main **Cascading Graph**
* The **Severity Radar View**
* **Temporal Evolution Charts** and **Resilience Dashboards**

---

## **Narrative Example**

> When maandamano erupts, government curfews disrupt transport; markets close; wages stop.
> Families ration food; children miss school; fear spreads.
> The graph shows the *structure* of that chain.
> The Severity Radar quantifies *how deep* the shock has gone — from policy to playground.

Together, they tell the story of **how democracy’s tremors reach the smallest routines of daily life**.

---

## **Intended Use**

* **Researchers & Analysts:** study systemic fragility and interdependencies.
* **Policy Makers & NGOs:** identify pressure points for targeted response.
* **Educators:** teach complex systems and resilience through visual exploration.
* **Civic Storytellers:** communicate human impact beyond statistics.

---

## **Quick Start**

1. Install dependencies

   ```bash
   npm install
   ```

2. Run the development server

   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000`
   Explore the interactive cascade and Severity Radar.

*(Requires Node ≥ 18 and React ≥ 18)*

OOH: Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key


---

## **Future Directions**

* Integrate live or simulated data for time-series severity updates.
* Add per-node “memory logs” that store evolving AI insights.
* Support regional comparisons (e.g., national vs. local radar layers).
* Build a resilience index tracking recovery trajectories.

---

## **License**

Open for academic, humanitarian, and civic-innovation use under a permissive open-source license (e.g., MIT).

---

## **Acknowledgment**

Inspired by real-world maandamano movements and the need to humanize data around democracy, governance, and resilience.
**The Cascading Effect** is both a data platform and a reminder:

> Every protest, every policy, every shock begins as a sound in the streets —
> but its echo reaches the dinner table, the classroom, and the child’s imagination.

~ The entire thing is vibe-coded `:)`
