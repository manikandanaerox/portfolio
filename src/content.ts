import {
  siArduino, siAutodesk, siBlender, siCplusplus, siDocker, siEspressif, siGit, siLinux,
  siNvidia, siOpencv, siPython, siPytorch, siRaspberrypi, siRos, siStmicroelectronics,
} from "simple-icons";

/*
  All editable copy lives here. Everything marked PLACEHOLDER should be
  replaced with real details before the site goes live.
*/

export const profile = {
  name: "Manikandan", // PLACEHOLDER
  role: "UAV Systems Engineer",
  // PLACEHOLDER photo (Unsplash). Drop a real portrait at /public/photo.jpg and set this to "/photo.jpg".
  photo: "https://images.unsplash.com/photo-1506947411487-a56738267384?auto=format&fit=crop&w=760&h=950&q=80&crop=faces",
  email: "hello@example.com", // PLACEHOLDER
  socials: [
    { label: "GitHub", href: "https://github.com/" }, // PLACEHOLDER
    { label: "LinkedIn", href: "https://www.linkedin.com/" }, // PLACEHOLDER
    { label: "YouTube", href: "https://www.youtube.com/" }, // PLACEHOLDER
  ],
};

export const hero = {
  headlineStart: "Drones that fly",
  headlineEmphasis: "themselves.",
  sub: "I design the flight control, perception and airframes that let multirotors inspect and map without a pilot.",
};

export const about = {
  headline: "Engineer first. Pilot second.",
  body: [
    "I started by crashing a quad I soldered together from spare parts. Every rebuild taught me something about vibration, power and control loops, and I never stopped rebuilding.",
    "Today I work across the whole stack: CAD and composites for the airframe, firmware and PID tuning for the flight controller, and ROS 2 software that lets the aircraft see and decide.",
  ],
  facts: [
    { label: "Focus", value: "Autonomous multirotors" },
    { label: "Core stack", value: "PX4, ROS 2, C++, Python" },
    { label: "Status", value: "Open to UAV and robotics roles" },
  ],
};

export type PartKey = "props" | "motors" | "frame" | "fc" | "battery" | "gps" | "gimbal";

export const anatomy: { key: PartKey; name: string; note: string }[] = [
  { key: "props", name: "Propellers", note: "Large, slow-turning blades for efficient hover and a quieter acoustic footprint." },
  { key: "motors", name: "Motor pods", note: "Enclosed pods keep grit and rain off the windings. Soft mounts keep vibration out of the IMU." },
  { key: "frame", name: "Airframe", note: "Carbon tubes on folding hinges: stiff in flight, packed into a case in under a minute." },
  { key: "fc", name: "Flight controller", note: "PX4 on an isolated board, with filters and PID gains tuned from flight logs." },
  { key: "battery", name: "Dual batteries", note: "Two hot-swap packs, so the avionics stay powered through a battery change." },
  { key: "gps", name: "Dual GNSS", note: "Two antennas give a true heading without trusting the compass near steel structures." },
  { key: "gimbal", name: "Payload gimbal", note: "Stabilised ball camera feeding both the operator link and onboard perception." },
];

const unsplash = (id: string, w: number, h: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const capabilities = [
  { image: unsplash("1507582020474-9a35b7d455d9", 1100, 1300), title: "Flight control", body: "PX4, ArduPilot and Betaflight. Filter design, PID tuning and failsafe logic validated from flight logs." },
  { image: unsplash("1473968512647-3e447244af8f", 1100, 1300), title: "Autonomy", body: "Mission planning, obstacle avoidance and offboard control over MAVLink." },
  { image: unsplash("1504890001746-a9a68eda46e2", 1100, 1300), title: "Perception", body: "Visual-inertial odometry, SLAM and object detection on edge GPUs." },
  { image: unsplash("1579829366248-204fe8413f31", 1100, 1300), title: "Airframe design", body: "Frames in Fusion 360 and SolidWorks, cut from carbon and printed in nylon." },
  { image: unsplash("1521405924368-64c5b84bec60", 1100, 1300), title: "Embedded firmware", body: "Drivers and sensor fusion on STM32 and ESP32." },
  { image: unsplash("1524143986875-3b098d78b363", 1100, 1300), title: "Simulation", body: "Gazebo and SITL pipelines, so every change flies in software before hardware." },
];

// PLACEHOLDER projects. Images are Unsplash stand-ins; swap for real build photos.
export const projects = [
  {
    title: "Autonomous bridge inspection quad",
    summary: "A GPS-denied inspection platform that holds position under bridge decks using visual-inertial odometry.",
    tags: ["PX4", "ROS 2", "VIO", "Jetson"],
    image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1400&h=900&q=80",
    href: "#",
  },
  {
    title: "VTOL mapping aircraft",
    summary: "A fixed-wing VTOL hybrid for long-range photogrammetry, with automated transition and survey missions.",
    tags: ["ArduPilot", "Photogrammetry", "Composites"],
    image: "https://images.unsplash.com/photo-1508444845599-5c89863b1c44?auto=format&fit=crop&w=1400&h=900&q=80",
    href: "#",
  },
  {
    title: "Five-inch FPV freestyle build",
    summary: "A custom carbon frame and Betaflight tune built for clean, propwash-free footage.",
    tags: ["Betaflight", "CAD", "Blackbox"],
    image: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1400&h=900&q=80",
    href: "#",
  },
  {
    title: "Multi-drone formation simulator",
    summary: "A Gazebo environment that flies a swarm in formation and tests collision avoidance before field trials.",
    tags: ["Gazebo", "SITL", "Python"],
    image: "https://images.unsplash.com/photo-1495764506633-93d4dfed7c6b?auto=format&fit=crop&w=1400&h=900&q=80",
    href: "#",
  },
];

// PLACEHOLDER timeline.
export const journey = [
  { when: "2024 - Now", title: "UAV Systems Engineer", where: "Aerial inspection startup", body: "Own the autonomy stack from sensor drivers to mission logic on a fleet of inspection drones." },
  { when: "2023", title: "Research Intern", where: "University aerial robotics lab", body: "Built a VIO pipeline and flight-tested it indoors without GPS." },
  { when: "2022", title: "Team Lead, student UAV team", where: "National drone design competition", body: "Led airframe and avionics for an autonomous payload-drop mission." },
  { when: "2020", title: "First build", where: "A 250 mm quad from spare parts", body: "Learned soldering, ESC calibration and patience. Mostly patience." },
];

// Logos from the simple-icons package (bundled locally, no CDN).
export const toolchain = [
  { icon: siRos, name: "ROS 2" },
  { icon: siCplusplus, name: "C++" },
  { icon: siPython, name: "Python" },
  { icon: siOpencv, name: "OpenCV" },
  { icon: siPytorch, name: "PyTorch" },
  { icon: siNvidia, name: "Jetson" },
  { icon: siRaspberrypi, name: "Raspberry Pi" },
  { icon: siArduino, name: "Arduino" },
  { icon: siEspressif, name: "ESP32" },
  { icon: siStmicroelectronics, name: "STM32" },
  { icon: siAutodesk, name: "Fusion 360" },
  { icon: siLinux, name: "Linux" },
  { icon: siDocker, name: "Docker" },
  { icon: siBlender, name: "Blender" },
  { icon: siGit, name: "Git" },
];

export const contact = {
  headline: "Let's build something that flies.",
  sub: "Hiring for a UAV role, or have an aircraft that needs to fly smarter? Send a note.",
};
