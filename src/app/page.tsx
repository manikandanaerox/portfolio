import { ClientEffects } from "@/components/ClientEffects";
import { SceneLoader } from "@/components/SceneLoader";
import { Dock } from "@/components/Dock";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Anatomy } from "@/components/Anatomy";
import { Capabilities } from "@/components/Capabilities";
import { Projects } from "@/components/Projects";
import { Journey } from "@/components/Journey";
import { Toolchain } from "@/components/Toolchain";
import { Contact } from "@/components/Contact";

export default function Home() {
  return (
    <div className="grain relative">
      <ClientEffects />
      <SceneLoader />
      <Dock />
      <main className="relative z-10">
        <Hero />
        <About />
        <Anatomy />
        <Capabilities />
        <Projects />
        <Journey />
        <Toolchain />
        <Contact />
      </main>
    </div>
  );
}
