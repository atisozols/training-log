export function Mark({ px, maskable = false }: { px: number; maskable?: boolean }) {
  const inner = maskable ? px * 0.62 : px * 0.8;
  return (
    <div
      style={{
        width: px,
        height: px,
        background: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: inner * 0.28,
          background: "#EDE65B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: inner * 0.5,
            fontWeight: 800,
            color: "#000000",
            letterSpacing: -inner * 0.03,
            display: "flex",
          }}
        >
          TL
        </div>
        <div
          style={{
            position: "absolute",
            right: inner * 0.12,
            top: inner * 0.12,
            width: inner * 0.14,
            height: inner * 0.14,
            borderRadius: 999,
            background: "#E57FB8",
            display: "flex",
          }}
        />
      </div>
    </div>
  );
}
