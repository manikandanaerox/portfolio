import {
  siAnsys, siArduino, siAutodesk, siCplusplus, siDassaultsystemes, siEspressif, siFortran, siGit, siGnubash, siLinux,
  siNumpy, siNvidia, siPandas, siPython, siScipy,
} from "simple-icons";
import type { OrgKey } from "./components/OrgLogo";

/*
  All site copy, taken from Manikandan_Shanmugam_Resume_Aerospace_General.pdf
  and the LinkedIn profile export (public/manikandan.pdf).
  Only the portrait is still a placeholder.
*/

const unsplash = (id: string, w: number, h: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const profile = {
  name: "Manikandan Shanmugam",
  firstName: "Manikandan",
  role: "Aerospace Engineering Student, ISAE-ENSMA",
  photo: "/photo.jpg",
  // Top-aligned crop keeps the face centred in the 4:5 frame and trims the bottom edge.
  photoPosition: "50% 0%",
  email: "manikandan.mechx@gmail.com",
  location: "Poitiers, France",
  cv: "/Manikandan_Shanmugam_Resume_Aerospace_General.pdf",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/manikandanaerox" },
    { label: "GitHub", href: "https://github.com/manikandanaerox" },
  ],
};

export const hero = {
  headlineStart: "Propulsion engineer.",
  headlineEmphasis: "Drone builder.",
  sub: "MSc Propulsion & Energetics at ISAE-ENSMA. Seeking a six-month internship from March 2027.",
};

export const about = {
  headline: "From heat transfer to flight test.",
  body: [
    "I'm a second-year MSc student in Aeronautics and Space at ISAE-ENSMA, majoring in propulsion and energetics, with a background in mechanical engineering.",
    "My work spans experimental two-phase heat-transfer research at Institut Pprime, propulsion and CFD projects, and four years of designing, building and flight-testing autonomous UAVs.",
  ],
  // Real figures from the CV.
  stats: [
    { value: "Top 6", label: "finalist team at the Dassault UAV Challenge 2026, where our VTOL won the Jury's Favourite Award" },
    { value: "100+", label: "flight hours logged as a drone pilot" },
    { value: "20", label: "members in the UAV team I founded and captained" },
  ],
  awards: [
    { year: "2026", logo: "dassault", title: "Dassault UAV Challenge", detail: "Top 6 finalist and Prix Coup de cœur du jury (Jury's Favourite Award), ENSMAERO team" },
    { year: "2024", logo: "sae", title: "SAE Autonomous Drone Development Challenge", detail: "Award winner, payload category, as founder and captain of Team Phoenix" },
    { year: "EU", logo: "dgac", title: "Certified Drone Pilot (DGAC)", detail: "EU Drone Pilot Certificate, A1/A3 Open Category" },
  ] satisfies { year: string; logo: OrgKey; title: string; detail: string }[],
};

export type PartKey = "props" | "motors" | "frame" | "fc" | "battery" | "gps" | "gimbal";

/* Each drone system maps to a real piece of work from the CV. */
export const anatomy: { key: PartKey; name: string; note: string; where: string; dassault?: boolean }[] = [
  { key: "props", dassault: true, name: "Propulsion design", note: "Designed the propulsion system and ran the CFD optimisation for our award-winning VTOL.", where: "ENSMAERO, Dassault UAV Challenge 2026" },
  { key: "motors", name: "Energetics", note: "Cycle analysis of a precooled ATREX engine and H₂/O₂ combustion modelling in Cantera.", where: "ISAE-ENSMA, 2025 - 2026" },
  { key: "frame", name: "Structures", note: "CAD in SolidWorks and CATIA, FEA, and 3D-printed parts for lighter airframes.", where: "Team Phoenix, 2022 - 2025" },
  { key: "fc", name: "Flight control", note: "A custom flight controller with automatic PID tuning, and an MCP server that flies ArduPilot from plain language.", where: "Personal projects" },
  { key: "battery", name: "Thermal management", note: "Two-phase loop thermosyphons for passive cooling, studied experimentally with high-speed visualisation.", where: "Institut Pprime, 2026" },
  { key: "gps", name: "Navigation & missions", note: "Mission planning, mapping and 100+ flight hours, validated first in Gazebo and ArduPilot SITL.", where: "Four years of flight testing" },
  { key: "gimbal", name: "Onboard compute", note: "Jetson Nano companion computers and Python pipelines for flight-test data.", where: "Team Reconnaissance, 2024 - 2025" },
];

export const capabilities = [
  { image: "/images/turbofan-cf6.jpg", title: "Propulsion & energetics", body: "Thermodynamic cycle analysis, combustion thermochemistry with Cantera, gas dynamics and engine performance." },
  { image: "/images/wind-tunnel.jpg", title: "CFD & aerodynamics", body: "Supersonic and nozzle flows in STAR-CCM+ and ANSYS Fluent, plus finite-volume solvers written from scratch." },
  { image: "/images/thermal-imaging.jpg", title: "Heat transfer & experiments", body: "Two-phase thermal systems, instrumentation, high-speed flow visualisation and MATLAB post-processing." },
  { image: "/images/vtol-swift.jpg", title: "UAV design & flight test", body: "Fixed-wing, VTOL and multirotor platforms, from CAD and FEA to 3D printing and 100+ flight hours." },
  { image: unsplash("1518770660439-4636190af475", 1100, 1300), title: "Flight control & embedded", body: "ArduPilot, MAVLink, Pixhawk and SpeedyBee, Jetson Nano, ESP32; UART, I2C, SPI, CAN and PWM." },
  { image: unsplash("1635070041078-e363dbe005cb", 1100, 1300), title: "Software & numerical methods", body: "Python (NumPy, SciPy, Pandas), MATLAB, C/C++ and Fortran, with Git, Linux and bash." },
];

export type Project = { title: string; summary: string; tags: string[]; image: string; kind: string; when: string; href?: string; dassault?: boolean };

export const projects: Project[] = [
  {
    kind: "Competition",
    when: "2025 - 2026",
    dassault: true,
    title: "Autonomous VTOL 4+1, Dassault UAV Challenge",
    summary: "A modular 2 m wingspan VTOL that made the top 6 finalists and won the Jury's Favourite Award. I designed the propulsion system, ran the CFD optimisation and integrated the flight controller.",
    tags: ["VTOL", "Propulsion", "CFD", "SpeedyBee F405", "Python", "C++"],
    image: "/images/vtol-deltaquad.jpg",
  },
  {
    kind: "Academic",
    when: "Apr 2026",
    title: "ATREX precooled air-breathing engine",
    summary: "Full cycle analysis of a liquid-hydrogen ATREX engine at 12,000 m and Mach 3, then a flight domain showing a four-engine vehicle can reach 30 km at Mach 5 to 6.",
    tags: ["Cycle analysis", "Hydrogen", "Hypersonics"],
    image: "/images/sabre-engine.jpg",
  },
  {
    kind: "Academic",
    when: "Apr 2026",
    title: "Supersonic CFD: diamond airfoil, Busemann biplane, nozzles",
    summary: "Mach 4 double-wedge airfoil with Euler and Spalart-Allmaras models to separate wave and viscous drag, plus a Busemann biplane and nozzle flows at pressure ratios of 8 and 12.",
    tags: ["STAR-CCM+", "Supersonic", "Turbulence"],
    image: "/images/schlieren-t38.jpg",
  },
  {
    kind: "Ongoing",
    when: "Now",
    title: "Pixhawk MCP server: natural-language drone control",
    summary: "A Python server that turns LLM tool calls into MAVLink commands for an ArduPilot drone: telemetry, arming, take-off, GPS waypoints, landing and return-to-launch, tested in SITL.",
    tags: ["Python", "pymavlink", "ArduPilot SITL"],
    image: unsplash("1581092918056-0c4c3acd3789", 1400, 900),
  },
  {
    kind: "Team",
    when: "2022 - 2025",
    title: "Team Phoenix, autonomous drones",
    summary: "Founded and captained a 20-member UAV team that won an award at the SAE Autonomous Drone Development Challenge 2024, taking drones from CAD and FEA to flight test.",
    tags: ["Leadership", "SolidWorks", "FEA", "Gazebo"],
    image: "/images/drone-team.jpg",
  },
  {
    kind: "Academic",
    when: "2025 - 2026",
    title: "H₂/O₂ combustion thermochemistry",
    summary: "Stoichiometric hydrogen-oxygen combustion for rocket conditions: adiabatic flame temperature, equilibrium and dissociation from 0.1 to 10⁴ MPa, checked against an analytical 3,498 K.",
    tags: ["Python", "Cantera", "Rocket propulsion"],
    image: "/images/rs25-hotfire.jpg",
  },
];

export const journey: { when: string; title: string; where: string; body: string; logo?: OrgKey }[] = [
  {
    when: "Mar - Jul 2026",
    logo: "pprime",
    title: "Research Intern, Two-Phase Heat Transfer",
    where: "Institut Pprime (CNRS, Université de Poitiers, ISAE-ENSMA), Chasseneuil-du-Poitou",
    body: "Experimental research on two-phase loop thermosyphons for passive thermal management: improved the test rig for accuracy and repeatability, ran high-speed flow visualisation with temperature, pressure and mass-flow measurements, and analysed thermal resistance and heat-transfer/flow instabilities. Co-authoring a manuscript for an international peer-reviewed journal, under internal review.",
  },
  {
    when: "Oct 2025 - Now",
    logo: "dassault",
    title: "Propulsion & UAV Systems Engineer",
    where: "ENSMAERO student team, Dassault UAV Challenge",
    body: "A modular 4+1 VTOL with a 2 m wingspan over a one-year design-build-test cycle: propulsion design and CFD optimisation, sensor integration on a SpeedyBee F405 and control algorithms in Python and C++, with Dassault Aviation mentors. Top 6 finalist and Jury's Favourite Award in 2026.",
  },
  {
    when: "Jul 2024 - Mar 2025",
    logo: "recon",
    title: "R&D Engineering Intern, VTOL Design",
    where: "Team Reconnaissance, Hindustan Technology Business Incubator",
    body: "Autonomous VTOL systems on Holybro with a Jetson Nano companion computer, flight-test campaigns and Python pipelines for flight data.",
  },
  {
    when: "Nov 2022 - Aug 2025",
    logo: "sae",
    title: "Founder & Team Captain, Team Phoenix",
    where: "Loyola-ICAM College of Engineering and Technology, SAE Autonomous Drone Design Challenge",
    body: "Built and led a 20-member UAV team through CAD, FEA, 3D printing and flight test of autonomous drones. Also captained Team Turbonites LICET at SAE ADDC 2024-2025, managing timeline, resources and competition prep, and flew as team drone pilot: pre-flight checks, mission planning, mapping and 100+ flight hours.",
  },
];

export const leadership = [
  { when: "2023 - 2025", title: "Joint Secretary, ISHRAE Chennai Chapter", where: "500+ member student body; HVAC, energy and aerospace workshops and industry talks" },
  { when: "2023 - 2025", title: "3D Printing Student Lead", where: "LICET Fablab; fabrication workshops and maker events" },
];

export const earlier = [
  { when: "2024", title: "Automation & Systems Integration Intern", where: "Loyola-ICAM" },
  { when: "2023", title: "Wind Turbine Technician Intern", where: "Litewind Ltd" },
  { when: "2023", title: "CMM Programmer Intern", where: "Unique Measurement Service" },
];

export const education = [
  { when: "2025 - 2027", title: "MSc Aeronautics and Space, Propulsion & Energetics", where: "ISAE-ENSMA, Poitiers" },
  { when: "2021 - 2025", title: "Bachelor of Engineering, Mechanical Engineering", where: "Loyola-ICAM, Chennai" },
];

export const languages = "English (fluent), French (A2), Tamil (native)";

// Logos from the simple-icons package where one exists; the rest render as names.
export const toolchain: { name: string; icon?: { path: string } }[] = [
  { icon: siPython, name: "Python" },
  { icon: siNumpy, name: "NumPy" },
  { icon: siScipy, name: "SciPy" },
  { icon: siPandas, name: "Pandas" },
  { name: "MATLAB" },
  { icon: siCplusplus, name: "C/C++" },
  { icon: siFortran, name: "Fortran" },
  { name: "STAR-CCM+" },
  { icon: siAnsys, name: "ANSYS Fluent" },
  { name: "Cantera" },
  { icon: siDassaultsystemes, name: "CATIA / SolidWorks" },
  { icon: siAutodesk, name: "Fusion 360" },
  { name: "Pixhawk / ArduPilot" },
  { name: "MAVLink" },
  { name: "QGroundControl" },
  { name: "Mission Planner" },
  { icon: siNvidia, name: "Jetson Nano" },
  { icon: siEspressif, name: "ESP32" },
  { icon: siArduino, name: "ATmega328" },
  { icon: siGit, name: "Git" },
  { icon: siLinux, name: "Linux" },
  { icon: siGnubash, name: "bash" },
];

export const contact = {
  headline: "Hiring for March 2027?",
  sub: "I'm looking for a six-month internship in propulsion, energetics, thermal engineering, CFD or autonomous aerial systems.",
};

// Image credits (Wikimedia Commons). CC BY-SA images require attribution; shown in the footer.
export const imageCredits = [
  { file: "vtol-deltaquad.jpg", artist: "Sander Smeets", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:DeltaQuad_VTOL_surveillance_UAV.jpg" },
  { file: "sabre-engine.jpg", artist: "Science Museum London / Science and Society Picture Library", license: "CC BY-SA 2.0", source: "https://commons.wikimedia.org/wiki/File:SABRE_engine_designed_for_Skylon_spaceplane,_1990s._(9660572897).jpg" },
  { file: "schlieren-t38.jpg", artist: "Leonard Weinstein / NASA", license: "Public domain", source: "https://commons.wikimedia.org/wiki/File:Schlieren_photograph_of_T-38_shock_waves.jpg" },
  { file: "rs25-hotfire.jpg", artist: "NASA & Aerojet Rocketdyne", license: "Public domain", source: "https://commons.wikimedia.org/wiki/File:RS-25_Engine_Hot_Fire_Test.jpg" },
  { file: "drone-team.jpg", artist: "U.S. Air Force 501CSW by Senior Airman Adam Enbal", license: "Public domain", source: "https://commons.wikimedia.org/wiki/File:Team_USA_competes_at_international_drone_competition_(9954560).jpg" },
  { file: "turbofan-cf6.jpg", artist: "Unknown", license: "Public domain", source: "https://commons.wikimedia.org/wiki/File:CF-6_TURBOFAN_ENGINE_-_NARA_-_17475341.jpg" },
  { file: "thermal-imaging.jpg", artist: "Mister rf", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:RAKON_STP2734B_LF_OCXO_Thermal_Imaging.jpg" },
  { file: "vtol-swift.jpg", artist: "Ka04iso10", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Swift020_flying_in_Kobe_Merikenpark.jpg" },
  { file: "wind-tunnel.jpg", artist: "NASA Ames Research Center / NASA", license: "Public domain", source: "https://commons.wikimedia.org/wiki/File:SCAT-16;_Variable_Sweep_Model_in_40x80_Wind_Tunnel_at_NASA_Ames_(AC-31300).jpg" },
];
