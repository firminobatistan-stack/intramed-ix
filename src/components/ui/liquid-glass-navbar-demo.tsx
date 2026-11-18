import { LiquidNavbar, NimbusIcons } from "@/components/ui/liquid-glass-navbar";

export default function Demo() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: "0 16px",
        background: "#F4F6FB",
      }}
    >
      <LiquidNavbar
        tone="brand"
        defaultActive={0}
        sound={false}
        items={[
          { label: "Início", icon: NimbusIcons.home, fx: "glow" },
          { label: "Jogos", icon: NimbusIcons.globe, fx: "spin" },
          { label: "Artilharia", icon: NimbusIcons.drop, fx: "drop" },
          { label: "Chaves", icon: NimbusIcons.plane, fx: "plane" },
          { label: "Perfil", icon: NimbusIcons.user, fx: "wave" },
        ]}
      />
    </div>
  );
}
