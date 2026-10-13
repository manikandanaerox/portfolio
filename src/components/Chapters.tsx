import { Chapter } from "./Chapter";
import { UavRoulette } from "./UavRoulette";

export const RocketEngine = () => <Chapter id="rocket" />;
export const AircraftEngine = () => <Chapter id="propulsion" />;
export const Uav = () => <Chapter id="uav" aside={<UavRoulette />} />;
