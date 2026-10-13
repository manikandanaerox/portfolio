/*
  Stock drone photos for the drone chapter's roulette (components/UavRoulette).
  All from Wikimedia Commons; CC BY / CC BY-SA require the credit shown with each.
*/
export type StockPhoto = { src: string; caption: string; author: string; license: string; source: string };

export const stock: StockPhoto[] = [
  { src: "/stock/vtol-alps.webp", caption: "VTOL mapping drone", author: "Adyasha Dash", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:WingtraOne_in_use.jpg" },
  { src: "/stock/quad-sky.webp", caption: "Quadcopter in flight", author: "Project Kei", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Quadcopter_Drone_in_flight.jpg" },
  { src: "/stock/inspection-pad.webp", caption: "Inspection drone on its pad", author: "Iswoar", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:DJI_Matrice_300RTK_Feuerwehr_Drohne_01.jpg" },
  { src: "/stock/fpv-quad.webp", caption: "FPV quadcopter", author: "Commanderbryce", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Racing_Drone.jpg" },
  { src: "/stock/vtol-crew.webp", caption: "VTOL field operations", author: "Emily Loosli", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:WingtraOne_and_operators.jpg" },
  { src: "/stock/hexa-test.webp", caption: "Multirotor test flight", author: "Richard Unten", license: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Drone_First_Test_Flight.jpg" },
  { src: "/stock/camera-quad.webp", caption: "Camera quadcopter", author: "Josh Sorenson", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Quadcopter_camera_drone_in_flight.jpg" },
  { src: "/stock/fpv-race.webp", caption: "FPV drone racing", author: "Qwentii", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Course_de_drones_FPV_.jpg" },
];
