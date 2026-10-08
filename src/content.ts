import {
  siAnsys, siArduino, siAutodesk, siCplusplus, siDassaultsystemes, siEspressif, siFortran, siGit, siGnubash, siLinux,
  siNumpy, siNvidia, siPandas, siPython, siScipy,
} from "simple-icons";
import type { OrgKey } from "./components/OrgLogo";

/*
  All site copy, taken from Manikandan_Shanmugam_Resume_Aerospace_General.pdf
  and the LinkedIn profile export (public/manikandan.pdf).
*/

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

/** Hero launch sequence: captions keyed to scroll progress through the hero. */
export const launch = [
  { at: 0.0, label: "Artemis II on the pad" },
  { at: 0.12, label: "RS-25 ignition" },
  { at: 0.195, label: "Booster ignition, liftoff" },
  { at: 0.45, label: "Max Q" },
  { at: 0.77, label: "Booster separation" },
];

export const hero = {
  headlineStart: "Propulsion engineer.",
  headlineEmphasis: "Drone builder.",
  sub: "MSc Propulsion & Energetics, ISAE-ENSMA. Rocket and aircraft engines, heat transfer, CFD and drones. Internship from March 2027.",
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
    { year: "2024", logo: ["sae", "phoenix"], title: "SAE Autonomous Drone Development Challenge", detail: "Award winner, payload category, as founder and captain of Team Phoenix" },
    { year: "EU", logo: "dgac", title: "Certified Drone Pilot (DGAC)", detail: "EU Drone Pilot Certificate, A1/A3 Open Category" },
  ] satisfies { year: string; logo: OrgKey | OrgKey[]; title: string; detail: string }[],
};

/** Parts of the inspection quad (used by its 3D model). */
export type PartKey = "props" | "motors" | "frame" | "fc" | "battery" | "gps" | "gimbal";

/*
  The four chapters. Each is a pinned section: scrolling steps through `steps`
  while the matching 3D scene (three/acts/*) moves to that step's focus.
*/
export type Step = { title: string; body: string; meta: string; logo?: OrgKey | OrgKey[]; command?: string };
export type Chapter = { id: ChapterId; nav: string; title: string; lead: string; steps: Step[] };
export type ChapterId = "rocket" | "propulsion" | "uav";

export const chapters: Record<ChapterId, Chapter> = {
  rocket: {
    id: "rocket",
    nav: "Propulsion",
    title: "My propulsion work.",
    lead: "What I have studied and worked on in propulsion so far.",
    steps: [
      {
        title: "MSc in propulsion and energetics",
        body: "Second year of the MSc in Aeronautics and Space at ISAE-ENSMA, with coursework in propulsion systems, combustion, gas dynamics, heat transfer and numerical methods.",
        meta: "ISAE-ENSMA, 2025 - 2027",
      },
      {
        title: "Hydrogen/oxygen combustion study",
        body: "A course project in Python and Cantera on stoichiometric H₂/O₂ combustion at rocket conditions: adiabatic flame temperature, equilibrium and dissociation from 0.1 to 10⁴ MPa, cross-checked against an analytical estimate of 3,498 K.",
        meta: "Python, Cantera, 2025 - 2026",
      },
      {
        title: "Research internship in heat transfer",
        body: "Five months at Institut Pprime on two-phase loop thermosyphons: improving the test rig, high-speed flow visualisation and MATLAB analysis of heat-transfer coefficients. Co-authoring the resulting manuscript, now under internal review.",
        meta: "Institut Pprime, 2026",
        logo: "pprime",
      },
      {
        title: "Supersonic CFD",
        body: "STAR-CCM+ simulations of a Mach 4 double-wedge airfoil (Euler and Spalart-Allmaras, to separate wave and viscous drag), a Busemann biplane at incidence, and nozzle flows at pressure ratios of 8 and 12.",
        meta: "STAR-CCM+, Apr 2026",
      },
      {
        title: "Numerical and test tools",
        body: "An explicit finite-volume solver for transient conduction in a sphere, with its stability limit from von Neumann analysis and mesh-refinement checks, and a MATLAB and Fortran interface for multi-sensor thermal tests.",
        meta: "Fortran, MATLAB, 2025 - 2026",
      },
    ],
  },
  propulsion: {
    id: "propulsion",
    nav: "ATREX study",
    title: "My ATREX engine study.",
    lead: "A complete engine analysis I did at ISAE-ENSMA: a hydrogen air-turbo-ramjet, from the intake to the flight envelope.",
    steps: [
      {
        title: "The brief",
        body: "Take a precooled air-turbo-ramjet burning liquid hydrogen, fly it at 12,000 m and Mach 3, and find out what it can do. I worked the whole cycle, station by station.",
        meta: "ISAE-ENSMA, Apr 2026",
      },
      {
        title: "Intake and precooler",
        body: "I worked out the ram compression and the hydrogen precooling that lets the fan take in cold, dense air.",
        meta: "Intake, precooler",
      },
      {
        title: "Fan and tip turbine",
        body: "I matched the fan to its compressor map and balanced it against the hydrogen-driven tip turbine that powers it.",
        meta: "Compressor map, turbine",
      },
      {
        title: "Combustor and heat exchanger",
        body: "I closed the energy balance through the combustion chamber and the heat exchanger that warms the hydrogen before it drives the turbine.",
        meta: "Combustion chamber, heat exchanger",
      },
      {
        title: "Nozzle and performance",
        body: "At the nozzle exit I computed the thrust, specific impulse and efficiencies of the full cycle.",
        meta: "Thrust, Isp, efficiencies",
      },
      {
        title: "My answer: Mach 5 to 6 at 30 km",
        body: "With thrust, drag and temperature limits I built the flight domain: four of these engines can take a vehicle to 30 km and Mach 5 to 6.",
        meta: "Flight-domain analysis",
      },
    ],
  },
  uav: {
    id: "uav",
    nav: "UAV",
    title: "Four years in the air.",
    lead: "Autonomous aircraft I have designed, built, programmed and flown.",
    steps: [
      {
        title: "Top 6 at the Dassault UAV Challenge",
        body: "Our modular 4+1 VTOL with a 2 m span made the top 6 finalists and won the Jury's Favourite Award. I owned propulsion design, CFD optimisation and sensor integration on a SpeedyBee F405.",
        meta: "ENSMAERO, 2025 - 2026",
        logo: "dassault",
      },
      {
        title: "Team Phoenix, SAE 2024",
        body: "I founded and captained a 20-member team, award winner in the payload category of the SAE Autonomous Drone Development Challenge: CAD, FEA, 3D printing and flight test.",
        meta: "Loyola-ICAM, 2022 - 2025",
        logo: ["sae", "phoenix"],
      },
      {
        title: "A flight controller that tunes itself",
        body: "A custom quadcopter flight controller with automatic PID tuning of its control loops, for plug-and-fly setup.",
        meta: "Personal project",
      },
      {
        title: "Flying by plain language",
        body: "A Python server that turns LLM tool calls into MAVLink commands for an ArduPilot drone: telemetry, arming, take-off, waypoints, landing and return-to-launch, tested in SITL.",
        meta: "Python, pymavlink, ArduPilot SITL",
        command: "take off to 10 m, then fly the survey",
      },
      {
        title: "VTOL R&D and 100+ flight hours",
        body: "At Team Reconnaissance: autonomous VTOLs on Holybro with a Jetson Nano, flight-test campaigns and Python data pipelines. EU certified pilot, A1/A3.",
        meta: "Team Reconnaissance, 2024 - 2025",
        logo: "recon",
      },
    ],
  },
};

export const journey: { when: string; title: string; where: string; body: string; logo?: OrgKey | OrgKey[] }[] = [
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
    logo: ["sae", "phoenix"],
    title: "Founder & Team Captain, Team Phoenix",
    where: "Loyola-ICAM College of Engineering and Technology, SAE Autonomous Drone Design Challenge",
    body: "Built and led a 20-member UAV team through CAD, FEA, 3D printing and flight test of autonomous drones. Also captained Team Turbonites LICET at SAE ADDC 2024-2025, managing timeline, resources and competition prep, and flew as team drone pilot: pre-flight checks, mission planning, mapping and 100+ flight hours.",
  },
];

export const leadership = [
  { when: "2023 - 2025", title: "Joint Secretary, ISHRAE Chennai Chapter", where: "500+ member student body; HVAC, energy and aerospace workshops and industry talks" },
  { when: "2023 - 2025", title: "3D Printing Student Lead", where: "LICET Fablab; fabrication workshops and maker events" },
];

export const otherProjects = [
  { when: "Apr 2026", title: "Supersonic CFD", where: "Mach 4 double-wedge airfoil, Busemann biplane, nozzle flows (STAR-CCM+)" },
  { when: "Dec 2025", title: "Transient conduction solver", where: "Finite-volume sphere with angle-dependent convection, von Neumann stability" },
  { when: "2025 - 2026", title: "Automated thermal test interface", where: "MATLAB and Fortran GUI, multi-sensor acquisition and live plots" },
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
